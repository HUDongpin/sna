import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { precheckOpenSnaWorkbook } from "../lib/open-sna-workbook-schema";
import { isOpenSnaValidationResult } from "../lib/open-sna-workbook-validation";
import { buildMinimalXlsx, buildProgrammingResilienceSampleXlsx } from "./helpers/minimal-xlsx";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

function readBytes(...segments: string[]) {
  return new Uint8Array(readFileSync(path.join(repositoryRoot, ...segments)));
}

function asValidationResult(bytes: Uint8Array) {
  const precheck = precheckOpenSnaWorkbook(bytes);
  assert.equal(precheck.valid, true);
  return {
    schemaVersion: "1.0" as const,
    valid: true as const,
    inputFingerprint: `sha256:${createHash("sha256").update(bytes).digest("hex")}`,
    summary: precheck.summary,
  };
}

test("the public sample and empty-network fixtures pass the R-equivalent workbook precheck", () => {
  const generated = buildProgrammingResilienceSampleXlsx();
  const sample = readBytes("public", "open-sna", "programming-resilience-sample.xlsx");
  assert.deepEqual(Buffer.from(sample), Buffer.from(generated));
  const sampleResult = asValidationResult(sample);
  assert.equal(isOpenSnaValidationResult(sampleResult), true);
  assert.equal(sampleResult.summary.itemCount, 16);
  assert.equal(sampleResult.summary.communityCount, 4);
  assert.equal(sampleResult.summary.groupColumn, "Gender");
  assert.equal(sampleResult.summary.analyzedRows, 50);
  assert.ok(sampleResult.summary.analyzedRows >= Math.max(30, sampleResult.summary.itemCount + 5));
  assert.deepEqual(sampleResult.summary.groupCounts, [
    { group: "F", n: 25 },
    { group: "M", n: 25 },
  ]);

  const fixture = readBytes("tests", "fixtures", "open-sna-empty-network-80x40.xlsx");
  const fixtureResult = asValidationResult(fixture);
  assert.equal(isOpenSnaValidationResult(fixtureResult), true);
  assert.equal(fixtureResult.summary.itemCount, 40);
  assert.equal(fixtureResult.summary.communityCount, 4);
  assert.equal(fixtureResult.summary.originalRows, 80);
  assert.equal(fixtureResult.summary.groupColumn, "Gender");
});

test("the workbook precheck rejects workbooks that cannot satisfy the Open SNA schema", () => {
  const invalid = buildMinimalXlsx(
    ["Name", "Score"],
    [
      ["Ada", 1],
      ["Bea", 2],
    ],
  );
  assert.deepEqual(precheckOpenSnaWorkbook(invalid), { valid: false, code: "WORKBOOK_INVALID" });
  assert.deepEqual(precheckOpenSnaWorkbook(new Uint8Array([0x50, 0x4b, 0x03, 0x04])), {
    valid: false,
    code: "WORKBOOK_INVALID",
  });
});
