import { spawn } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import { withLunaInterpretation } from "@/lib/open-sna-ai";
import { isOpenSnaResult, matchesOpenSnaRequest, type OpenSnaResult } from "@/lib/open-sna";
import { isValidOpenSnaServiceToken, readOpenSnaEngineConfigurationStatus } from "@/lib/open-sna-config";
import { safeOpenSnaAnalysisDetail } from "@/lib/open-sna-errors";
import {
  createOpenSnaJobId,
  isOpenSnaJobPending,
  jobPendingFrom,
  OPEN_SNA_ASYNC_DELIVERY,
  OPEN_SNA_JOB_QUERY,
  parseOpenSnaJobId,
  type OpenSnaJobId,
  type OpenSnaJobQueued,
  type OpenSnaJobRunning,
} from "@/lib/open-sna-job";
import {
  claimNextQueuedJob,
  createQueuedJob,
  jobInputPath,
  jobResultPath,
  markJobFailed,
  markJobRunning,
  markJobSucceeded,
  readJob,
  sweepExpiredJobs,
} from "@/lib/open-sna-job-store";
import { precheckOpenSnaWorkbook } from "@/lib/open-sna-workbook-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_UPLOAD_BYTES + 256 * 1024;
const MAX_RESULT_BYTES = 2 * 1024 * 1024;
const MAX_R_STDERR_BYTES = 64 * 1024;
const ANALYSIS_TIMEOUT_MS = 255_000;
const GATEWAY_JOB_TIMEOUT_MS = 15_000;
const ASYNC_ANALYSIS_TIMEOUT_MS = 1_200_000;
const ALLOWED_BOOTSTRAPS = new Set(["100", "500", "1000"]);
const REQUIRED_NCT_PERMUTATIONS = "1000";
const XLSX_ZIP_SIGNATURE = "PK";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
let activeWorkerJobs = 0;
let asyncPumpRunning = false;

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : null;
}

