import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GET } from "../app/api/open-sna/route";
import { decodeOpenSnaAnalysisResponse } from "../lib/open-sna-errors";
import {
  OPEN_SNA_SAMPLE_GROUP_SIZE,
  OPEN_SNA_SAMPLE_NOTE,
  OPEN_SNA_SAMPLE_ROW_COUNT,
  OPEN_SNA_SAMPLE_SEED,
  buildProgrammingResilienceSampleRows,
  buildProgrammingResilienceSampleXlsx,
  openSnaSampleModel,
} from "../scripts/generate-open-sna-sample";

function zipTextEntries(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = new Map<string, string>();
  let offset = 0;
  while (offset + 30 <= bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true);
    const compressedSize = view.getUint32(offset + 18, true);
    const nameLength = view.getUint16(offset + 26, true);
    const extraLength = view.getUint16(offset + 28, true);
    const nameStart = offset + 30;
    const name = Buffer.from(bytes.subarray(nameStart, nameStart + nameLength)).toString("utf8");
    const dataStart = nameStart + nameLength + extraLength;
    const compressed = bytes.subarray(dataStart, dataStart + compressedSize);
    const raw = method === 0 ? compressed : inflateRawSync(compressed);
    files.set(name, Buffer.from(raw).toString("utf8"));
    offset = dataStart + compressedSize;
  }
  return files;
}

test("reviewed sample is reproducible and has distinct synthetic item columns", () => {
  const workbook = buildProgrammingResilienceSampleXlsx();
  assert.deepEqual(readFileSync(new URL("../public/open-sna/programming-resilience-sample.xlsx", import.meta.url)), Buffer.from(workbook));
  const rows = buildProgrammingResilienceSampleRows();
  assert.equal(OPEN_SNA_SAMPLE_SEED, 2026);
  assert.equal(OPEN_SNA_SAMPLE_ROW_COUNT, 360);
  assert.equal(OPEN_SNA_SAMPLE_GROUP_SIZE, 180);
  assert.equal(rows.length, OPEN_SNA_SAMPLE_ROW_COUNT);
  assert.equal(new Set(Array.from({length:16},(_,column)=>rows.map(row=>row[column]).join(","))).size,16);
  assert.equal(rows.filter(row=>row[16]==="F").length, OPEN_SNA_SAMPLE_GROUP_SIZE);
  assert.equal(rows.filter(row=>row[16]==="M").length, OPEN_SNA_SAMPLE_GROUP_SIZE);
  assert.ok(rows.every((row) => row.slice(0, 16).every((value) => typeof value === "number" && value >= 1 && value <= 5 && value === Math.round(value))));
  const model = openSnaSampleModel();
  assert.equal(model.scale, 1);
  assert.ok(model.minimumEigenvalue >= 0.05);
  assert.ok(model.edges.length >= 12);
  assert.ok(model.edges.filter((edge) => edge.relationship === "between-community").length >= 4);
  assert.ok(model.edges.every((edge) => edge.partialCorrelation >= 0.3));
  const entries = zipTextEntries(workbook);
  assert.match(entries.get("docProps/core.xml") ?? "", /Synthetic sample/);
  assert.match(entries.get("xl/comments1.xml") ?? "", /not empirical observations and contain no respondent data/);
  assert.match(entries.get("xl/comments1.xml") ?? "", new RegExp(OPEN_SNA_SAMPLE_NOTE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.ok(workbook.byteLength < 80_000);
});

test("API root returns a JSON 404 and bounded analysis messages ignore raw diagnostics", async () => {
  const root = GET();
  assert.equal(root.status,404);
  assert.equal((await root.json()).code,"NOT_FOUND");
  for (const [status, code] of [[500,"R_ANALYSIS_FAILED"],[502,"R_ANALYSIS_FAILED"],[502,"R_ENGINE_CONTRACT_FAILED"]] as const) {
    const decoded=await decodeOpenSnaAnalysisResponse(Response.json({code,error:"private row data",detail:"private row data"},{status}));
    assert.equal(decoded.ok,false);
    if (!decoded.ok) { assert.ok(decoded.message.includes(code)); assert.doesNotMatch(decoded.message,/private row/); }
  }
  const html=await decodeOpenSnaAnalysisResponse(new Response("<html>gateway error</html>",{status:502}));
  assert.equal(html.ok,false);
  if (!html.ok) assert.doesNotMatch(html.message,/<html>/);
});
