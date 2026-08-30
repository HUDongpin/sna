import assert from "node:assert/strict";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { POST } from "../app/api/open-sna/analyze/route";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const fakeRscript = path.join(repositoryRoot, "tests", "fixtures", "fake-open-sna-rscript.mjs");
const xlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function analysisRequest(authorization?: string) {
  const formData = new FormData();
  formData.set(
    "workbook",
    new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], "fixture.xlsx", { type: xlsxMime }),
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

function isolateRouteEnvironment(keys: readonly string[]) {
  const allKeys = Array.from(new Set([...keys, "OPENROUTER_API_KEY", "OPEN_SNA_TEST_OUTPUT_JSON", "OPEN_SNA_R_DISABLED"]));
  const originalEnvironment = Object.fromEntries(allKeys.map((key) => [key, process.env[key]]));
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OPEN_SNA_TEST_OUTPUT_JSON;
  return originalEnvironment;
}

test("the public R kill switch returns before multipart parsing", async () => {
  const originalEnvironment = isolateRouteEnvironment([]);
  process.env.OPEN_SNA_R_DISABLED = "1";
  let multipartParsed = false;
  const request = new Request("http://localhost/api/open-sna/analyze", {
    method: "POST",
    headers: { "Content-Type": "multipart/form-data; boundary=disabled" },
  });
  Object.defineProperty(request, "formData", {
    value: async () => {
      multipartParsed = true;
      throw new Error("multipart parsing must not run while R is disabled");
    },
  });

  try {
    const response = await POST(request);
    const payload = await response.json() as { code?: string; error?: string };
    assert.equal(response.status, 503);
    assert.equal(payload.code, "R_ENGINE_DISABLED");
    assert.match(payload.error || "", /disabled/i);
    assert.equal(multipartParsed, false);
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
  process.env.OPEN_SNA_TMP_ROOT = path.join(repositoryRoot, "tmp", "open-sna-route-timeout-tests");
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
  process.env.NODE_ENV = "test";
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

  process.env.OPEN_SNA_RSCRIPT_BIN = fakeRscript;
  process.env.OPEN_SNA_R_WORKER_MODE = "1";
  process.env.OPEN_SNA_R_WORKER_TOKEN = workerToken;
  process.env.OPEN_SNA_R_WORKER_TMP_ROOT = "/tmp/open-sna-worker-tests";
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

    delete process.env.OPEN_SNA_R_WORKER_TOKEN;
    const misconfiguredResponse = await POST(analysisRequest(`Bearer ${workerToken}`));
    const misconfiguredPayload = await misconfiguredResponse.json() as { code?: string };
    assert.equal(misconfiguredResponse.status, 503);
    assert.equal(misconfiguredPayload.code, "WORKER_CONFIGURATION_INVALID");
  } finally {
    restoreEnvironment(originalEnvironment);
  }
});

test("the web adapter maps remote worker failures without leaking worker diagnostics", async () => {
  let receivedAuthorization = "";
  const server = createServer((request, response) => {
    receivedAuthorization = request.headers.authorization || "";
    response.writeHead(422, { "Content-Type": "application/json" });
    response.end(JSON.stringify({
      code: "WORKBOOK_INVALID",
      error: "private worker diagnostic that must not reach the browser",
    }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  const environmentKeys = [
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_R_API_TOKEN",
    "OPEN_SNA_R_WORKER_MODE",
    "OPEN_SNA_R_WORKER_TOKEN",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);
  const forwardingToken = "test-forwarding-token-with-32-characters";
  process.env.OPEN_SNA_R_API_URL = `http://127.0.0.1:${address.port}/api/open-sna/analyze`;
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
  } finally {
    restoreEnvironment(originalEnvironment);
    server.close();
    await once(server, "close");
  }
});

test("the web adapter preserves the bounded remote timeout response", async () => {
  const server = createServer((_request, response) => {
    response.writeHead(504, { "Content-Type": "application/json" });
    response.end(JSON.stringify({
      code: "R_ANALYSIS_TIMEOUT",
      error: "private timeout diagnostics that must not reach the browser",
    }));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  const environmentKeys = [
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_R_API_TOKEN",
    "OPEN_SNA_R_WORKER_MODE",
    "OPEN_SNA_R_WORKER_TOKEN",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);
  process.env.OPEN_SNA_R_API_URL = `http://127.0.0.1:${address.port}/api/open-sna/analyze`;
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
    server.close();
    await once(server, "close");
  }
});

test("the remote worker boundary dual-reads strict 1.0 and 1.1 but publishes only canonical 1.1", async () => {
  let responsePayload: unknown = workerResult("1.1");
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(responsePayload));
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  const environmentKeys = [
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_R_API_TOKEN",
    "OPEN_SNA_R_WORKER_MODE",
    "OPEN_SNA_R_WORKER_TOKEN",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);
  process.env.OPEN_SNA_R_API_URL = `http://127.0.0.1:${address.port}/api/open-sna/analyze`;
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
      assert.equal(payload.code, "R_ENGINE_UNAVAILABLE", invalid.name);
    }
  } finally {
    restoreEnvironment(originalEnvironment);
    server.close();
    await once(server, "close");
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
  process.env.OPEN_SNA_RSCRIPT_BIN = fakeRscript;
  process.env.OPEN_SNA_R_WORKER_MODE = "1";
  process.env.OPEN_SNA_R_WORKER_TOKEN = workerToken;
  process.env.OPEN_SNA_R_WORKER_TMP_ROOT = "/tmp/open-sna-worker-tests";
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
  }
});

test("the web adapter reports an unavailable remote worker as a gateway failure", async () => {
  const environmentKeys = [
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_R_API_TOKEN",
    "OPEN_SNA_R_WORKER_MODE",
    "OPEN_SNA_R_WORKER_TOKEN",
    "VERCEL",
  ] as const;
  const originalEnvironment = isolateRouteEnvironment(environmentKeys);
  process.env.OPEN_SNA_R_API_URL = "http://127.0.0.1:1/api/open-sna/analyze";
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
  } finally {
    restoreEnvironment(originalEnvironment);
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

test("the Open SNA engine config requires the exact planned analyze endpoint path", async () => {
  const { readOpenSnaEngineConfigurationStatus } = await import("../lib/open-sna-config");

  process.env.OPEN_SNA_R_API_URL = "https://worker.invalid/api/open-sna/analyze/health";
  process.env.OPEN_SNA_R_API_TOKEN = "x".repeat(32);

  const status = readOpenSnaEngineConfigurationStatus();

  assert.equal(status.configured, false);
  if (status.configured) assert.fail("unexpectedly accepted a non-exact endpoint path");
  assert.equal(status.reason, "invalid");
});
