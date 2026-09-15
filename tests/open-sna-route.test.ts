import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { POST } from "../app/api/open-sna/analyze/route";
import {
  DELETE as deleteOpenSnaApiRoot,
  GET as getOpenSnaApiRoot,
  OPTIONS as optionsOpenSnaApiRoot,
  POST as postOpenSnaApiRoot,
} from "../app/api/open-sna/route";
import { buildMinimalXlsx } from "./helpers/minimal-xlsx";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const fakeRscript = path.join(repositoryRoot, "tests", "fixtures", "fake-open-sna-rscript.mjs");
const xlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const validWorkbookBytes = new Uint8Array(
  readFileSync(path.join(repositoryRoot, "tests", "fixtures", "open-sna-empty-network-80x40.xlsx")),
);
const workerTestTemporaryParent = path.resolve(tmpdir());

function createWorkerTestTemporaryRoot() {
  mkdirSync(workerTestTemporaryParent, { recursive: true, mode: 0o700 });
  return mkdtempSync(path.join(workerTestTemporaryParent, "open-sna-worker-tests-"));
}

function analysisRequest(authorization?: string, workbookBytes: Uint8Array = validWorkbookBytes) {
  const formData = new FormData();
  formData.set(
    "workbook",
    new File([workbookBytes], "fixture.xlsx", { type: xlsxMime }),
  );
  formData.set("bootstraps", "100");
  formData.set("permutations", "1000");
  const headers = authorization ? { Authorization: authorization } : undefined;
  return new Request("http://localhost/api/open-sna/analyze", { method: "POST", body: formData, headers });
}

function workerResult(schemaVersion: "1.0" | "1.1") {
  const result = JSON.parse(
    readFileSync(path.join(repositoryRoot, "public", "open-sna", "programming-resilience-demo.json"), "utf8"),
  ) as Record<string, unknown>;
  const settings = result.settings as Record<string, unknown>;
  const stability = result.stability as Record<string, unknown>;
  result.schemaVersion = schemaVersion;
  result.dataSource = "uploaded-workbook";
  settings.bootstrapReplicates = 100;
  stability.bootstraps = 100;
  return result;
}

test("GET /api/open-sna is a JSON 404 and does not invoke the analyze adapter", async () => {
  const response = getOpenSnaApiRoot();
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("content-type")?.includes("application/json"), true);
  const payload = await response.json() as { code?: string; error?: string };
  assert.equal(payload.code, "NOT_FOUND");
  assert.match(payload.error || "", /POST \/api\/open-sna\/analyze/);
});

test("non-analyze methods on /api/open-sna stay JSON 404", async () => {
  for (const handler of [postOpenSnaApiRoot, deleteOpenSnaApiRoot, optionsOpenSnaApiRoot]) {
    const response = handler();
    assert.equal(response.status, 404);
    const payload = await response.json() as { code?: string };
    assert.equal(payload.code, "NOT_FOUND");
  }
});

function isolateRouteEnvironment(keys: readonly string[]) {
  const allKeys = Array.from(new Set([...keys, "NODE_ENV", "OPENROUTER_API_KEY", "OPEN_SNA_TEST_OUTPUT_JSON", "OPEN_SNA_R_DISABLED"]));
  const originalEnvironment = Object.fromEntries(allKeys.map((key) => [key, process.env[key]]));
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OPEN_SNA_TEST_OUTPUT_JSON;
  delete process.env.OPEN_SNA_R_DISABLED;
  return originalEnvironment;
}

test("the public R kill switch still returns when no workbook can be validated", async () => {
  const originalEnvironment = isolateRouteEnvironment([]);
  process.env.OPEN_SNA_R_DISABLED = "1";
  const request = new Request("http://localhost/api/open-sna/analyze", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: "not-a-workbook",
  });

  try {
    const response = await POST(request);
    const payload = await response.json() as { code?: string; error?: string };
    assert.equal(response.status, 503);
    assert.equal(payload.code, "R_ENGINE_DISABLED");
    assert.match(payload.error || "", /disabled/i);
  } finally {
    restoreEnvironment(originalEnvironment);
  }
});

