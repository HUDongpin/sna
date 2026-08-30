import { spawn } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { withLunaInterpretation } from "@/lib/open-sna-ai";
import { isOpenSnaResult, matchesOpenSnaRequest, type OpenSnaResult } from "@/lib/open-sna";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_MULTIPART_BYTES = MAX_UPLOAD_BYTES + 256 * 1024;
const MAX_RESULT_BYTES = 2 * 1024 * 1024;
const MAX_R_STDERR_BYTES = 64 * 1024;
const ANALYSIS_TIMEOUT_MS = 255_000;
const ALLOWED_BOOTSTRAPS = new Set(["100", "500", "1000"]);
const REQUIRED_NCT_PERMUTATIONS = "1000";
const XLSX_ZIP_SIGNATURE = "PK";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
let activeWorkerJobs = 0;

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
type RemoteFailureCode = RFailureCode | "WORKER_BUSY" | "R_ANALYSIS_TIMEOUT";

class RemoteEngineError extends Error {
  constructor(
    readonly code: RemoteFailureCode | "R_ENGINE_UNAVAILABLE" | "R_ENGINE_CONFIGURATION_INVALID",
    readonly status: number,
  ) {
    super(code);
  }
}

function parseRFailureCode(stderr: string): RFailureCode {
  const match = stderr.match(/^OPEN_SNA_ERROR_CODE=(R_RUNTIME_NOT_READY|WORKBOOK_INVALID|R_ANALYSIS_FAILED)$/m);
  return match?.[1] as RFailureCode | undefined || "R_ANALYSIS_FAILED";
}

function workerModeEnabled() {
  return process.env.OPEN_SNA_R_WORKER_MODE === "1";
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
  if (workerToken.length < 32 || process.env.OPEN_SNA_R_API_URL) {
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

function safeRemoteFailure(payload: unknown, status: number): RemoteEngineError {
  const code = payload && typeof payload === "object" && "code" in payload
    ? (payload as { code?: unknown }).code
    : undefined;
  if (code === "WORKBOOK_INVALID" && status === 422) return new RemoteEngineError(code, 422);
  if (code === "R_RUNTIME_NOT_READY" && status === 503) return new RemoteEngineError(code, 503);
  if (code === "R_ANALYSIS_FAILED" && status >= 500) return new RemoteEngineError(code, 502);
  if (code === "WORKER_BUSY" && status === 429) return new RemoteEngineError(code, 429);
  if (code === "R_ANALYSIS_TIMEOUT" && status === 504) return new RemoteEngineError(code, 504);
  return new RemoteEngineError("R_ENGINE_UNAVAILABLE", 502);
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
    return noStoreJson(
      {
        error: "The workbook could not be analyzed. Confirm that it has one worksheet, 6 to 40 consecutively numbered Likert item columns in 2 to 8 construct-prefix communities, and a valid two-level Gender or metadata column with at least 20 analyzed rows per group after listwise deletion.",
        code: error.code,
      },
      error.status,
    );
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
    let stderrBytes = 0;
    const stderrChunks: Buffer[] = [];
    child.stderr.on("data", (chunk: Buffer) => {
      const remainingBytes = MAX_R_STDERR_BYTES - stderrBytes;
      if (remainingBytes > 0) stderrChunks.push(chunk.subarray(0, remainingBytes));
      stderrBytes += chunk.byteLength;
      if (stderrBytes > MAX_R_STDERR_BYTES) child.kill("SIGTERM");
    });

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5_000).unref();
    }, ANALYSIS_TIMEOUT_MS);
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
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
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

async function forwardToConfiguredEngine(bytes: Uint8Array, bootstraps: string, permutations: string) {
  const engineUrl = process.env.OPEN_SNA_R_API_URL;
  if (!engineUrl) return null;
  const engineToken = process.env.OPEN_SNA_R_API_TOKEN || "";
  let parsedEngineUrl: URL;
  try {
    parsedEngineUrl = new URL(engineUrl);
  } catch {
    throw new RemoteEngineError("R_ENGINE_CONFIGURATION_INVALID", 503);
  }
  const loopbackHost = ["localhost", "127.0.0.1", "[::1]"].includes(parsedEngineUrl.hostname);
  if (
    engineToken.length < 32 ||
    parsedEngineUrl.username ||
    parsedEngineUrl.password ||
    (parsedEngineUrl.protocol !== "https:" && !loopbackHost)
  ) {
    throw new RemoteEngineError("R_ENGINE_CONFIGURATION_INVALID", 503);
  }
  try {
    const outgoing = new FormData();
    outgoing.set("workbook", new File([bytes], "input.xlsx", { type: XLSX_MIME }));
    outgoing.set("bootstraps", bootstraps);
    outgoing.set("permutations", permutations);

    const headers = new Headers({ Accept: "application/json" });
    headers.set("Authorization", `Bearer ${engineToken}`);
    const response = await fetch(engineUrl, {
      method: "POST",
      body: outgoing,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS),
    });
    const declaredLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RESULT_BYTES) {
      throw new Error("REMOTE_ENGINE_RESULT_TOO_LARGE");
    }
    const responseText = await response.text();
    const responseBytes = Buffer.byteLength(responseText, "utf8");
    if (responseBytes === 0 || responseBytes > MAX_RESULT_BYTES) {
      throw new Error("REMOTE_ENGINE_RESULT_TOO_LARGE");
    }
    const payload: unknown = JSON.parse(responseText);
    if (!response.ok) throw safeRemoteFailure(payload, response.status);
    const normalizedResult = normalizeRemoteResult(payload);
    if (!normalizedResult || !matchesOpenSnaRequest(normalizedResult, bootstraps, permutations)) {
      throw new Error("REMOTE_ENGINE_CONTRACT_FAILED");
    }
    return normalizedResult;
  } catch (error) {
    if (error instanceof RemoteEngineError) throw error;
    if (error instanceof DOMException && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new RemoteEngineError("R_ANALYSIS_TIMEOUT", 504);
    }
    throw new RemoteEngineError("R_ENGINE_UNAVAILABLE", 502);
  }
}

