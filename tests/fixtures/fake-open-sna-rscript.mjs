#!/usr/bin/env node

const expectedRLibrary = process.env.OPEN_SNA_TEST_EXPECT_R_LIBS_USER;
const configuredRLibrary = process.env.R_LIBS_USER;
const code = expectedRLibrary && configuredRLibrary !== expectedRLibrary
  ? "R_ANALYSIS_FAILED"
  : process.env.OPEN_SNA_TEST_FAILURE_CODE || "R_ANALYSIS_FAILED";
const delayMilliseconds = Number(process.env.OPEN_SNA_TEST_DELAY_MS || 0);
if (Number.isFinite(delayMilliseconds) && delayMilliseconds > 0) {
  await new Promise((resolve) => setTimeout(resolve, delayMilliseconds));
}
process.stderr.write(`OPEN_SNA_ERROR_CODE=${code}\n`);
process.stderr.write("Open SNA analysis failed: deterministic route-test fixture\n");
process.exit(1);
