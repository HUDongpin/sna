import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { precheckOpenSnaWorkbook } from "../lib/open-sna-workbook-schema";
import { isOpenSnaValidationResult } from "../lib/open-sna-workbook-validation";
import {
  OPEN_SNA_SAMPLE_ITEM_HEADERS,
  buildMinimalXlsx,
  buildProgrammingResilienceSampleRows,
  buildProgrammingResilienceSampleXlsx,
} from "./helpers/minimal-xlsx";

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

function pearson(left: number[], right: number[]) {
  const n = left.length;
  const meanLeft = left.reduce((sum, value) => sum + value, 0) / n;
  const meanRight = right.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let leftVariance = 0;
  let rightVariance = 0;
  for (let index = 0; index < n; index += 1) {
    const leftDelta = left[index] - meanLeft;
    const rightDelta = right[index] - meanRight;
    numerator += leftDelta * rightDelta;
    leftVariance += leftDelta * leftDelta;
    rightVariance += rightDelta * rightDelta;
  }
  return numerator / Math.sqrt(leftVariance * rightVariance);
}

function itemColumns(rows: Array<Array<string | number>>) {
  return OPEN_SNA_SAMPLE_ITEM_HEADERS.map((_, column) => rows.map((row) => Number(row[column])));
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

  const rows = buildProgrammingResilienceSampleRows();
  assert.equal(rows.length, 50);
  assert.deepEqual(rows.map((row) => row[16]).slice(0, 25), Array(25).fill("F"));
  assert.deepEqual(rows.map((row) => row[16]).slice(25), Array(25).fill("M"));
  assert.notDeepEqual(
    rows[0],
    [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, "F"],
  );
  const columns = itemColumns(rows);
  const signatures = new Set(columns.map((column) => column.join(",")));
  assert.equal(signatures.size, OPEN_SNA_SAMPLE_ITEM_HEADERS.length);
  for (const column of columns) {
    const values = new Set(column);
    assert.ok(values.size >= 2);
    for (const value of values) {
      assert.ok(Number.isInteger(value) && value >= 1 && value <= 5);
    }
  }
  let withinSum = 0;
  let withinCount = 0;
  let betweenSum = 0;
  let betweenCount = 0;
  for (let left = 0; left < columns.length; left += 1) {
    for (let right = left + 1; right < columns.length; right += 1) {
      const correlation = pearson(columns[left], columns[right]);
      if (Math.floor(left / 4) === Math.floor(right / 4)) {
        withinSum += correlation;
        withinCount += 1;
      } else {
        betweenSum += correlation;
        betweenCount += 1;
      }
    }
  }
  assert.ok(withinCount > 0 && betweenCount > 0);
  assert.ok(withinSum / withinCount > betweenSum / betweenCount);

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