function hasXlsxSignature(bytes: Uint8Array) {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

async function readBoundedResult(outputPath: string) {
  const metadata = await stat(outputPath);
  if (metadata.size === 0 || metadata.size > MAX_RESULT_BYTES) {
    throw new Error("INVALID_RESULT_SIZE");
  }
  return readFile(outputPath, "utf8");
}

type RProcessResult = { exitCode: number; timedOut: boolean; stderr: string };
type RFailureCode = "R_RUNTIME_NOT_READY" | "WORKBOOK_INVALID" | "R_ANALYSIS_FAILED";
type RemoteFailureCode = RFailureCode | "WORKER_BUSY" | "R_ANALYSIS_TIMEOUT" | "JOB_NOT_FOUND";

class RemoteEngineError extends Error {
  constructor(
    readonly code: RemoteFailureCode | "R_ENGINE_UNAVAILABLE" | "R_ENGINE_CONFIGURATION_INVALID" | "R_ENGINE_CONTRACT_FAILED",
    readonly status: number,
    readonly detail: string | null = null,
  ) {
    super(code);
  }
}

function asyncAnalysisTimeoutMs() {
  const override = Number(process.env.OPEN_SNA_ASYNC_TIMEOUT_MS);
  return Number.isFinite(override) && override > 0 ? override : ASYNC_ANALYSIS_TIMEOUT_MS;
}

function parseRFailureCode(stderr: string): RFailureCode {
  const match = stderr.match(/^OPEN_SNA_ERROR_CODE=(R_RUNTIME_NOT_READY|WORKBOOK_INVALID|R_ANALYSIS_FAILED)$/m);
  return match?.[1] as RFailureCode | undefined || "R_ANALYSIS_FAILED";
}

const R_FAILURE_MESSAGE_PREFIX = "Open SNA analysis failed:";

function summarizeRFailureDetail(stderr: string) {
  const line = stderr.split(/\r?\n/).find((entry) => entry.includes(R_FAILURE_MESSAGE_PREFIX));
  if (!line) return null;
  const detail = line.slice(line.indexOf(R_FAILURE_MESSAGE_PREFIX) + R_FAILURE_MESSAGE_PREFIX.length).trim();
  const redacted = detail
    .replace(/(?:\/(?:tmp|var\/tmp|app|opt|Volumes|home|Users)\/)[^\s'"]+/g, "[path]")
    .replace(/[A-Za-z]:\\[^\s'"]+/g, "[path]")
    .replace(/\s+/g, " ")
    .trim();
  return redacted.slice(0, 180) || null;
}

function logRProcessFailure(processResult: RProcessResult) {
  console.error(JSON.stringify({
    event: "open_sna_r_failed",
    failureCode: parseRFailureCode(processResult.stderr),
    exitCode: processResult.exitCode,
    timedOut: processResult.timedOut,
    stderrEmpty: processResult.stderr.trim().length === 0,
    detail: summarizeRFailureDetail(processResult.stderr),
  }));
}

function workerModeEnabled() {
  return process.env.OPEN_SNA_R_WORKER_MODE === "1";
}

function isTestSystemTemporaryRoot(temporaryRoot: string) {
  if (process.env.NODE_ENV !== "test") return false;
  const systemTemporaryRoot = path.resolve(tmpdir());
  const relative = path.relative(systemTemporaryRoot, temporaryRoot);
  return !relative.startsWith("..") && !path.isAbsolute(relative);
}

function safeTokenMatches(actualHeader: string | null, expectedToken: string) {
  const prefix = "Bearer ";
  if (!actualHeader?.startsWith(prefix)) return false;
  const actualToken = actualHeader.slice(prefix.length);
  const actualBytes = Buffer.from(actualToken, "utf8");
  const expectedBytes = Buffer.from(expectedToken, "utf8");
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function workerAuthenticationFailure(request: Request) {
  if (!workerModeEnabled()) return null;
  const workerToken = process.env.OPEN_SNA_R_WORKER_TOKEN || "";
  if (!isValidOpenSnaServiceToken(workerToken) || process.env.OPEN_SNA_R_API_URL) {
    return noStoreJson(
      {
        error: "The Open SNA R worker configuration is incomplete.",
        code: "WORKER_CONFIGURATION_INVALID",
      },
      503,
    );
  }
  if (!safeTokenMatches(request.headers.get("authorization"), workerToken)) {
    return noStoreJson(
      { error: "The Open SNA R worker requires valid service authentication.", code: "WORKER_UNAUTHORIZED" },
      401,
    );
  }
  return null;
}

function readRemoteErrorRecord(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { code: undefined, detail: null as string | null };
  }
  const record = payload as { code?: unknown; detail?: unknown };
  return { code: record.code, detail: safeOpenSnaAnalysisDetail(record.detail) };
}

function analysisFailedResponse(status: number, detail: string | null = null) {
  return noStoreJson(
    {
      error: "The R analysis engine failed before producing a valid result. Check the server runtime and try again.",
      code: "R_ANALYSIS_FAILED",
      ...(detail ? { detail } : {}),
    },
    status,
  );
}

function safeRemoteFailure(payload: unknown, status: number): RemoteEngineError {
  const { code, detail } = readRemoteErrorRecord(payload);
  if (code === "WORKBOOK_INVALID" && status === 422) return new RemoteEngineError(code, 422);
  if (code === "R_RUNTIME_NOT_READY" && status === 503) return new RemoteEngineError(code, 503);
  if (code === "R_ANALYSIS_FAILED" && status >= 500) return new RemoteEngineError(code, 502, detail);
  if (code === "WORKER_BUSY" && status === 429) return new RemoteEngineError(code, 429);
  if (code === "R_ANALYSIS_TIMEOUT" && status === 504) return new RemoteEngineError(code, 504);
  if (code === "JOB_NOT_FOUND" && status === 404) return new RemoteEngineError(code, 404);
  return new RemoteEngineError("R_ENGINE_UNAVAILABLE", 502);
}

function workbookInvalidResponse() {
  return noStoreJson(
    {
      error: "The workbook could not be analyzed. Confirm that it has one worksheet, 6 to 40 consecutively numbered Likert item columns in 2 to 8 construct-prefix communities, and a valid two-level Gender or metadata column with at least 20 analyzed rows per group after listwise deletion.",
      code: "WORKBOOK_INVALID",
    },
    422,
  );
}

function engineDisabledResponse() {
  return noStoreJson(
    {
      error: "Public workbook analysis is temporarily disabled. You can still inspect the aggregate reference result.",
      code: "R_ENGINE_DISABLED",
    },
    503,
  );
}

function jobNotFoundResponse() {
  return noStoreJson(
    { error: "That Open SNA analysis job was not found.", code: "JOB_NOT_FOUND" },
    404,
  );
}

function resolveTemporaryRoot(workerMode: boolean) {
  return path.resolve(
    /* turbopackIgnore: true */
    workerMode
      ? process.env.OPEN_SNA_R_WORKER_TMP_ROOT || "/tmp/open-sna-jobs"
      : process.env.OPEN_SNA_TMP_ROOT || path.join(process.cwd(), "tmp", "open-sna-jobs"),
  );
}

function temporaryRootRejection(workerMode: boolean, temporaryRoot: string) {
  const validWorkerRoot = workerMode &&
    (temporaryRoot.startsWith("/tmp/open-sna-") || temporaryRoot.startsWith("/var/tmp/open-sna-"));
  if (validWorkerRoot || temporaryRoot.startsWith("/Volumes/Starship/") || isTestSystemTemporaryRoot(temporaryRoot)) {
    return null;
  }
  return noStoreJson(
    {
      error: workerMode
        ? "Open SNA worker jobs require an isolated /tmp/open-sna-* or /var/tmp/open-sna-* directory."
        : "Local Open SNA jobs are restricted to a temporary directory on /Volumes/Starship/.",
      code: workerMode ? "WORKER_CONFIGURATION_INVALID" : undefined,
    },
    503,
  );
}

function remoteFailureResponse(error: RemoteEngineError) {
  if (error.code === "R_ENGINE_CONFIGURATION_INVALID") {
    return noStoreJson(
      {
        error: "The production R analysis service configuration is incomplete.",
        code: error.code,
      },
      error.status,
    );
  }
  if (error.code === "WORKBOOK_INVALID") {
    return workbookInvalidResponse();
  }
  if (error.code === "R_RUNTIME_NOT_READY") {
    return noStoreJson(
      { error: "The production R analysis runtime is not ready. Try again later.", code: error.code },
      error.status,
    );
  }
  if (error.code === "WORKER_BUSY") {
    return noStoreJson(
      { error: "The production R analysis service is busy. Wait for the current analysis to finish and try again.", code: error.code },
      error.status,
    );
  }
  if (error.code === "R_ANALYSIS_TIMEOUT") {
    return noStoreJson(
      { error: "The R analysis exceeded the service time limit. Try again with fewer bootstrap replicates or a smaller workbook.", code: error.code },
      error.status,
    );
  }
  if (error.code === "JOB_NOT_FOUND") {
    return jobNotFoundResponse();
  }
  if (error.code === "R_ANALYSIS_FAILED") {
    return analysisFailedResponse(error.status, error.detail);
  }
  if (error.code === "R_ENGINE_CONTRACT_FAILED") {
    return noStoreJson(
      {
        error: "The production R analysis service returned a result that could not be used. Try again later.",
        code: error.code,
      },
      error.status,
    );
  }
  return noStoreJson(
    { error: "The production R analysis service is temporarily unavailable. Try again later.", code: error.code },
    error.status,
  );
}

function runRAnalysis(options: {
  inputPath: string;
  outputPath: string;
  bootstraps: string;
  permutations: string;
  timeoutMs?: number;
}): Promise<RProcessResult> {
  const rscript = process.env.OPEN_SNA_RSCRIPT_BIN || "Rscript";
  const scriptPath = path.join(process.cwd(), "analysis", "open-sna", "analyze.R");
  const arguments_ = [
    scriptPath,
    "--input",
    options.inputPath,
    "--output",
    options.outputPath,
    "--bootstraps",
    options.bootstraps,
    "--permutations",
    options.permutations,
    "--seed",
    "2026",
    "--data-source",
    "uploaded-workbook",
  ];
  const genderOneLabel = process.env.OPEN_SNA_GENDER_1_LABEL?.trim();
  const genderTwoLabel = process.env.OPEN_SNA_GENDER_2_LABEL?.trim();
  if (genderOneLabel || genderTwoLabel) {
    const safeLabel = /^[A-Za-z][A-Za-z0-9 _-]{0,39}$/;
    if (
      !genderOneLabel ||
      !genderTwoLabel ||
      genderOneLabel === genderTwoLabel ||
      !safeLabel.test(genderOneLabel) ||
      !safeLabel.test(genderTwoLabel)
    ) {
      throw new Error("INVALID_GENDER_MAPPING_CONFIGURATION");
    }
    arguments_.push(
      "--gender-1-label",
      genderOneLabel,
      "--gender-2-label",
      genderTwoLabel,
    );
  }

  return new Promise((resolve, reject) => {
    const child = spawn(/* turbopackIgnore: true */ rscript, arguments_, {
      cwd: process.cwd(),
      shell: false,
      stdio: ["ignore", "ignore", "pipe"],
      env: {
        ...process.env,
        LANG: "C.UTF-8",
        LC_ALL: "C.UTF-8",
        R_LIBS_USER:
          process.env.OPEN_SNA_R_LIBS_USER ||
          process.env.R_LIBS_USER ||
          path.join(process.cwd(), "tmp", "r-library"),
      },
    });
    let stderrTail = Buffer.alloc(0);
    child.stderr.on("data", (chunk: Buffer) => {
      stderrTail = Buffer.concat([stderrTail, chunk]);
      if (stderrTail.byteLength > MAX_R_STDERR_BYTES) {
        stderrTail = Buffer.from(stderrTail.subarray(stderrTail.byteLength - MAX_R_STDERR_BYTES));
      }
    });

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5_000).unref();
    }, options.timeoutMs ?? ANALYSIS_TIMEOUT_MS);
    timeout.unref();

    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      resolve({
        exitCode: code ?? 1,
        timedOut,
        stderr: stderrTail.toString("utf8"),
      });
    });
  });
}

