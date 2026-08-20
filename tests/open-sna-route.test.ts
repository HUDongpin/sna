import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { POST } from "../app/api/open-sna/analyze/route";

const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));
const fakeRscript = path.join(repositoryRoot, "tests", "fixtures", "fake-open-sna-rscript.mjs");
const xlsxMime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function analysisRequest() {
  const formData = new FormData();
  formData.set(
    "workbook",
    new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], "fixture.xlsx", { type: xlsxMime }),
  );
  formData.set("bootstraps", "100");
  formData.set("permutations", "1000");
  return new Request("http://localhost/api/open-sna/analyze", { method: "POST", body: formData });
}

test("the upload route distinguishes R runtime, workbook, and analysis failures", async () => {
  const environmentKeys = [
    "OPEN_SNA_RSCRIPT_BIN",
    "OPEN_SNA_R_LIBS_USER",
    "OPEN_SNA_TMP_ROOT",
    "OPEN_SNA_R_API_URL",
    "OPEN_SNA_TEST_FAILURE_CODE",
    "OPEN_SNA_TEST_EXPECT_R_LIBS_USER",
    "R_LIBS_USER",
    "VERCEL",
  ] as const;
  const originalEnvironment = Object.fromEntries(
    environmentKeys.map((key) => [key, process.env[key]]),
  );

  process.env.OPEN_SNA_RSCRIPT_BIN = fakeRscript;
  process.env.OPEN_SNA_TMP_ROOT = path.join(repositoryRoot, "tmp", "open-sna-route-tests");
  delete process.env.OPEN_SNA_R_API_URL;
  delete process.env.OPEN_SNA_R_LIBS_USER;
  delete process.env.R_LIBS_USER;
  delete process.env.VERCEL;

  try {
    process.env.OPEN_SNA_TEST_EXPECT_R_LIBS_USER = path.join(repositoryRoot, "tmp", "r-library");
    process.env.OPEN_SNA_TEST_FAILURE_CODE = "WORKBOOK_INVALID";
    const localLibraryResponse = await POST(analysisRequest());
    const localLibraryPayload = await localLibraryResponse.json() as { code?: string };
    assert.equal(localLibraryResponse.status, 422);
    assert.equal(localLibraryPayload.code, "WORKBOOK_INVALID");
    delete process.env.OPEN_SNA_TEST_EXPECT_R_LIBS_USER;

    const cases = [
      {
        rCode: "R_RUNTIME_NOT_READY",
        status: 503,
        responseCode: "R_RUNTIME_NOT_READY",
        message: /runtime is not ready/i,
      },
      {
        rCode: "WORKBOOK_INVALID",
        status: 422,
        responseCode: "WORKBOOK_INVALID",
        message: /workbook could not be analyzed/i,
      },
      {
        rCode: "R_ANALYSIS_FAILED",
        status: 500,
        responseCode: "R_ANALYSIS_FAILED",
        message: /analysis engine failed/i,
      },
    ] as const;

    for (const expected of cases) {
      process.env.OPEN_SNA_TEST_FAILURE_CODE = expected.rCode;
      const response = await POST(analysisRequest());
      const payload = await response.json() as { code?: string; error?: string };

      assert.equal(response.status, expected.status, expected.rCode);
      assert.equal(payload.code, expected.responseCode, expected.rCode);
      assert.match(payload.error || "", expected.message, expected.rCode);
    }
  } finally {
    for (const key of environmentKeys) {
      const value = originalEnvironment[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