test("a disabled engine still returns WORKBOOK_INVALID for an uploaded invalid workbook", async () => {
  const originalEnvironment = isolateRouteEnvironment([]);
  process.env.OPEN_SNA_R_DISABLED = "1";
  const invalid = buildMinimalXlsx(["Name", "Score"], [["Ada", 1], ["Bea", 2]]);

  try {
    const response = await POST(analysisRequest(undefined, invalid));
    const payload = await response.json() as { code?: string; error?: string };
    assert.equal(response.status, 422);
    assert.equal(payload.code, "WORKBOOK_INVALID");
    assert.match(payload.error || "", /workbook could not be analyzed/i);
  } finally {
    restoreEnvironment(originalEnvironment);
  }
});

test("a disabled engine returns R_ENGINE_DISABLED after a valid workbook precheck", async () => {
  const originalEnvironment = isolateRouteEnvironment([
    "OPEN_SNA_RSCRIPT_BIN",
    "OPEN_SNA_R_API_URL",
    "VERCEL",
  ]);
  process.env.OPEN_SNA_R_DISABLED = "1";
  process.env.OPEN_SNA_RSCRIPT_BIN = fakeRscript;
  delete process.env.OPEN_SNA_R_API_URL;
  delete process.env.VERCEL;

  try {
    const response = await POST(analysisRequest());
    const payload = await response.json() as { code?: string };
    assert.equal(response.status, 503);
    assert.equal(payload.code, "R_ENGINE_DISABLED");
  } finally {
    restoreEnvironment(originalEnvironment);
  }
});

test("local R timeout responses use the bounded public timeout code", async () => {
  const environmentKeys = [
    "OPEN_SNA_RSCRIPT_BIN",
    "OPEN_SNA_TMP_ROOT",
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_TEST_DELAY_MS",
    "OPEN_SNA_TEST_FAILURE_CODE",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);
  const originalSetTimeout = globalThis.setTimeout;
  process.env.OPEN_SNA_RSCRIPT_BIN = fakeRscript;
  process.env.OPEN_SNA_TMP_ROOT = path.join(tmpdir(), "open-sna-route-timeout-tests");
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  process.env.OPEN_SNA_TEST_DELAY_MS = "250";
  process.env.OPEN_SNA_TEST_FAILURE_CODE = "R_ANALYSIS_FAILED";
  delete process.env.OPEN_SNA_R_API_URL;
  delete process.env.VERCEL;
  globalThis.setTimeout = ((handler: TimerHandler, timeout?: number, ...arguments_: unknown[]) => (
    originalSetTimeout(handler, timeout === 255_000 ? 20 : timeout, ...arguments_)
  )) as typeof setTimeout;

  try {
    const response = await POST(analysisRequest());
    const payload = await response.json() as { code?: string; error?: string };
    assert.equal(response.status, 504);
    assert.equal(payload.code, "R_ANALYSIS_TIMEOUT");
    assert.match(payload.error || "", /time limit|timed out/i);
    assert.ok((payload.error || "").length <= 200);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    restoreEnvironment(originalEnvironment);
  }
});