function normalizeRemoteResult(payload: unknown): OpenSnaResult | null {
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return null;
  const version = (payload as { schemaVersion?: unknown }).schemaVersion;
  if (version === "1.1") return isOpenSnaResult(payload) ? payload : null;
  if (version !== "1.0") return null;

  const candidate = { ...payload, schemaVersion: "1.1" };
  return isOpenSnaResult(candidate) ? candidate : null;
}

function copyWorkbookBytes(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

function createRemoteAnalyzeFormData(
  bytes: Uint8Array,
  bootstraps: string,
  permutations: string,
  delivery?: string,
) {
  // Undici/Vercel can serialize `new File([uint8Array])` as an empty multipart
  // part. Copy the bytes first, then append a Blob with an explicit filename.
  const outgoing = new FormData();
  outgoing.append(
    "workbook",
    new Blob([copyWorkbookBytes(bytes)], { type: XLSX_MIME }),
    "input.xlsx",
  );
  outgoing.append("bootstraps", bootstraps);
  outgoing.append("permutations", permutations);
  if (delivery) outgoing.append("delivery", delivery);
  return outgoing;
}

function logRemoteEngineFailure(reason: string) {
  console.error(JSON.stringify({
    event: "open_sna_remote_engine_failed",
    reason,
  }));
}

async function readRemoteJson(response: Response) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_RESULT_BYTES) {
    throw new Error("REMOTE_ENGINE_RESULT_TOO_LARGE");
  }
  const responseText = await response.text();
  const responseBytes = Buffer.byteLength(responseText, "utf8");
  if (responseBytes === 0 || responseBytes > MAX_RESULT_BYTES) {
    throw new Error("REMOTE_ENGINE_RESULT_TOO_LARGE");
  }
  try {
    return JSON.parse(responseText.replace(/^\uFEFF/, "")) as unknown;
  } catch {
    throw new Error(response.ok ? "REMOTE_ENGINE_CONTRACT_FAILED" : "REMOTE_ENGINE_JSON_INVALID");
  }
}

