import assert from "node:assert/strict";
import test from "node:test";
import { isOpenSnaValidationResult } from "../lib/open-sna-workbook-validation";

const safeValidationResult = {
  schemaVersion: "1.0",
  valid: true,
  inputFingerprint: `sha256:${"a".repeat(64)}`,
  summary: {
    originalRows: 80,
    analyzedRows: 80,
    droppedRows: 0,
    itemCount: 40,
    communityCount: 4,
    groupColumn: "Gender",
    groupCounts: [{ group: "1", n: 40 }, { group: "2", n: 40 }],
  },
};

function cloneSafeResult() {
  return structuredClone(safeValidationResult);
}

test("Open SNA validation accepts only the exact safe aggregate response", () => {
  assert.equal(isOpenSnaValidationResult(safeValidationResult), true);
});

test("Open SNA validation rejects invalid aggregate values", () => {
  const mutations: Array<{ name: string; mutate: (result: ReturnType<typeof cloneSafeResult>) => void }> = [
    { name: "empty group counts", mutate: (result) => { result.summary.groupCounts = []; } },
    { name: "one group count", mutate: (result) => { result.summary.groupCounts = [result.summary.groupCounts[0]]; } },
    {
      name: "three group counts",
      mutate: (result) => { result.summary.groupCounts.push({ group: "3", n: 20 }); },
    },
    {
      name: "duplicate group labels",
      mutate: (result) => { result.summary.groupCounts[1].group = result.summary.groupCounts[0].group; },
    },
    { name: "unsafe group label", mutate: (result) => { result.summary.groupCounts[0].group = "<unsafe>"; } },
    { name: "group below 20", mutate: (result) => { result.summary.groupCounts[0].n = 19; result.summary.groupCounts[1].n = 61; } },
    { name: "group total mismatch", mutate: (result) => { result.summary.groupCounts[0].n = 39; } },
    { name: "malformed fingerprint", mutate: (result) => { result.inputFingerprint = "sha256:invalid"; } },
    { name: "row arithmetic mismatch", mutate: (result) => { result.summary.droppedRows = 1; } },
    { name: "too few items", mutate: (result) => { result.summary.itemCount = 5; } },
    { name: "too many items", mutate: (result) => { result.summary.itemCount = 41; } },
    { name: "too few communities", mutate: (result) => { result.summary.communityCount = 1; } },
    { name: "too many communities", mutate: (result) => { result.summary.communityCount = 9; } },
    { name: "more communities than items", mutate: (result) => { result.summary.itemCount = 6; result.summary.communityCount = 7; } },
    { name: "unsafe group column", mutate: (result) => { result.summary.groupColumn = "<Gender>"; } },
    { name: "missing group column", mutate: (result) => { delete (result.summary as Record<string, unknown>).groupColumn; } },
  ];

  for (const { name, mutate } of mutations) {
    const invalid = cloneSafeResult();
    mutate(invalid);
    assert.equal(isOpenSnaValidationResult(invalid), false, name);
  }
});

test("Open SNA validation rejects unknown and row-level-shaped fields at every fixed object", () => {
  const locations = ["top level", "summary", "group entry"] as const;
  const forbiddenKeys = ["unexpected", "records", "rawData", "row", "ID", "file", "sheet"];

  for (const location of locations) {
    for (const key of forbiddenKeys) {
      const invalid = cloneSafeResult();
      const target = location === "top level"
        ? invalid as Record<string, unknown>
        : location === "summary"
          ? invalid.summary as Record<string, unknown>
          : invalid.summary.groupCounts[0] as Record<string, unknown>;
      target[key] = key === "records" || key === "rawData" ? [{ respondentId: "private-row" }] : "private";
      assert.equal(isOpenSnaValidationResult(invalid), false, `${location} ${key}`);
    }
  }
});
