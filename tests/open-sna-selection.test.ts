import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import * as contracts from "../lib/open-sna-workbook-validation";
import { isOpenSnaResult } from "../lib/open-sna";

const selection = {
  items: Array.from({ length: 6 }, (_, index) => ({
    column: `問卷題目 ${index + 1}`, id: `Q${index + 1}`, community: index < 3 ? "First" : "Second", reverse: index === 0,
  })),
  groupColumn: "組別",
};
const inspection = {
  schemaVersion: "1.0", inputFingerprint: `sha256:${"a".repeat(64)}`, originalRows: 80,
  columns: [
    ...selection.items.map((item) => ({ name: item.column, missingCount: 0, eligibleItem: true, eligibleGroup: false, suggestedCommunity: item.community })),
    { name: selection.groupColumn, missingCount: 0, eligibleItem: false, eligibleGroup: true, suggestedCommunity: null },
  ],
  suggestedSelection: selection,
};

test("selection accepts bounded Unicode source headers and explicit reverse/community mapping", () => {
  assert.equal(typeof contracts.isOpenSnaSelection, "function", "selection guard must be exported");
  assert.equal(contracts.isOpenSnaSelection(selection), true);
});

test("selection rejects ambiguous, unsafe, oversized and unbalanced mappings", () => {
  assert.equal(typeof contracts.isOpenSnaSelection, "function");
  const mutations = [
    (x: typeof selection) => { x.items[1].column = x.items[0].column; },
    (x: typeof selection) => { x.items[1].id = x.items[0].id; },
    (x: typeof selection) => { x.groupColumn = x.items[0].column; },
    (x: typeof selection) => { x.items[0].id = "Q,1"; },
    (x: typeof selection) => { x.items[0].community = "=cmd"; },
    (x: typeof selection) => { x.items[0].community = "Second"; },
    (x: typeof selection) => { x.items[0].column = "x".repeat(121); },
    (x: typeof selection) => { x.items[0].column = "bad\nheader"; },
    (x: typeof selection) => { x.items[0].column = " padded "; },
    (x: typeof selection) => { x.items.pop(); },
    (x: typeof selection) => { Object.assign(x.items[0], { reverse: "false" }); },
    (x: typeof selection) => { Object.assign(x, { rows: ["private"] }); },
    (x: typeof selection) => { Object.assign(x.items[0], { rawData: [1, 2] }); },
  ];
  for (const mutate of mutations) {
    const value = structuredClone(selection); mutate(value);
    assert.equal(contracts.isOpenSnaSelection(value), false);
  }
  let invoked = false;
  const getter = structuredClone(selection);
  Object.defineProperty(getter.items[0], "column", { enumerable: true, get: () => { invoked = true; throw new Error("getter"); } });
  assert.equal(contracts.isOpenSnaSelection(getter), false);
  assert.equal(invoked, false);
  assert.equal(contracts.isOpenSnaSelection(new Proxy({}, { ownKeys: () => { throw new Error("proxy"); } })), false);
  const inheritedArray = structuredClone(selection);
  Object.setPrototypeOf(inheritedArray.items, Object.create(Array.prototype));
  assert.equal(contracts.isOpenSnaSelection(inheritedArray), false, "custom array prototypes cannot supply inherited behavior");
});

test("inspection is exact aggregate metadata with consistent suggested selection", () => {
  assert.equal(typeof contracts.isOpenSnaInspectionResult, "function", "inspection guard must be exported");
  assert.equal(contracts.isOpenSnaInspectionResult(inspection), true);
  assert.equal(contracts.isOpenSnaInspectionResult({ ...inspection, suggestedSelection: null }), true);
  for (const mutate of [
    (x: typeof inspection) => { x.columns[0].missingCount = 81; },
    (x: typeof inspection) => { x.columns[0].name = x.columns[1].name; },
    (x: typeof inspection) => { x.columns[0].eligibleItem = false; },
    (x: typeof inspection) => { x.columns[6].eligibleGroup = false; },
    (x: typeof inspection) => { x.originalRows = 5001; },
    (x: typeof inspection) => { Object.assign(x.columns[0], { values: [1, 2] }); },
    (x: typeof inspection) => { Object.assign(x, { fileName: "private.xlsx" }); },
  ]) {
    const value = structuredClone(inspection); mutate(value);
    assert.equal(contracts.isOpenSnaInspectionResult(value), false);
  }
});

test("mapped validation requires selection consistent with summary and preserves legacy contract", () => {
  const validation = {
    schemaVersion: "1.1", valid: true, inputFingerprint: inspection.inputFingerprint, selection,
    summary: { originalRows: 80, analyzedRows: 80, droppedRows: 0, itemCount: 6, communityCount: 2, groupColumn: "組別", groupCounts: [{ group: "A", n: 40 }, { group: "B", n: 40 }] },
  };
  assert.equal(contracts.isOpenSnaValidationResult(validation), true);
  assert.equal(contracts.isOpenSnaValidationResult({ ...validation, selection: undefined }), false);
  assert.equal(contracts.isOpenSnaValidationResult({ ...validation, summary: { ...validation.summary, itemCount: 7 } }), false);
  assert.equal(contracts.isOpenSnaValidationResult({ ...validation, summary: { ...validation.summary, groupColumn: "Other" } }), false);
});

test("result 1.2 requires every unordered NCT edge and internally consistent selection", () => {
  const result = JSON.parse(readFileSync(new URL("../public/open-sna/programming-resilience-demo.json", import.meta.url), "utf8"));
  assert.equal(isOpenSnaResult(result), true, "legacy aggregate remains readable");
  result.schemaVersion = "1.2";
  assert.equal(isOpenSnaResult(result), false, "full NCT cannot be fabricated for legacy");
  const differences = result.subgroupComparison.strongestEdgeDifferences;
  const byPair = new Map(differences.map((edge: {source: string; target: string}) => [[edge.source, edge.target].sort().join("::"), edge]));
  result.subgroupComparison.edgeDifferences = result.nodes.flatMap((node: {id: string}, index: number) => result.nodes.slice(index + 1).map((other: {id: string}) => byPair.get([node.id, other.id].sort().join("::")) ?? { source: node.id, target: other.id, absoluteDifference: 0, pValueHolm: 1 }));
  assert.equal(isOpenSnaResult(result), true);
  result.source.selection = { groupColumn: result.source.groupColumn, items: result.nodes.map((node: {id: string; community: string}) => ({ column: `Original ${node.id}`, id: node.id, community: node.community, reverse: false })) };
  assert.equal(isOpenSnaResult(result), true);
  result.source.selection.items[0].id = "Unknown";
  assert.equal(isOpenSnaResult(result), false);
  delete result.source.selection;
  result.subgroupComparison.edgeDifferences.pop();
  assert.equal(isOpenSnaResult(result), false);
});

test("legacy imported aggregate results retain bounded safe node metadata", () => {
  const demo = JSON.parse(readFileSync(new URL("../public/open-sna/programming-resilience-demo.json", import.meta.url), "utf8"));
  for (const mutate of [
    (result: typeof demo) => { result.nodes[0].label = "x".repeat(121); },
    (result: typeof demo) => { result.nodes[0].community = "<unsafe>"; },
    (result: typeof demo) => { result.source.originalRows = 5001; result.source.droppedRows = 5001 - result.source.analyzedRows; },
  ]) {
    const value = structuredClone(demo); mutate(value);
    assert.equal(isOpenSnaResult(value), false);
  }
});
