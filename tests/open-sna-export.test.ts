import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { OpenSnaResult } from "../lib/open-sna";
import {
  buildOpenSnaResearchFiles,
  createResearchZip,
  openSnaCsv,
  openSnaNetworkSvg,
  openSnaReportHtml,
  parseOpenSnaResultFile,
} from "../lib/open-sna-export";

function reference(): OpenSnaResult {
  return JSON.parse(readFileSync(new URL("../public/open-sna/programming-resilience-demo.json", import.meta.url), "utf8"));
}

test("reopening validates aggregate results and refuses source rows or malformed JSON", () => {
  const result = reference();
  assert.deepEqual(parseOpenSnaResultFile(JSON.stringify(result)), result);
  assert.throws(() => parseOpenSnaResultFile("not-json"), /INVALID_RESULT/);
  assert.throws(() => parseOpenSnaResultFile(JSON.stringify({ ...result, rows: [["private"]] })), /INVALID_RESULT/);
  assert.throws(() => parseOpenSnaResultFile(" ".repeat(2 * 1024 * 1024 + 1)), /RESULT_TOO_LARGE/);
});

test("CSV protects spreadsheet formulas in labels but preserves negative numeric statistics", () => {
  const csv = openSnaCsv(["label", "weight"], [["=HYPERLINK(\"https://invalid.test\")", -0.23], ["\t@SUM(A1)", 0.2], ["quote,\"line\nnext", null]]);
  assert.match(csv, /'=/);
  assert.match(csv, /'\t@SUM/);
  assert.match(csv, /,-0\.23\r\n/);
  assert.match(csv, /"quote,""line\nnext",/);
});

test("legacy exports disclose incomplete NCT evidence instead of calling the top-eight table complete", () => {
  const result = reference();
  const files = buildOpenSnaResearchFiles(result, "en");
  assert.ok(files.some(file => file.name === "open-sna-nct-preview.csv"));
  assert.ok(!files.some(file => file.name === "open-sna-nct-all-edges.csv"));
  const report = files.find(file => file.name === "open-sna-report.html")!.content;
  assert.match(report, /Incomplete NCT edge table/);
  assert.match(report, /8 of 120/);
  const manifest = JSON.parse(files.find(file => file.name === "manifest.json")!.content);
  assert.equal(manifest.nctEdgeTableComplete, false);
  assert.equal(manifest.rawRowsIncluded, false);
});

test("full NCT exports retain every pair and exact analysis provenance", () => {
  const result = reference();
  const full = [];
  for (let first = 0; first < result.nodes.length; first += 1) {
    for (let second = first + 1; second < result.nodes.length; second += 1) {
      full.push({ source: result.nodes[first].id, target: result.nodes[second].id, absoluteDifference: 0.01, pValueHolm: 0.75 });
    }
  }
  const modern = { ...result, schemaVersion: "1.2", subgroupComparison: { ...result.subgroupComparison, edgeDifferences: full, strongestEdgeDifferences: full.slice(0, 8) } } as OpenSnaResult;
  assert.deepEqual(parseOpenSnaResultFile(JSON.stringify(modern)), modern);
  const files = buildOpenSnaResearchFiles(modern, "zh-hans");
  const csv = files.find(file => file.name === "open-sna-nct-all-edges.csv")!.content;
  assert.equal(csv.trim().split("\r\n").length, 121);
  const manifest = JSON.parse(files.find(file => file.name === "manifest.json")!.content);
  assert.equal(manifest.nctEdgeTableComplete, true);
  const config = JSON.parse(files.find(file => file.name === "analysis-config.json")!.content);
  assert.equal(config.settings.seed, result.settings.seed);
  assert.deepEqual(config.runtime, result.runtime);
  assert.ok(files.some(file => file.name === "reproduce.R"));
});

test("network SVG contains every edge and node, uses explicit colors, and escapes source labels", () => {
  const result = reference();
  result.nodes[0].label = '<script>alert("x")</script>';
  const svg = openSnaNetworkSvg(result, "en");
  assert.equal((svg.match(/data-edge=/g) ?? []).length, result.edges.length);
  assert.equal((svg.match(/data-node=/g) ?? []).length, result.nodes.length);
  assert.doesNotMatch(svg, /<script|var\(--|<foreignObject|https?:\/\/[^w]/);
  assert.match(svg, /&lt;script&gt;/);
  assert.match(svg, /viewBox="0 0 1200 /);
});

test("report is self-contained, escaped and includes full methods, warnings, and tables in every locale", () => {
  const result = reference();
  result.warnings.push('<img src=x onerror="alert(1)">');
  for (const locale of ["en", "zh-hant", "zh-hans"] as const) {
    const html = openSnaReportHtml(result, locale);
    assert.match(html, /<!doctype html>/i);
    assert.match(html, /@media print/);
    assert.match(html, /EBICglasso/);
    assert.match(html, /0\.5/);
    assert.match(html, /811/);
    assert.match(html, /&lt;img/);
    assert.doesNotMatch(html, /<script|<img src=x|<link[^>]+href=/);
  }
});

test("research ZIP contains UTF-8 files and a complete central directory", () => {
  const bytes = createResearchZip([{ name: "manifest.json", content: '{"ok":true}', type: "application/json" }, { name: "notes.txt", content: "量表研究", type: "text/plain" }]);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  assert.equal(view.getUint32(0, true), 0x04034b50);
  assert.equal(view.getUint16(6, true), 0x0800);
  assert.equal(view.getUint32(bytes.length - 22, true), 0x06054b50);
  assert.equal(view.getUint16(bytes.length - 12, true), 2);
  const directoryOffset = view.getUint32(bytes.length - 6, true);
  assert.equal(view.getUint32(directoryOffset, true), 0x02014b50);
  assert.match(new TextDecoder().decode(bytes), /量表研究/);
  assert.throws(() => createResearchZip([{ name: "../unsafe", content: "", type: "text/plain" }]), /INVALID_ARCHIVE_PATH/);
});
