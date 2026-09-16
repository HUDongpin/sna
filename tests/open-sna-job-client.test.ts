import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { OPEN_SNA_ASYNC_DELIVERY } from "../lib/open-sna-job";
import { runOpenSnaWorkbookAnalysis } from "../lib/open-sna-job-client";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

function demoResult() {
  const result = JSON.parse(
    readFileSync(path.join(repositoryRoot, "public", "open-sna", "programming-resilience-demo.json"), "utf8"),
  ) as Record<string, unknown>;
  const settings = result.settings as Record<string, unknown>;
  const stability = result.stability as Record<string, unknown>;
  result.dataSource = "uploaded-workbook";
  settings.bootstrapReplicates = 100;
  stability.bootstraps = 100;
  return result;
}

test("runOpenSnaWorkbookAnalysis polls a pending job until the result arrives", async () => {
  const jobId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  const result = demoResult();
  const urls: string[] = [];
  let polls = 0;
  const fetchImpl = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    urls.push(url);
    if (url === "/api/open-sna/analyze") {
      return Response.json({ jobId, status: "queued" }, { status: 202 });
    }
    polls += 1;
    if (polls === 1) return Response.json({ jobId, status: "running" }, { status: 202 });
    return Response.json(result, { status: 200 });
  }) as typeof fetch;

  const formData = new FormData();
  formData.set("delivery", OPEN_SNA_ASYNC_DELIVERY);
  const outcome = await runOpenSnaWorkbookAnalysis(formData, {
    fetchImpl,
    sleep: async () => undefined,
    now: (() => {
      let current = 0;
      return () => {
        current += 1;
        return current;
      };
    })(),
    pollIntervalMs: 1,
    deadlineMs: 10,
  });

  assert.equal(outcome.ok, true);
  if (!outcome.ok) return;
  assert.equal(outcome.result.schemaVersion, "1.1");
  assert.equal(outcome.result.dataSource, "uploaded-workbook");
  assert.equal(urls[0], "/api/open-sna/analyze");
  assert.equal(urls[1], `/api/open-sna/analyze?job=${jobId}`);
  assert.equal(urls[2], `/api/open-sna/analyze?job=${jobId}`);
});

test("runOpenSnaWorkbookAnalysis maps a failed job through the bounded decoder", async () => {
  const fetchImpl = (async () => Response.json(
    { code: "R_ANALYSIS_TIMEOUT", error: "private timeout diagnostics" },
    { status: 504 },
  )) as typeof fetch;

  const outcome = await runOpenSnaWorkbookAnalysis(new FormData(), { fetchImpl });
  assert.equal(outcome.ok, false);
  if (outcome.ok) return;
  assert.match(outcome.message, /R_ANALYSIS_TIMEOUT/);
  assert.doesNotMatch(outcome.message, /private timeout diagnostics/);
});