function throwRemoteTransportError(error: unknown): never {
  if (error instanceof RemoteEngineError) throw error;
  if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
    throw new RemoteEngineError("R_ANALYSIS_TIMEOUT", 504);
  }
  const reason = error instanceof Error ? error.message : "REMOTE_ENGINE_UNAVAILABLE";
  const knownReasons = new Set([
    "REMOTE_ENGINE_CONTRACT_FAILED",
    "REMOTE_ENGINE_RESULT_TOO_LARGE",
    "REMOTE_ENGINE_JSON_INVALID",
  ]);
  logRemoteEngineFailure(knownReasons.has(reason) ? reason : "REMOTE_ENGINE_UNAVAILABLE");
  if (reason === "REMOTE_ENGINE_CONTRACT_FAILED") {
    throw new RemoteEngineError("R_ENGINE_CONTRACT_FAILED", 502);
  }
  throw new RemoteEngineError("R_ENGINE_UNAVAILABLE", 502);
}

function authorizedEngineHeaders() {
  const engineConfiguration = readOpenSnaEngineConfigurationStatus();
  if (!engineConfiguration.configured) {
    if (engineConfiguration.reason === "missing") return null;
    throw new RemoteEngineError("R_ENGINE_CONFIGURATION_INVALID", 503);
  }
  const headers = new Headers({ Accept: "application/json" });
  headers.set("Authorization", `Bearer ${engineConfiguration.apiToken}`);
  return { apiUrl: engineConfiguration.apiUrl, headers };
}

