import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const errorModulePath = path.join(repositoryRoot, "lib", "open-sna-errors.ts");
const genericPublicMessage = "The workbook could not be analyzed. Try again later or inspect the aggregate reference result.";

test("Open SNA maps public API failures to distinct bounded messages", async () => {
  assert.ok(existsSync(errorModulePath), "the bounded Open SNA UI error mapper must exist");
  const { openSnaAnalysisErrorMessage } = await import("../lib/open-sna-errors");
  const cases = [
    [429, "WORKER_BUSY"],
    [502, "R_ENGINE_UNAVAILABLE"],
    [503, "R_ENGINE_DISABLED"],
    [503, "R_ENGINE_NOT_CONFIGURED"],
    [504, "R_ANALYSIS_TIMEOUT"],
    [422, "WORKBOOK_INVALID"],
  ] as const;
  const messages = cases.map(([status, code]) => openSnaAnalysisErrorMessage(status, {
    code,
    error: "private server diagnostic https://10.0.0.8/resource raw-token-value",
  }));

  assert.equal(new Set(messages).size, messages.length);
  for (const message of messages) {
    assert.ok(message.length > 0 && message.length <= 240);
    assert.doesNotMatch(message, /private server diagnostic|https?:\/\/|10\.0\.0\.8|raw-token-value/i);
  }
  assert.match(messages[0], /another analysis|busy/i);
  assert.match(messages[1], /unavailable/i);
  assert.match(messages[2], /disabled/i);
  assert.match(messages[3], /not configured/i);
  assert.match(messages[4], /time limit|timed out/i);
  assert.match(messages[5], /workbook/i);
});

test("Open SNA uses a bounded generic message for unknown or mismatched failures", async () => {
  assert.ok(existsSync(errorModulePath), "the bounded Open SNA UI error mapper must exist");
  const { openSnaAnalysisErrorMessage } = await import("../lib/open-sna-errors");
  const message = openSnaAnalysisErrorMessage(500, {
    code: "PRIVATE_INTERNAL_CODE",
    error: "raw response body and server diagnostics",
  });
  assert.equal(message, genericPublicMessage);
});

test("Open SNA discards malformed analysis response bodies and parser exception text", async () => {
  const untrustedBody = '<TOKEN-SECRET>https://private.invalid/diagnostic 10.20.30.40 raw server trace';
  const response = new Response(untrustedBody, {
    status: 502,
    headers: { "Content-Type": "text/html" },
  });
  const { decodeOpenSnaAnalysisResponse } = await import("../lib/open-sna-errors");
  const decoded = await decodeOpenSnaAnalysisResponse(response);

  assert.equal(decoded.ok, false);
  if (decoded.ok) assert.fail("malformed JSON must not decode successfully");
  assert.equal(decoded.message, genericPublicMessage);
  assert.doesNotMatch(decoded.message, /TOKEN-SECRET|https?:\/\/|private\.invalid|10\.20\.30\.40|raw server trace/i);
});

test("Open SNA guarded decoding preserves distinct status and code mappings", async () => {
  const errorModule = await import("../lib/open-sna-errors");

  const cases = [
    [429, "WORKER_BUSY"],
    [502, "R_ENGINE_UNAVAILABLE"],
    [503, "R_ENGINE_DISABLED"],
    [503, "R_ENGINE_NOT_CONFIGURED"],
    [504, "R_ANALYSIS_TIMEOUT"],
    [422, "WORKBOOK_INVALID"],
  ] as const;
  for (const [status, code] of cases) {
    const response = new Response(JSON.stringify({ code, error: "untrusted server text" }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
    const decoded = await errorModule.decodeOpenSnaAnalysisResponse(response);
    assert.equal(decoded.ok, false, code);
    if (!decoded.ok) {
      assert.equal(decoded.message, errorModule.openSnaAnalysisErrorMessage(status, { code }), code);
      assert.doesNotMatch(decoded.message, /untrusted server text/i, code);
    }
  }
});
