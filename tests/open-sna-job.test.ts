import assert from "node:assert/strict";
import test from "node:test";
import {
  createOpenSnaJobId,
  isOpenSnaJobPending,
  parseOpenSnaJobId,
  parseOpenSnaJobMeta,
} from "../lib/open-sna-job";

test("parseOpenSnaJobId accepts a UUID and rejects path-like values", () => {
  const id = createOpenSnaJobId("AAAAAAAA-BBBB-4CCC-8DDD-EEEEEEEEEEEE");
  assert.equal(id, "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee");
  assert.equal(parseOpenSnaJobId("../tmp/open-sna-jobs/async/secret"), null);
  assert.equal(parseOpenSnaJobId("not-a-job"), null);
  assert.equal(parseOpenSnaJobId(""), null);
});

test("isOpenSnaJobPending requires a job id and a non-terminal status", () => {
  const jobId = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  assert.equal(isOpenSnaJobPending({ jobId, status: "queued" }), true);
  assert.equal(isOpenSnaJobPending({ jobId, status: "running" }), true);
  assert.equal(isOpenSnaJobPending({ jobId, status: "succeeded" }), false);
  assert.equal(isOpenSnaJobPending({ status: "queued" }), false);
});

test("parseOpenSnaJobMeta rejects a succeeded record without timestamps", () => {
  const parsed = parseOpenSnaJobMeta({
    id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    status: "succeeded",
    createdAt: "2026-09-16T00:00:00.000Z",
    bootstraps: "100",
    permutations: "1000",
    inputFingerprint: `sha256:${"a".repeat(64)}`,
  });
  assert.equal(parsed, null);
});
