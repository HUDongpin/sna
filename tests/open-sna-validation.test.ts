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
    { name: "40 items cannot form two communities of at most 12", mutate: (result) => { result.summary.communityCount = 2; } },
    { name: "6 items cannot form three communities of at least 3", mutate: (result) => { result.summary.itemCount = 6; result.summary.communityCount = 3; } },
    { name: "25 items cannot form two communities of at most 12", mutate: (result) => { result.summary.itemCount = 25; result.summary.communityCount = 2; } },
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

test("Open SNA validation accepts feasible community boundaries", () => {
  const minimum = cloneSafeResult();
  minimum.summary.itemCount = 6;
  minimum.summary.communityCount = 2;
  assert.equal(isOpenSnaValidationResult(minimum), true);

  const maximum = cloneSafeResult();
  maximum.summary.itemCount = 24;
  maximum.summary.communityCount = 2;
  assert.equal(isOpenSnaValidationResult(maximum), true);
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

test("Open SNA validation accepts null-prototype data records and rejects hostile values without throwing", () => {
  const toNullPrototype = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(toNullPrototype);
    if (value !== null && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, toNullPrototype(entry)]));
    }
    return value;
  };
  const nullPrototype = toNullPrototype(cloneSafeResult()) as Record<string, unknown>;
  Object.setPrototypeOf(nullPrototype, null);
  Object.setPrototypeOf(nullPrototype.summary as object, null);
  for (const group of (nullPrototype.summary as { groupCounts: object[] }).groupCounts) Object.setPrototypeOf(group, null);
  assert.equal(isOpenSnaValidationResult(nullPrototype), true, "null-prototype records are valid data records");

  class ResultEnvelope {}
  const classPrototype = Object.assign(new ResultEnvelope(), cloneSafeResult());
  assert.equal(isOpenSnaValidationResult(classPrototype), false, "class instances are rejected");

  const inherited = Object.create(cloneSafeResult());
  assert.equal(isOpenSnaValidationResult(inherited), false, "inherited required fields are rejected");

  const nonEnumerable = cloneSafeResult() as Record<string, unknown>;
  Object.defineProperty(nonEnumerable, "private", { value: "hidden", enumerable: false });
  assert.equal(isOpenSnaValidationResult(nonEnumerable), false, "non-enumerable extras are rejected");

  const symbolExtra = cloneSafeResult() as Record<PropertyKey, unknown>;
  symbolExtra[Symbol("private")] = "hidden";
  assert.equal(isOpenSnaValidationResult(symbolExtra), false, "symbol extras are rejected");

  const getter = cloneSafeResult();
  Object.defineProperty(getter.summary, "groupColumn", { enumerable: true, get: () => { throw new Error("must not read getter"); } });
  assert.doesNotThrow(() => assert.equal(isOpenSnaValidationResult(getter), false), "accessors are rejected without invocation");

  const sparse = cloneSafeResult();
  delete sparse.summary.groupCounts[1];
  assert.doesNotThrow(() => assert.equal(isOpenSnaValidationResult(sparse), false), "sparse tuples are rejected without throwing");

  const throwingProxy = new Proxy({}, { ownKeys: () => { throw new Error("hostile ownKeys"); } });
  assert.doesNotThrow(() => assert.equal(isOpenSnaValidationResult(throwingProxy), false), "hostile proxies return false");
});