async function forwardToConfiguredEngine(bytes: Uint8Array, bootstraps: string, permutations: string) {
  const engine = authorizedEngineHeaders();
  if (!engine) return null;
  try {
    const response = await fetch(engine.apiUrl, {
      method: "POST",
      body: createRemoteAnalyzeFormData(bytes, bootstraps, permutations),
      headers: engine.headers,
      cache: "no-store",
      signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS),
    });
    const payload = await readRemoteJson(response);
    if (!response.ok) throw safeRemoteFailure(payload, response.status);
    const normalizedResult = normalizeRemoteResult(payload);
    if (!normalizedResult || !matchesOpenSnaRequest(normalizedResult, bootstraps, permutations)) {
      throw new Error("REMOTE_ENGINE_CONTRACT_FAILED");
    }
    return normalizedResult;
  } catch (error) {
    throwRemoteTransportError(error);
  }
}

async function forwardAsyncEnqueue(bytes: Uint8Array, bootstraps: string, permutations: string) {
  const engine = authorizedEngineHeaders();
  if (!engine) return null;
  try {
    const response = await fetch(engine.apiUrl, {
      method: "POST",
      body: createRemoteAnalyzeFormData(bytes, bootstraps, permutations, OPEN_SNA_ASYNC_DELIVERY),
      headers: engine.headers,
      cache: "no-store",
      signal: AbortSignal.timeout(GATEWAY_JOB_TIMEOUT_MS),
    });
    const payload = await readRemoteJson(response);
    if (response.status !== 202 || !isOpenSnaJobPending(payload)) {
      if (!response.ok) throw safeRemoteFailure(payload, response.status);
      throw new Error("REMOTE_ENGINE_CONTRACT_FAILED");
    }
    return payload;
  } catch (error) {
    throwRemoteTransportError(error);
  }
}

async function forwardJobPoll(jobId: OpenSnaJobId) {
  const engine = authorizedEngineHeaders();
  if (!engine) return null;
  try {
    const url = new URL(engine.apiUrl);
    url.searchParams.set(OPEN_SNA_JOB_QUERY, jobId);
    const response = await fetch(url, {
      method: "GET",
      headers: engine.headers,
      cache: "no-store",
      signal: AbortSignal.timeout(GATEWAY_JOB_TIMEOUT_MS),
    });
    const payload = await readRemoteJson(response);
    if (response.status === 202) {
      if (!isOpenSnaJobPending(payload) || payload.jobId !== jobId) {
        throw new Error("REMOTE_ENGINE_CONTRACT_FAILED");
      }
      return { kind: "pending" as const, pending: payload };
    }
    if (!response.ok) throw safeRemoteFailure(payload, response.status);
    const normalizedResult = normalizeRemoteResult(payload);
    if (!normalizedResult) throw new Error("REMOTE_ENGINE_CONTRACT_FAILED");
    return { kind: "result" as const, result: normalizedResult };
  } catch (error) {
    throwRemoteTransportError(error);
  }
}

function publishedResult(result: OpenSnaResult, inputFingerprint: string): OpenSnaResult {
  return {
    ...result,
    inputFingerprint,
    source: {
      ...result.source,
      fileName: "Uploaded workbook",
      sheet: "Uploaded worksheet",
    },
  };
}

function startAsyncPump(temporaryRoot: string) {
  void pumpAsyncJobs(temporaryRoot);
}

async function pumpAsyncJobs(temporaryRoot: string) {
  if (asyncPumpRunning) return;
  asyncPumpRunning = true;
  try {
    while (true) {
      if (activeWorkerJobs >= 1) break;
      const queued = await claimNextQueuedJob(temporaryRoot);
      if (!queued) break;
      const workerMode = workerModeEnabled();
      if (workerMode) activeWorkerJobs += 1;
      try {
        await executeQueuedJob(temporaryRoot, queued);
      } finally {
        if (workerMode) activeWorkerJobs -= 1;
      }
    }
  } finally {
    asyncPumpRunning = false;
    if (activeWorkerJobs === 0) {
      const leftover = await claimNextQueuedJob(temporaryRoot);
      if (leftover) startAsyncPump(temporaryRoot);
    }
  }
}