function restoreEnvironment(originalEnvironment: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test("the upload route distinguishes R runtime, workbook, and analysis failures", async () => {
  const environmentKeys = [
    "OPEN_SNA_RSCRIPT_BIN",
    "OPEN_SNA_R_LIBS_USER",
    "OPEN_SNA_TMP_ROOT",
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_TEST_FAILURE_CODE",
    "OPEN_SNA_TEST_EXPECT_R_LIBS_USER",
    "R_LIBS_USER",
    "NODE_ENV",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);

  process.env.OPEN_SNA_RSCRIPT_BIN = fakeRscript;
  process.env.OPEN_SNA_TMP_ROOT = path.join(tmpdir(), "open-sna-route-tests");
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  delete process.env.OPEN_SNA_R_API_URL;
  delete process.env.OPEN_SNA_R_LIBS_USER;
  delete process.env.R_LIBS_USER;
  delete process.env.VERCEL;

  try {
    process.env.OPEN_SNA_TEST_EXPECT_R_LIBS_USER = path.join(repositoryRoot, "tmp", "r-library");
    process.env.OPEN_SNA_TEST_FAILURE_CODE = "WORKBOOK_INVALID";
    const localLibraryResponse = await POST(analysisRequest());
    const localLibraryPayload = await localLibraryResponse.json() as { code?: string };
    assert.equal(localLibraryResponse.status, 422);
    assert.equal(localLibraryPayload.code, "WORKBOOK_INVALID");
    delete process.env.OPEN_SNA_TEST_EXPECT_R_LIBS_USER;

    process.env.OPEN_SNA_TEST_OUTPUT_JSON = JSON.stringify(workerResult("1.1"));
    const successResponse = await POST(analysisRequest());
    assert.equal(successResponse.status, 200);

    process.env.OPEN_SNA_TEST_EXPECT_R_LIBS_USER = "/tmp/open-sna-unavailable-r-library";
    const mismatchResponse = await POST(analysisRequest());
    const mismatchPayload = await mismatchResponse.json() as { code?: string };
    assert.equal(mismatchResponse.status, 500);
    assert.equal(mismatchPayload.code, "R_ANALYSIS_FAILED");
    delete process.env.OPEN_SNA_TEST_EXPECT_R_LIBS_USER;
    delete process.env.OPEN_SNA_TEST_OUTPUT_JSON;

    const cases = [
      {
        rCode: "R_RUNTIME_NOT_READY",
        status: 503,
        responseCode: "R_RUNTIME_NOT_READY",
        message: /runtime is not ready/i,
      },
      {
        rCode: "WORKBOOK_INVALID",
        status: 422,
        responseCode: "WORKBOOK_INVALID",
        message: /workbook could not be analyzed/i,
      },
      {
        rCode: "R_ANALYSIS_FAILED",
        status: 500,
        responseCode: "R_ANALYSIS_FAILED",
        message: /analysis engine failed/i,
      },
    ] as const;

    for (const expected of cases) {
      process.env.OPEN_SNA_TEST_FAILURE_CODE = expected.rCode;
      const response = await POST(analysisRequest());
      const payload = await response.json() as { code?: string; error?: string };

      assert.equal(response.status, expected.status, expected.rCode);
      assert.equal(payload.code, expected.responseCode, expected.rCode);
      assert.match(payload.error || "", expected.message, expected.rCode);
    }
  } finally {
    restoreEnvironment(originalEnvironment);
  }
});

test("local R analysis failures log a redacted one-line diagnostic", async () => {
  const environmentKeys = [
    "OPEN_SNA_RSCRIPT_BIN",
    "OPEN_SNA_TMP_ROOT",
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_TEST_FAILURE_CODE",
    "NODE_ENV",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);
  const logged: string[] = [];
  const originalConsoleError = console.error;
  process.env.OPEN_SNA_RSCRIPT_BIN = fakeRscript;
  process.env.OPEN_SNA_TMP_ROOT = path.join(tmpdir(), "open-sna-route-log-tests");
  (process.env as Record<string, string | undefined>).NODE_ENV = "test";
  process.env.OPEN_SNA_TEST_FAILURE_CODE = "R_ANALYSIS_FAILED";
  delete process.env.OPEN_SNA_R_API_URL;
  delete process.env.VERCEL;
  console.error = ((message?: unknown, ...rest: unknown[]) => {
    logged.push([message, ...rest].map((value) => String(value)).join(" "));
  }) as typeof console.error;

  try {
    const response = await POST(analysisRequest());
    const payload = await response.json() as { code?: string; detail?: string };
    assert.equal(response.status, 500);
    assert.equal(payload.code, "R_ANALYSIS_FAILED");
    assert.match(payload.detail || "", /cannot open file/i);
    assert.match(payload.detail || "", /\[path\]/);
    assert.doesNotMatch(payload.detail || "", /open-sna-jobs|input\.xlsx/);
    const diagnostic = logged.find((entry) => entry.includes("open_sna_r_failed"));
    assert.ok(diagnostic, "worker/local R failures must log open_sna_r_failed");
    const parsed = JSON.parse(diagnostic) as {
      failureCode?: string;
      detail?: string | null;
      stderrEmpty?: boolean;
    };
    assert.equal(parsed.failureCode, "R_ANALYSIS_FAILED");
    assert.equal(parsed.stderrEmpty, false);
    assert.match(parsed.detail || "", /cannot open file/i);
    assert.match(parsed.detail || "", /\[path\]/);
    assert.doesNotMatch(parsed.detail || "", /open-sna-jobs|input\.xlsx/);
  } finally {
    console.error = originalConsoleError;
    restoreEnvironment(originalEnvironment);
  }
});

test("worker mode requires bearer authentication and accepts an isolated Linux temporary root", async () => {
  const environmentKeys = [
    "OPEN_SNA_RSCRIPT_BIN",
    "OPEN_SNA_R_LIBS_USER",
    "OPEN_SNA_TMP_ROOT",
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_R_API_TOKEN",
    "OPEN_SNA_R_WORKER_MODE",
    "OPEN_SNA_R_WORKER_TOKEN",
    "OPEN_SNA_R_WORKER_TMP_ROOT",
    "OPEN_SNA_TEST_FAILURE_CODE",
    "R_LIBS_USER",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);
  const workerToken = "test-worker-token-with-32-characters";
  const workerTemporaryRoot = createWorkerTestTemporaryRoot();

  process.env.OPEN_SNA_RSCRIPT_BIN = fakeRscript;
  process.env.OPEN_SNA_R_WORKER_MODE = "1";
  process.env.OPEN_SNA_R_WORKER_TOKEN = workerToken;
  process.env.OPEN_SNA_R_WORKER_TMP_ROOT = workerTemporaryRoot;
  process.env.OPEN_SNA_TEST_FAILURE_CODE = "WORKBOOK_INVALID";
  delete process.env.OPEN_SNA_TMP_ROOT;
  delete process.env.OPEN_SNA_R_API_URL;
  delete process.env.OPEN_SNA_R_API_TOKEN;
  delete process.env.VERCEL;

  try {
    const unauthenticatedResponse = await POST(analysisRequest());
    const unauthenticatedPayload = await unauthenticatedResponse.json() as { code?: string };
    assert.equal(unauthenticatedResponse.status, 401);
    assert.equal(unauthenticatedPayload.code, "WORKER_UNAUTHORIZED");

    const authenticatedResponse = await POST(analysisRequest(`Bearer ${workerToken}`));
    const authenticatedPayload = await authenticatedResponse.json() as { code?: string };
    assert.equal(authenticatedResponse.status, 422);
    assert.equal(authenticatedPayload.code, "WORKBOOK_INVALID");

    for (const invalidToken of [
      "replace-with-a-unique-32-byte-token",
      `"replace-with-a-unique-32-byte-token"`,
      `${"x".repeat(16)} ${"x".repeat(16)}`,
      "界".repeat(32),
    ]) {
      process.env.OPEN_SNA_R_WORKER_TOKEN = invalidToken;
      const invalidTokenResponse = await POST(analysisRequest(`Bearer ${workerToken}`));
      const invalidTokenPayload = await invalidTokenResponse.json() as { code?: string };
      assert.equal(invalidTokenResponse.status, 503);
      assert.equal(invalidTokenPayload.code, "WORKER_CONFIGURATION_INVALID");
    }

    delete process.env.OPEN_SNA_R_WORKER_TOKEN;
    const misconfiguredResponse = await POST(analysisRequest(`Bearer ${workerToken}`));
    const misconfiguredPayload = await misconfiguredResponse.json() as { code?: string };
    assert.equal(misconfiguredResponse.status, 503);
    assert.equal(misconfiguredPayload.code, "WORKER_CONFIGURATION_INVALID");
  } finally {
    restoreEnvironment(originalEnvironment);
    rmSync(workerTemporaryRoot, { recursive: true, force: true });
  }
});

test("the web adapter maps remote worker failures without leaking worker diagnostics", async () => {
  let receivedAuthorization = "";
  let receivedUrl = "";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input, init) => {
    receivedUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    receivedAuthorization = new Headers(init?.headers).get("authorization") || "";
    return Response.json(
      {
        code: "WORKBOOK_INVALID",
        error: "private worker diagnostic that must not reach the browser",
      },
      { status: 422 },
    );
  }) as typeof fetch;

  const environmentKeys = [
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_R_API_TOKEN",
    "OPEN_SNA_R_WORKER_MODE",
    "OPEN_SNA_R_WORKER_TOKEN",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);
  const forwardingToken = "test-forwarding-token-with-32-characters";
  process.env.OPEN_SNA_R_API_URL = "https://worker.invalid/api/open-sna/analyze";
  process.env.OPEN_SNA_R_API_TOKEN = forwardingToken;
  delete process.env.OPEN_SNA_R_WORKER_MODE;
  delete process.env.OPEN_SNA_R_WORKER_TOKEN;
  delete process.env.VERCEL;

  try {
    const response = await POST(analysisRequest());
    const payload = await response.json() as { code?: string; error?: string };
    assert.equal(response.status, 422);
    assert.equal(payload.code, "WORKBOOK_INVALID");
    assert.match(payload.error || "", /workbook could not be analyzed/i);
    assert.doesNotMatch(payload.error || "", /private worker diagnostic/i);
    assert.equal(receivedAuthorization, `Bearer ${forwardingToken}`);
    assert.equal(receivedUrl, "https://worker.invalid/api/open-sna/analyze");
  } finally {
    restoreEnvironment(originalEnvironment);
    globalThis.fetch = originalFetch;
  }
});

