#!/usr/bin/env node

import { writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
const outputIndex = args.indexOf("--output");
const outputPath = outputIndex >= 0 ? args[outputIndex + 1] : undefined;
const expectedRLibrary = process.env.OPEN_SNA_TEST_EXPECT_R_LIBS_USER;
const configuredRLibrary = process.env.R_LIBS_USER;
const rLibraryMismatch = Boolean(expectedRLibrary && configuredRLibrary !== expectedRLibrary);
const code = rLibraryMismatch
  ? "R_ANALYSIS_FAILED"
  : process.env.OPEN_SNA_TEST_FAILURE_CODE || "R_ANALYSIS_FAILED";
const delayMilliseconds = Number(process.env.OPEN_SNA_TEST_DELAY_MS || 0);
if (Number.isFinite(delayMilliseconds) && delayMilliseconds > 0) {
  await new Promise((resolve) => setTimeout(resolve, delayMilliseconds));
}
if (process.env.OPEN_SNA_TEST_OUTPUT_JSON !== undefined && !rLibraryMismatch) {
  if (!outputPath) throw new Error("The fake Open SNA R worker requires --output when returning JSON.");
  await writeFile(outputPath, process.env.OPEN_SNA_TEST_OUTPUT_JSON, "utf8");
  process.exit(0);
}
process.stderr.write(`OPEN_SNA_ERROR_CODE=${code}\n`);
process.stderr.write("Open SNA analysis failed: deterministic route-test fixture\n");
process.exit(1);