function failureFromProcess(processResult: RProcessResult) {
  if (processResult.timedOut) {
    return {
      status: 504,
      error: {
        code: "R_ANALYSIS_TIMEOUT",
        status: 504,
        error: "The R analysis exceeded the service time limit. Try again with fewer bootstrap replicates or a smaller workbook.",
      },
    };
  }
  const failureCode = parseRFailureCode(processResult.stderr);
  if (failureCode === "R_RUNTIME_NOT_READY") {
    return {
      status: 503,
      error: {
        code: failureCode,
        status: 503,
        error: "The local R analysis runtime is not ready. Run the Open SNA R preflight and restore the pinned dependencies before trying again.",
      },
    };
  }
  if (failureCode === "R_ANALYSIS_FAILED") {
    const detail = safeOpenSnaAnalysisDetail(summarizeRFailureDetail(processResult.stderr));
    return {
      status: 500,
      error: {
        code: failureCode,
        status: 500,
        error: "The R analysis engine failed before producing a valid result. Check the server runtime and try again.",
        ...(detail ? { detail } : {}),
      },
    };
  }
  return {
    status: 422,
    error: {
      code: "WORKBOOK_INVALID",
      status: 422,
      error: "The workbook could not be analyzed. Confirm that it has one worksheet, 6 to 40 consecutively numbered Likert item columns in 2 to 8 construct-prefix communities, and a valid two-level Gender or metadata column with at least 20 analyzed rows per group after listwise deletion.",
    },
  };
}

async function executeQueuedJob(temporaryRoot: string, queued: OpenSnaJobQueued) {
  const running: OpenSnaJobRunning = await markJobRunning(temporaryRoot, queued, new Date().toISOString());
  const inputPath = jobInputPath(temporaryRoot, running.id);
  const outputPath = jobResultPath(temporaryRoot, running.id);
  try {
    const processResult = await runRAnalysis({
      inputPath,
      outputPath,
      bootstraps: running.bootstraps,
      permutations: running.permutations,
      timeoutMs: asyncAnalysisTimeoutMs(),
    });
    if (processResult.timedOut || processResult.exitCode !== 0) {
      logRProcessFailure(processResult);
      await markJobFailed(temporaryRoot, running, failureFromProcess(processResult).error, new Date().toISOString());
      return;
    }
    const resultText = await readBoundedResult(outputPath);
    const parsed: unknown = JSON.parse(resultText);
    if (!isOpenSnaResult(parsed) || !matchesOpenSnaRequest(parsed, running.bootstraps, running.permutations)) {
      await markJobFailed(
        temporaryRoot,
        running,
        {
          code: "R_ENGINE_CONTRACT_FAILED",
          status: 502,
          error: "The R engine returned an invalid result contract.",
        },
        new Date().toISOString(),
      );
      return;
    }
    const lunaOutcome = await withLunaInterpretation(publishedResult(parsed, running.inputFingerprint));
    const stored = await markJobSucceeded(temporaryRoot, running, lunaOutcome.result, new Date().toISOString());
    if (!stored) {
      await markJobFailed(
        temporaryRoot,
        running,
        {
          code: "R_ENGINE_CONTRACT_FAILED",
          status: 502,
          error: "The R engine returned an invalid result contract.",
        },
        new Date().toISOString(),
      );
    }
  } catch {
    await markJobFailed(
      temporaryRoot,
      running,
      {
        code: "R_ANALYSIS_FAILED",
        status: 500,
        error: "The R analysis engine failed before producing a valid result. Check the server runtime and try again.",
      },
      new Date().toISOString(),
    );
  }
}

async function enqueueLocalJob(
  bytes: Uint8Array,
  bootstraps: string,
  permutations: string,
  inputFingerprint: string,
) {
  const workerMode = workerModeEnabled();
  const temporaryRoot = resolveTemporaryRoot(workerMode);
  const rejectedRoot = temporaryRootRejection(workerMode, temporaryRoot);
  if (rejectedRoot) return rejectedRoot;
  await mkdir(temporaryRoot, { recursive: true, mode: 0o700 });
  await sweepExpiredJobs(temporaryRoot, Date.now());
  const job: OpenSnaJobQueued = {
    id: createOpenSnaJobId(),
    status: "queued",
    createdAt: new Date().toISOString(),
    bootstraps: bootstraps as OpenSnaJobQueued["bootstraps"],
    permutations: "1000",
    inputFingerprint,
  };
  await createQueuedJob(temporaryRoot, bytes, job);
  startAsyncPump(temporaryRoot);
  return noStoreJson(jobPendingFrom(job), 202);
}