test("the web adapter preserves the bounded remote timeout response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => Response.json(
    {
      code: "R_ANALYSIS_TIMEOUT",
      error: "private timeout diagnostics that must not reach the browser",
    },
    { status: 504 },
  )) as typeof fetch;

  const environmentKeys = [
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_R_API_TOKEN",
    "OPEN_SNA_R_WORKER_MODE",
    "OPEN_SNA_R_WORKER_TOKEN",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);
  process.env.OPEN_SNA_R_API_URL = "https://worker.invalid/api/open-sna/analyze";
  process.env.OPEN_SNA_R_API_TOKEN = "test-forwarding-token-with-32-characters";
  delete process.env.OPEN_SNA_R_WORKER_MODE;
  delete process.env.OPEN_SNA_R_WORKER_TOKEN;
  delete process.env.VERCEL;

  try {
    const response = await POST(analysisRequest());
    const payload = await response.json() as { code?: string; error?: string };
    assert.equal(response.status, 504);
    assert.equal(payload.code, "R_ANALYSIS_TIMEOUT");
    assert.match(payload.error || "", /time limit|timed out/i);
    assert.doesNotMatch(payload.error || "", /private timeout diagnostics/i);
  } finally {
    restoreEnvironment(originalEnvironment);
    globalThis.fetch = originalFetch;
  }
});

