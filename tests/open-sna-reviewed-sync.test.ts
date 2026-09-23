import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { GET } from "../app/api/open-sna/route";
import { decodeOpenSnaAnalysisResponse } from "../lib/open-sna-errors";
import { buildProgrammingResilienceSampleRows, buildProgrammingResilienceSampleXlsx } from "./helpers/minimal-xlsx";

test("reviewed sample is reproducible and has distinct synthetic item columns", () => {
  assert.deepEqual(readFileSync(new URL("../public/open-sna/programming-resilience-sample.xlsx", import.meta.url)), Buffer.from(buildProgrammingResilienceSampleXlsx()));
  const rows = buildProgrammingResilienceSampleRows();
  assert.equal(rows.length, 50);
  assert.equal(new Set(Array.from({length:16},(_,column)=>rows.map(row=>row[column]).join(","))).size,16);
  assert.equal(rows.filter(row=>row[16]==="F").length,25);
  assert.equal(rows.filter(row=>row[16]==="M").length,25);
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