function jobResponse(job: NonNullable<Awaited<ReturnType<typeof readJob>>>) {
  switch (job.status) {
    case "queued":
    case "running":
      return noStoreJson(jobPendingFrom(job), 202);
    case "succeeded":
      return noStoreJson(job.result);
    case "failed":
      return noStoreJson(
        {
          error: job.error.error,
          code: job.error.code,
          ...(job.error.detail ? { detail: job.error.detail } : {}),
        },
        job.error.status,
      );
    default: {
      const exhaustive: never = job;
      return exhaustive;
    }
  }
}

async function finalizePublishedResult(result: OpenSnaResult, inputFingerprint?: string) {
  const lunaOutcome = await withLunaInterpretation(
    inputFingerprint ? publishedResult(result, inputFingerprint) : result,
  );
  return noStoreJson(lunaOutcome.result);
}

export async function POST(request: Request) {
  let jobDirectory: string | null = null;
  let claimedWorkerSlot = false;
  try {
    const authenticationFailure = workerAuthenticationFailure(request);
    if (authenticationFailure) return authenticationFailure;
    const engineDisabled = process.env.OPEN_SNA_R_DISABLED === "1";

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
      return engineDisabled
        ? engineDisabledResponse()
        : noStoreJson({ error: "Open SNA expects a multipart XLSX upload." }, 415);
    }
    const declaredRequestBytes = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredRequestBytes) && declaredRequestBytes > MAX_MULTIPART_BYTES) {
      return noStoreJson({ error: "The multipart upload exceeds the 5 MiB workbook limit." }, 413);
    }
    const formData = await request.formData();
    const workbook = formData.get("workbook");
    if (!(workbook instanceof File)) {
      return engineDisabled
        ? engineDisabledResponse()
        : noStoreJson({ error: "Select an XLSX workbook before running the analysis." }, 400);
    }
    if (!workbook.name.toLowerCase().endsWith(".xlsx")) {
      return noStoreJson({ error: "Open SNA accepts .xlsx workbooks only." }, 415);
    }
    if (workbook.size === 0 || workbook.size > MAX_UPLOAD_BYTES) {
      return noStoreJson({ error: "The workbook must be between 1 byte and 5 MiB." }, 413);
    }
    if (workbook.type && workbook.type !== XLSX_MIME && workbook.type !== "application/octet-stream") {
      return noStoreJson({ error: "The uploaded file does not use an accepted XLSX media type." }, 415);
    }

    const bootstraps = formText(formData, "bootstraps") || "1000";
    const permutations = formText(formData, "permutations") || REQUIRED_NCT_PERMUTATIONS;
    if (!ALLOWED_BOOTSTRAPS.has(bootstraps) || permutations !== REQUIRED_NCT_PERMUTATIONS) {
      return noStoreJson({ error: "Use 100, 500, or 1000 bootstrap replicates and exactly 1000 NCT permutations." }, 400);
    }

    const bytes = new Uint8Array(await workbook.arrayBuffer());
    if (!hasXlsxSignature(bytes) || String.fromCharCode(bytes[0], bytes[1]) !== XLSX_ZIP_SIGNATURE) {
      return noStoreJson({ error: "The file extension is XLSX, but the file contents are not a valid XLSX container." }, 415);
    }
    if (!precheckOpenSnaWorkbook(bytes).valid) return workbookInvalidResponse();
    if (engineDisabled) return engineDisabledResponse();

    const inputFingerprint = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    const asyncDelivery = formText(formData, "delivery") === OPEN_SNA_ASYNC_DELIVERY;
    if (asyncDelivery) {
      const remoteAccepted = await forwardAsyncEnqueue(bytes, bootstraps, permutations);
      if (remoteAccepted) return noStoreJson(remoteAccepted, 202);
      if (process.env.VERCEL) {
        return noStoreJson(
          {
            error: "The production R analysis service is not configured. You can still inspect the aggregate reference analysis.",
            code: "R_ENGINE_NOT_CONFIGURED",
          },
          503,
        );
      }
      return enqueueLocalJob(bytes, bootstraps, permutations, inputFingerprint);
    }

    const configuredEngineResult = await forwardToConfiguredEngine(bytes, bootstraps, permutations);
    if (configuredEngineResult) {
      return finalizePublishedResult(configuredEngineResult, inputFingerprint);
    }

    if (process.env.VERCEL) {
      return noStoreJson(
        {
          error: "The production R analysis service is not configured. You can still inspect the aggregate reference analysis.",
          code: "R_ENGINE_NOT_CONFIGURED",
        },
        503
      );
    }

    const workerMode = workerModeEnabled();
    if (workerMode && activeWorkerJobs >= 1) {
      return noStoreJson(
        {
          error: "The Open SNA R worker is already processing an analysis.",
          code: "WORKER_BUSY",
        },
        429,
      );
    }
    if (workerMode) {
      activeWorkerJobs += 1;
      claimedWorkerSlot = true;
    }
    const temporaryRoot = resolveTemporaryRoot(workerMode);
    const rejectedRoot = temporaryRootRejection(workerMode, temporaryRoot);
    if (rejectedRoot) return rejectedRoot;
    await mkdir(temporaryRoot, { recursive: true, mode: 0o700 });
    jobDirectory = await mkdtemp(path.join(temporaryRoot, "job-"));
    const inputPath = path.join(jobDirectory, "input.xlsx");
    const outputPath = path.join(jobDirectory, "result.json");
    await writeFile(inputPath, bytes, { mode: 0o600 });

    const processResult = await runRAnalysis({ inputPath, outputPath, bootstraps, permutations });
    if (processResult.timedOut) {
      logRProcessFailure(processResult);
      return noStoreJson(
        {
          error: "The R analysis exceeded the service time limit. Try again with fewer bootstrap replicates or a smaller workbook.",
          code: "R_ANALYSIS_TIMEOUT",
        },
        504,
      );
    }
    if (processResult.exitCode !== 0) {
      logRProcessFailure(processResult);
      const failureCode = parseRFailureCode(processResult.stderr);
      if (failureCode === "R_RUNTIME_NOT_READY") {
        return noStoreJson(
          {
            error: "The local R analysis runtime is not ready. Run the Open SNA R preflight and restore the pinned dependencies before trying again.",
            code: failureCode,
          },
          503
        );
      }
      if (failureCode === "R_ANALYSIS_FAILED") {
        return analysisFailedResponse(
          500,
          safeOpenSnaAnalysisDetail(summarizeRFailureDetail(processResult.stderr)),
        );
      }
      return workbookInvalidResponse();
    }

    const resultText = await readBoundedResult(outputPath);
    const parsed: unknown = JSON.parse(resultText);
    if (!isOpenSnaResult(parsed) || !matchesOpenSnaRequest(parsed, bootstraps, permutations)) {
      return noStoreJson({ error: "The R engine returned an invalid result contract." }, 502);
    }
    return finalizePublishedResult(parsed, inputFingerprint);
  } catch (error) {
    if (error instanceof RemoteEngineError) return remoteFailureResponse(error);
    return noStoreJson({ error: "Open SNA could not start this analysis. Try again or inspect the reference results." }, 500);
  } finally {
    if (jobDirectory) {
      try {
        await rm(jobDirectory, { recursive: true, force: true });
      } catch {
        // The response must remain fail-safe even if temporary cleanup reports an error.
      }
    }
    if (claimedWorkerSlot) {
      activeWorkerJobs -= 1;
      startAsyncPump(resolveTemporaryRoot(true));
    }
  }
}