test("the web adapter preserves worker R_ANALYSIS_FAILED instead of mapping it to unavailable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => Response.json(
    {
      code: "R_ANALYSIS_FAILED",
      error: "private R stderr and /tmp/open-sna-jobs/job-xyz/input.xlsx",
      detail: "cannot open file '[path]'",
    },
    { status: 500 },
  )) as typeof fetch;

  const environmentKeys = [
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_R_API_TOKEN",
    "OPEN_SNA_R_WORKER_MODE",
    "OPEN_SNA_R_WORKER_TOKEN",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);
  process.env.OPEN_SNA_R_API_URL = "https://worker.invalid/api/open-sna/analyze";
  process.env.OPEN_SNA_R_API_TOKEN = "test-forwarding-token-with-32-characters";
  delete process.env.OPEN_SNA_R_WORKER_MODE;
  delete process.env.OPEN_SNA_R_WORKER_TOKEN;
  delete process.env.VERCEL;

  try {
    const response = await POST(analysisRequest());
    const payload = await response.json() as { code?: string; error?: string; detail?: string };
    assert.equal(response.status, 502);
    assert.equal(payload.code, "R_ANALYSIS_FAILED");
    assert.match(payload.error || "", /analysis engine failed/i);
    assert.equal(payload.detail, "cannot open file '[path]'");
    assert.doesNotMatch(payload.error || "", /temporarily unavailable/i);
    assert.doesNotMatch(JSON.stringify(payload), /private R stderr|open-sna-jobs|input\.xlsx/i);
  } finally {
    restoreEnvironment(originalEnvironment);
    globalThis.fetch = originalFetch;
  }
});

