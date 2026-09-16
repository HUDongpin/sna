import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { isOpenSnaResult } from "@/lib/open-sna";
import {
  attachJobResult,
  parseOpenSnaJobId,
  parseOpenSnaJobMeta,
  type OpenSnaJob,
  type OpenSnaJobFailed,
  type OpenSnaJobId,
  type OpenSnaJobMeta,
  type OpenSnaJobQueued,
  type OpenSnaJobRunning,
  type OpenSnaJobSucceeded,
} from "@/lib/open-sna-job";

const META_FILE = "meta.json";
const INPUT_FILE = "input.xlsx";
const RESULT_FILE = "result.json";

export const OPEN_SNA_JOB_TTL_MS = 60 * 60 * 1000;

export function asyncJobsRoot(temporaryRoot: string) {
  return path.join(temporaryRoot, "async");
}

function jobDirectory(temporaryRoot: string, id: OpenSnaJobId) {
  return path.join(asyncJobsRoot(temporaryRoot), id);
}

function metaPath(temporaryRoot: string, id: OpenSnaJobId) {
  return path.join(jobDirectory(temporaryRoot, id), META_FILE);
}

export function jobInputPath(temporaryRoot: string, id: OpenSnaJobId) {
  return path.join(jobDirectory(temporaryRoot, id), INPUT_FILE);
}

export function jobResultPath(temporaryRoot: string, id: OpenSnaJobId) {
  return path.join(jobDirectory(temporaryRoot, id), RESULT_FILE);
}

function metaWithoutResult(job: OpenSnaJob | OpenSnaJobMeta): OpenSnaJobMeta {
  if (job.status !== "succeeded") return job;
  return {
    id: job.id,
    status: "succeeded",
    createdAt: job.createdAt,
    bootstraps: job.bootstraps,
    permutations: job.permutations,
    inputFingerprint: job.inputFingerprint,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
  };
}

async function writeMeta(temporaryRoot: string, job: OpenSnaJob | OpenSnaJobMeta) {
  await writeFile(metaPath(temporaryRoot, job.id), `${JSON.stringify(metaWithoutResult(job))}\n`, {
    mode: 0o600,
  });
}

export async function createQueuedJob(
  temporaryRoot: string,
  bytes: Uint8Array,
  job: OpenSnaJobQueued,
) {
  const directory = jobDirectory(temporaryRoot, job.id);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(jobInputPath(temporaryRoot, job.id), bytes, { mode: 0o600 });
  await writeMeta(temporaryRoot, job);
}

async function readMeta(temporaryRoot: string, id: OpenSnaJobId) {
  try {
    const text = await readFile(metaPath(temporaryRoot, id), "utf8");
    return parseOpenSnaJobMeta(JSON.parse(text.replace(/^\uFEFF/, "")));
  } catch {
    return null;
  }
}

export async function readJob(temporaryRoot: string, id: OpenSnaJobId): Promise<OpenSnaJob | null> {
  const meta = await readMeta(temporaryRoot, id);
  if (!meta) return null;
  if (meta.status !== "succeeded") return meta;
  try {
    const text = await readFile(jobResultPath(temporaryRoot, id), "utf8");
    return attachJobResult(meta, JSON.parse(text.replace(/^\uFEFF/, "")));
  } catch {
    return null;
  }
}

export async function markJobRunning(
  temporaryRoot: string,
  job: OpenSnaJobQueued,
  startedAt: string,
): Promise<OpenSnaJobRunning> {
  const running: OpenSnaJobRunning = { ...job, status: "running", startedAt };
  await writeMeta(temporaryRoot, running);
  return running;
}

export async function markJobSucceeded(
  temporaryRoot: string,
  job: OpenSnaJobRunning,
  result: unknown,
  finishedAt: string,
): Promise<OpenSnaJobSucceeded | null> {
  if (!isOpenSnaResult(result)) return null;
  await writeFile(jobResultPath(temporaryRoot, job.id), `${JSON.stringify(result)}\n`, { mode: 0o600 });
  const succeeded: OpenSnaJobSucceeded = {
    ...job,
    status: "succeeded",
    finishedAt,
    result,
  };
  await writeMeta(temporaryRoot, succeeded);
  await rm(jobInputPath(temporaryRoot, job.id), { force: true });
  return succeeded;
}

export async function markJobFailed(
  temporaryRoot: string,
  job: OpenSnaJobRunning,
  error: OpenSnaJobFailed["error"],
  finishedAt: string,
): Promise<OpenSnaJobFailed> {
  const failed: OpenSnaJobFailed = {
    ...job,
    status: "failed",
    finishedAt,
    error,
  };
  await writeMeta(temporaryRoot, failed);
  await rm(jobInputPath(temporaryRoot, job.id), { force: true });
  await rm(jobResultPath(temporaryRoot, job.id), { force: true });
  return failed;
}

export async function claimNextQueuedJob(temporaryRoot: string): Promise<OpenSnaJobQueued | null> {
  let names: string[];
  try {
    names = await readdir(asyncJobsRoot(temporaryRoot));
  } catch {
    return null;
  }

  const queued: OpenSnaJobQueued[] = [];
  for (const name of names) {
    const id = parseOpenSnaJobId(name);
    if (!id) continue;
    const job = await readMeta(temporaryRoot, id);
    if (job?.status === "queued") queued.push(job);
  }
  queued.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id));
  return queued[0] ?? null;
}

export async function sweepExpiredJobs(temporaryRoot: string, nowMs: number, ttlMs = OPEN_SNA_JOB_TTL_MS) {
  let names: string[];
  try {
    names = await readdir(asyncJobsRoot(temporaryRoot));
  } catch {
    return;
  }

  await Promise.all(names.map(async (name) => {
    const id = parseOpenSnaJobId(name);
    if (!id) return;
    const job = await readMeta(temporaryRoot, id);
    if (!job) {
      await rm(jobDirectory(temporaryRoot, id), { recursive: true, force: true });
      return;
    }
    if (job.status === "running") return;
    if (nowMs - Date.parse(job.createdAt) < ttlMs) return;
    await rm(jobDirectory(temporaryRoot, id), { recursive: true, force: true });
  }));
}