export async function POST(request: Request) {
  if (process.env.OPEN_SNA_R_DISABLED === "1") {
    return noStoreJson(
      {
        error: "Public workbook analysis is temporarily disabled. You can still inspect the aggregate reference result.",
        code: "R_ENGINE_DISABLED",
      },
      503,
    );
  }
  let jobDirectory: string | null = null;
  let claimedWorkerSlot = false;
  try {
    const authenticationFailure = workerAuthenticationFailure(request);
    if (authenticationFailure) return authenticationFailure;

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
      return noStoreJson({ error: "Open SNA expects a multipart XLSX upload." }, 415);
    }
    const declaredRequestBytes = Number(request.headers.get("content-length"));
    if (Number.isFinite(declaredRequestBytes) && declaredRequestBytes > MAX_MULTIPART_BYTES) {
      return noStoreJson({ error: "The multipart upload exceeds the 5 MiB workbook limit." }, 413);
    }
    const formData = await request.formData();
    const workbook = formData.get("workbook");
    if (!(workbook instanceof File)) {
      return noStoreJson({ error: "Select an XLSX workbook before running the analysis." }, 400);
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

    const inputFingerprint = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
    const configuredEngineResult = await forwardToConfiguredEngine(bytes, bootstraps, permutations);
    if (configuredEngineResult) {
      const result: OpenSnaResult = {
        ...configuredEngineResult,
        inputFingerprint,
        source: {
          ...configuredEngineResult.source,
          fileName: "Uploaded workbook",
          sheet: "Uploaded worksheet",
        },
      };
      const lunaOutcome = await withLunaInterpretation(result);
      return noStoreJson(lunaOutcome.result);
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
    const temporaryRoot = path.resolve(
      /* turbopackIgnore: true */
      workerMode
        ? process.env.OPEN_SNA_R_WORKER_TMP_ROOT || "/tmp/open-sna-jobs"
        : process.env.OPEN_SNA_TMP_ROOT || path.join(process.cwd(), "tmp", "open-sna-jobs")
    );
    const validWorkerRoot = workerMode &&
      (temporaryRoot.startsWith("/tmp/open-sna-") || temporaryRoot.startsWith("/var/tmp/open-sna-"));
    if (!validWorkerRoot && !temporaryRoot.startsWith("/Volumes/Starship/")) {
      return noStoreJson(
        {
          error: workerMode
            ? "Open SNA worker jobs require an isolated /tmp/open-sna-* or /var/tmp/open-sna-* directory."
            : "Local Open SNA jobs are restricted to a temporary directory on /Volumes/Starship/.",
          code: workerMode ? "WORKER_CONFIGURATION_INVALID" : undefined,
        },
        503
      );
    }
    await mkdir(temporaryRoot, { recursive: true, mode: 0o700 });
    jobDirectory = await mkdtemp(path.join(temporaryRoot, "job-"));
    const inputPath = path.join(jobDirectory, "input.xlsx");
    const outputPath = path.join(jobDirectory, "result.json");
    await writeFile(inputPath, bytes, { mode: 0o600 });

    const processResult = await runRAnalysis({ inputPath, outputPath, bootstraps, permutations });
    if (processResult.timedOut) {
      return noStoreJson(
        {
          error: "The R analysis exceeded the service time limit. Try again with fewer bootstrap replicates or a smaller workbook.",
          code: "R_ANALYSIS_TIMEOUT",
        },
        504,
      );
    }
    if (processResult.exitCode !== 0) {
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
        return noStoreJson(
          {
            error: "The R analysis engine failed before producing a valid result. Check the server runtime and try again.",
            code: failureCode,
          },
          500
        );
      }
      return noStoreJson(
        {
          error: "The workbook could not be analyzed. Confirm that it has one worksheet, 6 to 40 consecutively numbered Likert item columns in 2 to 8 construct-prefix communities, and a valid two-level Gender or metadata column with at least 20 analyzed rows per group after listwise deletion.",
          code: failureCode,
        },
        422
      );
    }

    const resultText = await readBoundedResult(outputPath);
    const parsed: unknown = JSON.parse(resultText);
    if (!isOpenSnaResult(parsed) || !matchesOpenSnaRequest(parsed, bootstraps, permutations)) {
      return noStoreJson({ error: "The R engine returned an invalid result contract." }, 502);
    }
    const result: OpenSnaResult = {
      ...parsed,
      inputFingerprint,
      source: { ...parsed.source, fileName: "Uploaded workbook", sheet: "Uploaded worksheet" },
    };
    const lunaOutcome = await withLunaInterpretation(result);
    return noStoreJson(lunaOutcome.result);
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
    if (claimedWorkerSlot) activeWorkerJobs -= 1;
  }
}