test("Vercel forwarding posts a non-empty input.xlsx Blob and accepts worker bootstraps=100", async () => {
  let forwardedBody: unknown;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_input, init) => {
    forwardedBody = init?.body;
    return Response.json(workerResult("1.1"), { status: 200 });
  }) as typeof fetch;

  const environmentKeys = [
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_R_API_TOKEN",
    "OPEN_SNA_R_WORKER_MODE",
    "OPEN_SNA_R_WORKER_TOKEN",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);
  process.env.OPEN_SNA_R_API_URL = "https://worker.invalid/api/open-sna/analyze";
  process.env.OPEN_SNA_R_API_TOKEN = "test-forwarding-token-with-32-characters";
  process.env.VERCEL = "1";
  delete process.env.OPEN_SNA_R_WORKER_MODE;
  delete process.env.OPEN_SNA_R_WORKER_TOKEN;

  try {
    const response = await POST(analysisRequest());
    const payload = await response.json() as { schemaVersion?: string; overview?: { nodeCount?: number } };
    assert.equal(response.status, 200);
    assert.equal(payload.schemaVersion, "1.1");
    assert.equal(payload.overview?.nodeCount, 16);

    assert.ok(forwardedBody instanceof FormData);
    const workbook = forwardedBody.get("workbook");
    assert.ok(workbook instanceof Blob);
    assert.ok(workbook instanceof File, "append(blob, filename) must produce a named File part");
    assert.notEqual(workbook.size, 0);
    assert.equal(workbook.size, validWorkbookBytes.byteLength);
    assert.equal(workbook.name, "input.xlsx");
    const forwardedBytes = new Uint8Array(await workbook.arrayBuffer());
    assert.equal(forwardedBytes.byteLength, validWorkbookBytes.byteLength);
    assert.equal(forwardedBytes[0], 0x50);
    assert.equal(forwardedBytes[1], 0x4b);
    assert.deepEqual(forwardedBytes, validWorkbookBytes);
    assert.equal(forwardedBody.get("bootstraps"), "100");
    assert.equal(forwardedBody.get("permutations"), "1000");
  } finally {
    restoreEnvironment(originalEnvironment);
    globalThis.fetch = originalFetch;
  }
});

test("a 200 worker payload that is not JSON is a contract failure, not unavailable", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response("<html>not json</html>", {
    status: 200,
    headers: { "Content-Type": "text/html" },
  })) as typeof fetch;
  const environmentKeys = [
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_R_API_TOKEN",
    "OPEN_SNA_R_WORKER_MODE",
    "OPEN_SNA_R_WORKER_TOKEN",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);
  process.env.OPEN_SNA_R_API_URL = "https://worker.invalid/api/open-sna/analyze";
  process.env.OPEN_SNA_R_API_TOKEN = "test-forwarding-token-with-32-characters";
  delete process.env.OPEN_SNA_R_WORKER_MODE;
  delete process.env.OPEN_SNA_R_WORKER_TOKEN;
  delete process.env.VERCEL;

  const originalError = console.error;
  const logged: string[] = [];
  console.error = (...args: unknown[]) => {
    logged.push(args.map((value) => String(value)).join(" "));
  };

  try {
    const response = await POST(analysisRequest());
    const payload = await response.json() as { code?: string; error?: string };
    assert.equal(response.status, 502);
    assert.equal(payload.code, "R_ENGINE_CONTRACT_FAILED");
    assert.match(payload.error || "", /could not be used/i);
    assert.doesNotMatch(payload.error || "", /temporarily unavailable/i);
    assert.ok(logged.some((line) => line.includes("open_sna_remote_engine_failed")));
    assert.ok(logged.some((line) => line.includes("REMOTE_ENGINE_CONTRACT_FAILED")));
  } finally {
    console.error = originalError;
    restoreEnvironment(originalEnvironment);
    globalThis.fetch = originalFetch;
  }
});

