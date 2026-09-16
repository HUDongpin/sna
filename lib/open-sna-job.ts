import { isOpenSnaResult, type OpenSnaResult } from "@/lib/open-sna";

export const OPEN_SNA_ASYNC_DELIVERY = "async";
export const OPEN_SNA_JOB_QUERY = "job";

const JOB_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type OpenSnaJobId = string & { readonly __openSnaJobId: unique symbol };
export type OpenSnaJobBootstraps = "100" | "500" | "1000";
export type OpenSnaJobStatus = "queued" | "running" | "succeeded" | "failed";

export type OpenSnaJobError = {
  code: string;
  status: number;
  error: string;
  detail?: string;
};

type OpenSnaJobBase = {
  id: OpenSnaJobId;
  createdAt: string;
  bootstraps: OpenSnaJobBootstraps;
  permutations: "1000";
  inputFingerprint: string;
};

export type OpenSnaJobQueued = OpenSnaJobBase & { status: "queued" };
export type OpenSnaJobRunning = OpenSnaJobBase & { status: "running"; startedAt: string };
export type OpenSnaJobSucceeded = OpenSnaJobBase & {
  status: "succeeded";
  startedAt: string;
  finishedAt: string;
  result: OpenSnaResult;
};
export type OpenSnaJobFailed = OpenSnaJobBase & {
  status: "failed";
  startedAt: string;
  finishedAt: string;
  error: OpenSnaJobError;
};

export type OpenSnaJob =
  | OpenSnaJobQueued
  | OpenSnaJobRunning
  | OpenSnaJobSucceeded
  | OpenSnaJobFailed;

export type OpenSnaJobPending = {
  jobId: OpenSnaJobId;
  status: "queued" | "running";
};

type WithoutResult<T> = T extends { result: OpenSnaResult } ? Omit<T, "result"> : T;
export type OpenSnaJobMeta = WithoutResult<OpenSnaJob>;

export function createOpenSnaJobId(value: string = crypto.randomUUID()): OpenSnaJobId {
  const parsed = parseOpenSnaJobId(value);
  if (!parsed) throw new Error("INVALID_OPEN_SNA_JOB_ID");
  return parsed;
}

export function parseOpenSnaJobId(value: unknown): OpenSnaJobId | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return JOB_ID_PATTERN.test(normalized) ? (normalized as OpenSnaJobId) : null;
}

export function isOpenSnaJobPending(value: unknown): value is OpenSnaJobPending {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as { jobId?: unknown; status?: unknown };
  const jobId = parseOpenSnaJobId(record.jobId);
  return Boolean(jobId) && (record.status === "queued" || record.status === "running");
}

export function isOpenSnaJobBootstraps(value: unknown): value is OpenSnaJobBootstraps {
  return value === "100" || value === "500" || value === "1000";
}

function isIsoTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function parseJobError(value: unknown): OpenSnaJobError | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as { code?: unknown; status?: unknown; error?: unknown; detail?: unknown };
  if (typeof record.code !== "string" || !record.code) return null;
  if (typeof record.status !== "number" || !Number.isInteger(record.status)) return null;
  if (typeof record.error !== "string" || !record.error) return null;
  if (record.detail !== undefined && typeof record.detail !== "string") return null;
  return {
    code: record.code,
    status: record.status,
    error: record.error,
    ...(record.detail ? { detail: record.detail } : {}),
  };
}

export function parseOpenSnaJobMeta(value: unknown): OpenSnaJobMeta | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as {
    id?: unknown;
    status?: unknown;
    createdAt?: unknown;
    bootstraps?: unknown;
    permutations?: unknown;
    inputFingerprint?: unknown;
    startedAt?: unknown;
    finishedAt?: unknown;
    error?: unknown;
  };
  const id = parseOpenSnaJobId(record.id);
  if (
    !id ||
    !isIsoTimestamp(record.createdAt) ||
    !isOpenSnaJobBootstraps(record.bootstraps) ||
    record.permutations !== "1000" ||
    typeof record.inputFingerprint !== "string" ||
    !/^sha256:[a-f0-9]{64}$/.test(record.inputFingerprint)
  ) {
    return null;
  }

  const base: OpenSnaJobBase = {
    id,
    createdAt: record.createdAt,
    bootstraps: record.bootstraps,
    permutations: "1000",
    inputFingerprint: record.inputFingerprint,
  };

  switch (record.status) {
    case "queued":
      return { ...base, status: "queued" };
    case "running":
      return isIsoTimestamp(record.startedAt)
        ? { ...base, status: "running", startedAt: record.startedAt }
        : null;
    case "succeeded":
      return isIsoTimestamp(record.startedAt) && isIsoTimestamp(record.finishedAt)
        ? {
            ...base,
            status: "succeeded",
            startedAt: record.startedAt,
            finishedAt: record.finishedAt,
          }
        : null;
    case "failed": {
      const error = parseJobError(record.error);
      return error && isIsoTimestamp(record.startedAt) && isIsoTimestamp(record.finishedAt)
        ? {
            ...base,
            status: "failed",
            startedAt: record.startedAt,
            finishedAt: record.finishedAt,
            error,
          }
        : null;
    }
    default:
      return null;
  }
}

export function jobPendingFrom(job: Extract<OpenSnaJob, { status: "queued" | "running" }>): OpenSnaJobPending {
  return { jobId: job.id, status: job.status };
}

export function attachJobResult(meta: Extract<OpenSnaJobMeta, { status: "succeeded" }>, result: unknown): OpenSnaJobSucceeded | null {
  if (!isOpenSnaResult(result)) return null;
  return { ...meta, result };
}
