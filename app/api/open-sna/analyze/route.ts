import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
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

function parseRFailureCode(stderr: string): RFailureCode {
  const match = stderr.match(/^OPEN_SNA_ERROR_CODE=(R_RUNTIME_NOT_READY|WORKBOOK_INVALID|R_ANALYSIS_FAILED)$/m);
  return match?.[1] as RFailureCode | undefined || "R_ANALYSIS_FAILED";
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

async function forwardToConfiguredEngine(bytes: Uint8Array, bootstraps: string, permutations: string) {
  const engineUrl = process.env.OPEN_SNA_R_API_URL;
  if (!engineUrl) return null;
  const outgoing = new FormData();
  outgoing.set("workbook", new File([bytes], "input.xlsx", { type: XLSX_MIME }));
  outgoing.set("bootstraps", bootstraps);
  outgoing.set("permutations", permutations);

  const headers = new Headers({ Accept: "application/json" });
  if (process.env.OPEN_SNA_R_API_TOKEN) {
    headers.set("Authorization", `Bearer ${process.env.OPEN_SNA_R_API_TOKEN}`);
  }
  const response = await fetch(engineUrl, {
    method: "POST",
    body: outgoing,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(ANALYSIS_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("REMOTE_ENGINE_FAILED");
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
  if (!isOpenSnaResult(payload) || !matchesOpenSnaRequest(payload, bootstraps, permutations)) {
    throw new Error("REMOTE_ENGINE_CONTRACT_FAILED");
  }
  return payload;
}

export async function POST(request: Request) {
  let jobDirectory: string | null = null;
  try {
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

    const temporaryRoot = path.resolve(
      /* turbopackIgnore: true */
      process.env.OPEN_SNA_TMP_ROOT || path.join(process.cwd(), "tmp", "open-sna-jobs")
    );
    if (!temporaryRoot.startsWith("/Volumes/Starship/")) {
      return noStoreJson(
        { error: "Local Open SNA jobs are restricted to a temporary directory on /Volumes/Starship/." },
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
      return noStoreJson({ error: "The R analysis exceeded the local five-minute execution limit." }, 504);
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
          error: "The workbook could not be analyzed. Confirm that it has one worksheet, 6 to 40 consecutively numbered Likert item columns in 2 to 8 construct-prefix communities, and a valid two-level Gender or metadata column.",
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
  } catch {
    return noStoreJson({ error: "Open SNA could not start this analysis. Try again or inspect the reference results." }, 500);
  } finally {
    if (jobDirectory) {
      try {
        await rm(jobDirectory, { recursive: true, force: true });
      } catch {
        // The response must remain fail-safe even if temporary cleanup reports an error.
      }
    }
  }
}