test("the remote worker boundary dual-reads strict 1.0 and 1.1 but publishes only canonical 1.1", async () => {
  let responsePayload: unknown = workerResult("1.1");
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => Response.json(responsePayload, { status: 200 })) as typeof fetch;

  const environmentKeys = [
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_R_API_TOKEN",
    "OPEN_SNA_R_WORKER_MODE",
    "OPEN_SNA_R_WORKER_TOKEN",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);
  process.env.OPEN_SNA_R_API_URL = "https://worker.invalid/api/open-sna/analyze";
  process.env.OPEN_SNA_R_API_TOKEN = "test-forwarding-token-with-32-characters";
  delete process.env.OPEN_SNA_R_WORKER_MODE;
  delete process.env.OPEN_SNA_R_WORKER_TOKEN;
  delete process.env.VERCEL;

  try {
    for (const version of ["1.0", "1.1"] as const) {
      responsePayload = workerResult(version);
      const response = await POST(analysisRequest());
      const payload = await response.json() as {
        schemaVersion?: string;
        dataSource?: string;
        inputFingerprint?: string;
        overview?: { nodeCount?: number };
        source?: { fileName?: string; sheet?: string };
      };
      assert.equal(response.status, 200, version);
      assert.equal(payload.schemaVersion, "1.1", version);
      assert.equal(payload.dataSource, "uploaded-workbook", version);
      assert.match(payload.inputFingerprint || "", /^sha256:[a-f0-9]{64}$/, version);
      assert.equal(payload.overview?.nodeCount, 16, version);
      assert.equal(payload.source?.fileName, "Uploaded workbook", version);
      assert.equal(payload.source?.sheet, "Uploaded worksheet", version);
    }

    const unavailable = workerResult("1.0");
    unavailable.subgroupComparison = { available: false, reason: "missing" };

    const nullGroupColumn = workerResult("1.0");
    (nullGroupColumn.source as Record<string, unknown>).groupColumn = null;

    const mismatchedCounts = workerResult("1.0");
    const counts = (mismatchedCounts.source as Record<string, unknown>).groupCounts as Array<Record<string, unknown>>;
    counts[0].n = Number(counts[0].n) + 1;

    const missingVersion = workerResult("1.1");
    delete missingVersion.schemaVersion;

    const legacyWithRawData = workerResult("1.0");
    legacyWithRawData.rawData = [{ respondentId: "private-row" }];
    const nativeWithRecords = workerResult("1.1");
    nativeWithRecords.records = [{ respondentId: "private-row" }];
    const legacyWithNestedPrivateField = workerResult("1.0");
    (legacyWithNestedPrivateField.privacy as Record<string, unknown>).rawData = [{ respondentId: "private-row" }];

    const invalidPayloads: Array<{ name: string; payload: unknown }> = [
      { name: "legacy unavailable NCT", payload: unavailable },
      { name: "legacy null grouping column", payload: nullGroupColumn },
      { name: "legacy mismatched group counts", payload: mismatchedCounts },
      { name: "unknown version", payload: { ...workerResult("1.1"), schemaVersion: "1.2" } },
      { name: "missing version", payload: missingVersion },
      { name: "legacy top-level raw data", payload: legacyWithRawData },
      { name: "native top-level records", payload: nativeWithRecords },
      { name: "legacy nested private field", payload: legacyWithNestedPrivateField },
      { name: "non-object JSON", payload: "not-an-open-sna-result" },
    ];

    for (const invalid of invalidPayloads) {
      responsePayload = invalid.payload;
      const response = await POST(analysisRequest());
      const payload = await response.json() as { code?: string };
      assert.equal(response.status, 502, invalid.name);
      assert.equal(payload.code, "R_ENGINE_CONTRACT_FAILED", invalid.name);
    }
  } finally {
    restoreEnvironment(originalEnvironment);
    globalThis.fetch = originalFetch;
  }
});

test("worker mode admits only one R analysis at a time", async () => {
  const environmentKeys = [
    "OPEN_SNA_RSCRIPT_BIN",
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_R_WORKER_MODE",
    "OPEN_SNA_R_WORKER_TOKEN",
    "OPEN_SNA_R_WORKER_TMP_ROOT",
    "OPEN_SNA_TEST_DELAY_MS",
    "OPEN_SNA_TEST_FAILURE_CODE",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);
  const workerToken = "test-worker-token-with-32-characters";
  const workerTemporaryRoot = createWorkerTestTemporaryRoot();
  process.env.OPEN_SNA_RSCRIPT_BIN = fakeRscript;
  process.env.OPEN_SNA_R_WORKER_MODE = "1";
  process.env.OPEN_SNA_R_WORKER_TOKEN = workerToken;
  process.env.OPEN_SNA_R_WORKER_TMP_ROOT = workerTemporaryRoot;
  process.env.OPEN_SNA_TEST_DELAY_MS = "150";
  process.env.OPEN_SNA_TEST_FAILURE_CODE = "WORKBOOK_INVALID";
  delete process.env.OPEN_SNA_R_API_URL;
  delete process.env.VERCEL;

  try {
    const firstAnalysis = POST(analysisRequest(`Bearer ${workerToken}`));
    await new Promise((resolve) => setTimeout(resolve, 25));
    const busyResponse = await POST(analysisRequest(`Bearer ${workerToken}`));
    const busyPayload = await busyResponse.json() as { code?: string };
    assert.equal(busyResponse.status, 429);
    assert.equal(busyPayload.code, "WORKER_BUSY");

    const firstResponse = await firstAnalysis;
    assert.equal(firstResponse.status, 422);
  } finally {
    restoreEnvironment(originalEnvironment);
    rmSync(workerTemporaryRoot, { recursive: true, force: true });
  }
});

