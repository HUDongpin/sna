type OpenSnaErrorPayload = {
  code?: unknown;
  detail?: unknown;
};

export const OPEN_SNA_GENERIC_ANALYSIS_ERROR_MESSAGE =
  "The workbook could not be analyzed. Try again later or inspect the aggregate reference result.";

export const OPEN_SNA_ANALYSIS_FAILED_MESSAGE =
  "The R analysis engine failed before producing a valid result. Try again later. (R_ANALYSIS_FAILED)";

export function safeOpenSnaAnalysisDetail(value: unknown) {
  if (typeof value !== "string") return null;
  const detail = value.trim().slice(0, 180);
  if (!detail) return null;
  if (/https?:\/\//i.test(detail) || /[<>]/.test(detail) || /(?:\/(?:tmp|var\/tmp|app|opt|home|Users)\/)/.test(detail)) {
    return null;
  }
  if (!/^[A-Za-z0-9[\]'" .,;:()/+_-]+$/.test(detail)) return null;
  return detail;
}

export function openSnaAnalysisErrorMessage(status: number, payload: unknown) {
  const code = payload && typeof payload === "object"
    ? (payload as OpenSnaErrorPayload).code
    : undefined;
  const detail = payload && typeof payload === "object"
    ? safeOpenSnaAnalysisDetail((payload as OpenSnaErrorPayload).detail)
    : null;

  if (status === 429 && code === "WORKER_BUSY") {
    return "Another analysis is already running. Wait for it to finish, then try again. (WORKER_BUSY)";
  }
  if ((status === 500 || status === 502) && code === "R_ANALYSIS_FAILED") {
    if (!detail) return OPEN_SNA_ANALYSIS_FAILED_MESSAGE;
    const combined = `${OPEN_SNA_ANALYSIS_FAILED_MESSAGE} ${detail}`;
    return combined.length <= 240 ? combined : OPEN_SNA_ANALYSIS_FAILED_MESSAGE;
  }
  if (status === 502 && code === "R_ENGINE_UNAVAILABLE") {
    return "The R analysis service is temporarily unavailable. Try again later. (R_ENGINE_UNAVAILABLE)";
  }
  if (status === 502 && code === "R_ENGINE_CONTRACT_FAILED") {
    return "The R analysis service returned a result that could not be used. Try again later. (R_ENGINE_CONTRACT_FAILED)";
  }
  if (status === 503 && code === "R_ENGINE_DISABLED") {
    return "Public workbook analysis is temporarily disabled. You can still inspect the aggregate reference result. (R_ENGINE_DISABLED)";
  }
  if (status === 503 && code === "R_ENGINE_NOT_CONFIGURED") {
    return "Public workbook analysis is not configured on this deployment. You can still inspect the aggregate reference result. (R_ENGINE_NOT_CONFIGURED)";
  }
  if (status === 503 && code === "R_ENGINE_CONFIGURATION_INVALID") {
    return "The production R analysis service is configured incorrectly. You can still inspect the aggregate reference result. (R_ENGINE_CONFIGURATION_INVALID)";
  }
  if (status === 504 && code === "R_ANALYSIS_TIMEOUT") {
    return "The analysis exceeded the service time limit. Try fewer bootstrap replicates, a smaller workbook, or retry later. (R_ANALYSIS_TIMEOUT)";
  }
  if (status === 422 && code === "WORKBOOK_INVALID") {
    return "The workbook is not valid for Open SNA. Check its worksheet, item columns, grouping column, and analyzed group sizes. (WORKBOOK_INVALID)";
  }
  return OPEN_SNA_GENERIC_ANALYSIS_ERROR_MESSAGE;
}

export async function decodeOpenSnaAnalysisResponse(response: Response): Promise<
  { ok: true; payload: unknown } | { ok: false; message: string }
> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, message: OPEN_SNA_GENERIC_ANALYSIS_ERROR_MESSAGE };
  }

  if (!response.ok) {
    return { ok: false, message: openSnaAnalysisErrorMessage(response.status, payload) };
  }
  return { ok: true, payload };
}