export async function GET(request: Request) {
  try {
    const authenticationFailure = workerAuthenticationFailure(request);
    if (authenticationFailure) return authenticationFailure;
    if (process.env.OPEN_SNA_R_DISABLED === "1") return engineDisabledResponse();

    const jobId = parseOpenSnaJobId(new URL(request.url).searchParams.get(OPEN_SNA_JOB_QUERY));
    if (!jobId) return jobNotFoundResponse();

    const remotePoll = await forwardJobPoll(jobId);
    if (remotePoll) {
      if (remotePoll.kind === "pending") return noStoreJson(remotePoll.pending, 202);
      return finalizePublishedResult(remotePoll.result, remotePoll.result.inputFingerprint);
    }

    if (process.env.VERCEL) {
      return noStoreJson(
        {
          error: "The production R analysis service is not configured. You can still inspect the aggregate reference analysis.",
          code: "R_ENGINE_NOT_CONFIGURED",
        },
        503,
      );
    }

    const workerMode = workerModeEnabled();
    const temporaryRoot = resolveTemporaryRoot(workerMode);
    const rejectedRoot = temporaryRootRejection(workerMode, temporaryRoot);
    if (rejectedRoot) return rejectedRoot;
    await sweepExpiredJobs(temporaryRoot, Date.now());
    startAsyncPump(temporaryRoot);
    const job = await readJob(temporaryRoot, jobId);
    if (!job) return jobNotFoundResponse();
    return jobResponse(job);
  } catch (error) {
    if (error instanceof RemoteEngineError) return remoteFailureResponse(error);
    return noStoreJson({ error: "Open SNA could not start this analysis. Try again or inspect the reference results." }, 500);
  }
}