test("the web adapter reports an unavailable remote worker as a gateway failure", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new TypeError("synthetic unavailable worker");
  }) as typeof fetch;
  const environmentKeys = [
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_R_API_TOKEN",
    "OPEN_SNA_R_WORKER_MODE",
    "OPEN_SNA_R_WORKER_TOKEN",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);
  process.env.OPEN_SNA_R_API_URL = "https://worker.invalid/api/open-sna/analyze";
  process.env.OPEN_SNA_R_API_TOKEN = "test-forwarding-token-with-32-characters";
  delete process.env.OPEN_SNA_R_WORKER_MODE;
  delete process.env.OPEN_SNA_R_WORKER_TOKEN;
  delete process.env.VERCEL;

  try {
    const response = await POST(analysisRequest());
    const payload = await response.json() as { code?: string; error?: string };
    assert.equal(response.status, 502);
    assert.equal(payload.code, "R_ENGINE_UNAVAILABLE");
    assert.match(payload.error || "", /temporarily unavailable/i);
    assert.doesNotMatch(payload.error || "", /synthetic unavailable worker/i);
  } finally {
    restoreEnvironment(originalEnvironment);
    globalThis.fetch = originalFetch;
  }
});

test("the web adapter refuses an unauthenticated remote worker configuration", async () => {
  const environmentKeys = [
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_R_API_TOKEN",
    "OPEN_SNA_R_WORKER_MODE",
    "OPEN_SNA_R_WORKER_TOKEN",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);
  process.env.OPEN_SNA_R_API_URL = "ftp://user:pass@worker.invalid/api/open-sna/analyze";
  process.env.OPEN_SNA_R_API_TOKEN = "x".repeat(32);
  delete process.env.OPEN_SNA_R_WORKER_MODE;
  delete process.env.OPEN_SNA_R_WORKER_TOKEN;
  process.env.VERCEL = "1";

  try {
    const response = await POST(analysisRequest());
    const payload = await response.json() as { code?: string; error?: string };
    assert.equal(response.status, 503);
    assert.equal(payload.code, "R_ENGINE_CONFIGURATION_INVALID");
    assert.match(payload.error || "", /configuration is incomplete/i);
  } finally {
    restoreEnvironment(originalEnvironment);
  }
});

test("the Open SNA engine config requires HTTPS and the exact planned analyze endpoint path", async () => {
  const { readOpenSnaEngineConfigurationStatus } = await import("../lib/open-sna-config");
  const environmentKeys = ["OPEN_SNA_R_API_URL", "OPEN_SNA_R_API_TOKEN"] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);

  try {
    for (const invalidUrl of [
      "http://127.0.0.1:1234/api/open-sna/analyze",
      "http://localhost:1234/api/open-sna/analyze",
      "http://[::1]:1234/api/open-sna/analyze",
      "https://worker.invalid/api/open-sna/analyze/health",
    ]) {
      process.env.OPEN_SNA_R_API_URL = invalidUrl;
      process.env.OPEN_SNA_R_API_TOKEN = "x".repeat(32);

      const status = readOpenSnaEngineConfigurationStatus();

      assert.equal(status.configured, false, invalidUrl);
      if (status.configured) assert.fail(`unexpectedly accepted ${invalidUrl}`);
      assert.equal(status.reason, "invalid", invalidUrl);
    }
  } finally {
    restoreEnvironment(originalEnvironment);
  }
});
