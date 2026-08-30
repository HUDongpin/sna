type OpenSnaErrorPayload = {
  code?: unknown;
};

export function openSnaAnalysisErrorMessage(status: number, payload: unknown) {
  const code = payload && typeof payload === "object"
    ? (payload as OpenSnaErrorPayload).code
    : undefined;

  if (status === 429 && code === "WORKER_BUSY") {
    return "Another analysis is already running. Wait for it to finish, then try again. (WORKER_BUSY)";
  }
  if (status === 502 && code === "R_ENGINE_UNAVAILABLE") {
    return "The R analysis service is temporarily unavailable. Try again later. (R_ENGINE_UNAVAILABLE)";
  }
  if (status === 503 && code === "R_ENGINE_DISABLED") {
    return "Public workbook analysis is temporarily disabled. You can still inspect the aggregate reference result. (R_ENGINE_DISABLED)";
  }
  if (status === 503 && code === "R_ENGINE_NOT_CONFIGURED") {
    return "Public workbook analysis is not configured on this deployment. You can still inspect the aggregate reference result. (R_ENGINE_NOT_CONFIGURED)";
  }
  if (status === 504 && code === "R_ANALYSIS_TIMEOUT") {
    return "The analysis exceeded the service time limit. Try fewer bootstrap replicates, a smaller workbook, or retry later. (R_ANALYSIS_TIMEOUT)";
  }
  if (status === 422 && code === "WORKBOOK_INVALID") {
    return "The workbook is not valid for Open SNA. Check its worksheet, item columns, grouping column, and analyzed group sizes. (WORKBOOK_INVALID)";
  }
  return "The workbook could not be analyzed. Try again later or inspect the aggregate reference result.";
}
