import { getOpenSnaCopy } from "@/lib/open-sna-copy";
import type { Locale } from "@/lib/i18n";

type OpenSnaErrorPayload = {
  code?: unknown;
  detail?: unknown;
};

export const OPEN_SNA_GENERIC_ANALYSIS_ERROR_MESSAGE = getOpenSnaCopy("en").errors.generic;

export const OPEN_SNA_ANALYSIS_FAILED_MESSAGE = getOpenSnaCopy("en").errors.R_ANALYSIS_FAILED;

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

export function openSnaAnalysisErrorMessage(status: number, payload: unknown, locale: Locale = "en") {
  const errors = getOpenSnaCopy(locale).errors;
  const code = payload && typeof payload === "object"
    ? (payload as OpenSnaErrorPayload).code
    : undefined;
  const detail = payload && typeof payload === "object"
    ? safeOpenSnaAnalysisDetail((payload as OpenSnaErrorPayload).detail)
    : null;

  if (status === 429 && code === "WORKER_BUSY") {
    return errors.WORKER_BUSY;
  }
  if ((status === 500 || status === 502) && code === "R_ANALYSIS_FAILED") {
    if (!detail) return errors.R_ANALYSIS_FAILED;
    const combined = `${errors.R_ANALYSIS_FAILED} ${detail}`;
    return combined.length <= 240 ? combined : errors.R_ANALYSIS_FAILED;
  }
  if (status === 502 && code === "R_ENGINE_UNAVAILABLE") {
    return errors.R_ENGINE_UNAVAILABLE;
  }
  if (status === 502 && code === "R_ENGINE_CONTRACT_FAILED") {
    return errors.R_ENGINE_CONTRACT_FAILED;
  }
  if (status === 503 && code === "R_ENGINE_DISABLED") {
    return errors.R_ENGINE_DISABLED;
  }
  if (status === 503 && code === "R_ENGINE_NOT_CONFIGURED") {
    return errors.R_ENGINE_NOT_CONFIGURED;
  }
  if (status === 503 && code === "R_ENGINE_CONFIGURATION_INVALID") {
    return errors.R_ENGINE_CONFIGURATION_INVALID;
  }
  if (status === 504 && code === "R_ANALYSIS_TIMEOUT") {
    return errors.R_ANALYSIS_TIMEOUT;
  }
  if (status === 422 && code === "WORKBOOK_INVALID") {
    return errors.WORKBOOK_INVALID;
  }
  if (status === 404 && code === "JOB_NOT_FOUND") {
    return errors.JOB_NOT_FOUND;
  }
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

  if (!response.ok) {
    return { ok: false, message: openSnaAnalysisErrorMessage(response.status, payload, locale) };
  }
  return { ok: true, payload };
}
