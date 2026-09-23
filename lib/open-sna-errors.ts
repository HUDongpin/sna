import type { Locale } from "@/lib/locales";
import { getOpenSnaCopy } from "@/lib/open-sna-copy";

type OpenSnaErrorPayload = { code?: unknown };

export const OPEN_SNA_GENERIC_ANALYSIS_ERROR_MESSAGE = getOpenSnaCopy("en").errors.generic;
export const OPEN_SNA_ANALYSIS_FAILED_MESSAGE = getOpenSnaCopy("en").errors.R_ANALYSIS_FAILED;

export function openSnaAnalysisErrorMessage(status: number, payload: unknown, locale: Locale = "en") {
  const code = payload && typeof payload === "object" ? (payload as OpenSnaErrorPayload).code : undefined;
  const errors = getOpenSnaCopy(locale).errors;
  if (status === 429 && code === "WORKER_BUSY") return errors.WORKER_BUSY;
  if ((status === 500 || status === 502) && code === "R_ANALYSIS_FAILED") return errors.R_ANALYSIS_FAILED;
  if (status === 502 && code === "R_ENGINE_UNAVAILABLE") return errors.R_ENGINE_UNAVAILABLE;
  if (status === 502 && code === "R_ENGINE_CONTRACT_FAILED") return errors.R_ENGINE_CONTRACT_FAILED;
  if (status === 503 && code === "R_ENGINE_DISABLED") return errors.R_ENGINE_DISABLED;
  if (status === 503 && code === "R_ENGINE_NOT_CONFIGURED") return errors.R_ENGINE_NOT_CONFIGURED;
  if (status === 503 && code === "R_ENGINE_CONFIGURATION_INVALID") return errors.R_ENGINE_CONFIGURATION_INVALID;
  if (status === 504 && code === "R_ANALYSIS_TIMEOUT") return errors.R_ANALYSIS_TIMEOUT;
  if (status === 422 && code === "WORKBOOK_INVALID") return errors.WORKBOOK_INVALID;
  if (status === 404 && code === "JOB_NOT_FOUND") return errors.JOB_NOT_FOUND;
  return errors.generic;
}

export async function decodeOpenSnaAnalysisResponse(response: Response, locale: Locale = "en"): Promise<
  { ok: true; payload: unknown } | { ok: false; message: string }
> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, message: getOpenSnaCopy(locale).errors.generic };
  }
  if (!response.ok) return { ok: false, message: openSnaAnalysisErrorMessage(response.status, payload, locale) };
  return { ok: true, payload };
}
