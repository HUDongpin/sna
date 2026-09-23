import type { Locale } from "@/lib/i18n";
import { isOpenSnaResult, type OpenSnaResult } from "@/lib/open-sna";
import { getOpenSnaCopy } from "@/lib/open-sna-copy";
import {
  decodeOpenSnaAnalysisResponse,
  openSnaAnalysisErrorMessage,
} from "@/lib/open-sna-errors";
import { isOpenSnaJobPending, OPEN_SNA_JOB_QUERY, parseOpenSnaJobId, type OpenSnaJobId } from "@/lib/open-sna-job";

export const OPEN_SNA_JOB_POLL_INTERVAL_MS = 2_000;
export const OPEN_SNA_JOB_CLIENT_DEADLINE_MS = 25 * 60 * 1000;

export type OpenSnaAnalysisOutcome =
  | { ok: true; result: OpenSnaResult }
  | { ok: false; message: string };

type JobClientOptions = {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  pollIntervalMs?: number;
  deadlineMs?: number;
  locale?: Locale;
};

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitForOpenSnaJob(
  jobId: OpenSnaJobId,
  options: JobClientOptions = {},
): Promise<OpenSnaAnalysisOutcome> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;
  const pollIntervalMs = options.pollIntervalMs ?? OPEN_SNA_JOB_POLL_INTERVAL_MS;
  const deadlineMs = options.deadlineMs ?? OPEN_SNA_JOB_CLIENT_DEADLINE_MS;
  const deadlineAt = now() + deadlineMs;
  const locale = options.locale ?? "en";
  const genericMessage = getOpenSnaCopy(locale).errors.generic;

  while (now() <= deadlineAt) {
    const response = await fetchImpl(`/api/open-sna/analyze?${OPEN_SNA_JOB_QUERY}=${jobId}`, {
      method: "GET",
      cache: "no-store",
    });
    const decoded = await decodeOpenSnaAnalysisResponse(response, locale);
    if (!decoded.ok) return decoded;
    if (isOpenSnaResult(decoded.payload)) return { ok: true, result: decoded.payload };
    if (isOpenSnaJobPending(decoded.payload) && decoded.payload.jobId === jobId) {
      if (now() + pollIntervalMs > deadlineAt) break;
      await sleep(pollIntervalMs);
      continue;
    }
    return { ok: false, message: genericMessage };
  }

  return {
    ok: false,
    message: openSnaAnalysisErrorMessage(504, { code: "R_ANALYSIS_TIMEOUT" }, locale),
  };
}

export async function runOpenSnaWorkbookAnalysis(
  formData: FormData,
  options: JobClientOptions = {},
): Promise<OpenSnaAnalysisOutcome> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const locale = options.locale ?? "en";
  const response = await fetchImpl("/api/open-sna/analyze", { method: "POST", body: formData });
  const decoded = await decodeOpenSnaAnalysisResponse(response, locale);
  if (!decoded.ok) return decoded;
  if (isOpenSnaResult(decoded.payload)) return { ok: true, result: decoded.payload };
  const jobId = isOpenSnaJobPending(decoded.payload) ? parseOpenSnaJobId(decoded.payload.jobId) : null;
  if (!jobId) return { ok: false, message: getOpenSnaCopy(locale).errors.generic };
  return waitForOpenSnaJob(jobId, { ...options, fetchImpl, locale });
}
