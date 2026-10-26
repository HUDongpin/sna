import { isLocale, type Locale } from "@/lib/locales";
import type { OpenSnaResult } from "@/lib/open-sna";
import type { WorkflowCopy } from "@/lib/open-sna-workflow-copy";
import type { OpenSnaSelection } from "@/lib/open-sna-workbook-selection";

export function uniquePositiveLeader<T extends { id: string }>(nodes: readonly T[], key: keyof T): T | null {
  const available = nodes.filter(node => typeof node[key] === "number" && Number.isFinite(node[key]));
  if (!available.length || available.length !== nodes.length) return null;
  const maximum = Math.max(...available.map(node => node[key] as number));
  if (maximum <= 0) return null;
  const leaders = available.filter(node => Math.abs((node[key] as number) - maximum) <= 1e-6);
  return leaders.length === 1 ? leaders[0] : null;
}

export function selectionRevision(fingerprint: string, selection: OpenSnaSelection) {
  return JSON.stringify([fingerprint, selection.groupColumn, selection.items.map(item => [item.column, item.id, item.community, item.reverse])]);
}
export const JOB_STORAGE_KEY = "open-sna-recovery-v1";
/** Detach a completed task before displaying a separately opened result. */
export function detachJobRecovery(active:boolean, storage:Pick<Storage,"removeItem">) {
  if(active) return false;
  storage.removeItem(JOB_STORAGE_KEY);
  return true;
}
export const JOB_ID_PATTERN = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export type SavedJob = { jobId: string; locale: Locale; createdAt: string; expiresAt?: string };
export type JobStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled" | "expired";
export type JobReceipt = SavedJob & {status:JobStatus;pollAfterMs:number;code?:string};
export function serializeSavedJob(job: SavedJob) {
  return JSON.stringify({jobId:job.jobId,locale:job.locale,createdAt:job.createdAt,...(job.expiresAt ? {expiresAt:job.expiresAt} : {})});
}
export function parseSavedJob(raw: string | null): SavedJob | null {
  if (!raw) return null;
  try {
    const value=JSON.parse(raw);
    if (!value || !JOB_ID_PATTERN.test(value.jobId) || !isLocale(value.locale) || typeof value.createdAt!=="string" || !Number.isFinite(Date.parse(value.createdAt)) || (value.expiresAt!==undefined && (typeof value.expiresAt!=="string" || !Number.isFinite(Date.parse(value.expiresAt))))) return null;
    return {jobId:value.jobId,locale:value.locale,createdAt:value.createdAt,...(value.expiresAt?{expiresAt:value.expiresAt}:{})};
  } catch {return null;}
}
export function isJobReceipt(value: unknown, jobId:string): value is JobReceipt {
  if (!value || typeof value!=="object") return false;
  const job=value as JobReceipt;
  return job.jobId===jobId && ["queued","running","succeeded","failed","cancelled","expired"].includes(job.status) && typeof job.createdAt==="string" && Number.isFinite(Date.parse(job.createdAt)) && typeof job.expiresAt==="string" && Number.isFinite(Date.parse(job.expiresAt));
}
export type JobDisplayStatus = JobStatus | "creating" | "uncertain" | "unknown" | "finalizing" | "reconnecting";
export type WorkbenchTaskView = { result:OpenSnaResult|null; message:string; error:string|null };
export function advanceWorkbenchTask(view:WorkbenchTaskView, event:{type:"start"}|{type:"status";status:JobDisplayStatus}, copy:WorkflowCopy):WorkbenchTaskView {
  if(event.type === "start") return {result:null,message:copy.creating,error:null};
  return {...view,message:copy[event.status],error:event.status === "failed" ? copy.failed : null};
}
export function advanceJobReceipt(current:JobDisplayStatus, incoming:JobStatus):JobDisplayStatus {
  return ["succeeded","failed","cancelled","expired"].includes(current) ? current : receiptDisplayStatus(incoming);
}
export function onePollAtATime(task:()=>Promise<void>) {
  let active:Promise<void>|null=null;
  return () => {
    if(active) return active;
    active=task().finally(()=>{active=null;});
    return active;
  };
}
export function jobFailureResponse(code:unknown): {status:number;code:string} | null {
  switch(code) {
    case "R_RUNTIME_NOT_READY": return {status:502,code:"R_ENGINE_UNAVAILABLE"};
    case "WORKBOOK_INVALID": return {status:422,code:"WORKBOOK_INVALID"};
    case "R_ANALYSIS_TIMEOUT": return {status:504,code:"R_ANALYSIS_TIMEOUT"};
    case "RESULT_INVALID": return {status:502,code:"R_ENGINE_CONTRACT_FAILED"};
    case "R_ANALYSIS_FAILED": case "ATTEMPTS_EXHAUSTED": return {status:502,code:"R_ANALYSIS_FAILED"};
    default:return null;
  }
}
export function receiptDisplayStatus(status:JobStatus): JobStatus | "finalizing" { return status === "succeeded" ? "finalizing" : status; }
export function jobPollDelay(status:string, failures:number) { return Math.min(30000,(status==="queued"?2000:5000)*2**Math.min(failures,4)); }
export type JobRequest = {jobId:string;locale:Locale;workbook:File;selection:OpenSnaSelection;inputFingerprint:string;bootstraps:number};

/** Keeps the exact multipart request in memory for an ambiguous creation retry. */
export class OpenSnaJobClient {
  private pending: {jobId:string;locale:Locale;body:FormData} | null = null;
  constructor(private io: {fetch:typeof fetch;save:(raw:string)=>void}) {}
  async create(request:JobRequest) {
    const body=new FormData();
    body.set("workbook",request.workbook);
    body.set("selection",JSON.stringify(request.selection));
    body.set("inputFingerprint",request.inputFingerprint);
    body.set("bootstraps",String(request.bootstraps));
    body.set("permutations","1000");
    body.set("locale",request.locale);
    this.pending={jobId:request.jobId,locale:request.locale,body};
    this.io.save(serializeSavedJob({jobId:request.jobId,locale:request.locale,createdAt:new Date().toISOString()}));
    return this.retry();
  }
  async retry(): Promise<JobReceipt | null> {
    if (!this.pending) return null;
    const pending=this.pending;
    try {
      const response=await this.io.fetch("/api/open-sna/jobs",{method:"POST",body:pending.body,headers:{"Idempotency-Key":pending.jobId}});
      const value:unknown=await response.json();
      if (this.pending !== pending) return null;
      if (response.status >= 500 || response.status === 429) return null;
      if (!response.ok) {
        const code=value && typeof value==="object" && "code" in value ? String(value.code) : "";
        // An explicit rejection is distinct from losing the creation response.
        throw new JobCreationError(response.status,code);
      }
      if (!isJobReceipt(value,pending.jobId)) return null;
      const receipt={...value,locale:pending.locale};
      this.io.save(serializeSavedJob(receipt));
      return receipt;
    } catch(error) {
      if (error instanceof JobCreationError) throw error;
      return null;
    }
  }
  clear() { this.pending=null; }
}
export class JobCreationError extends Error {constructor(public status:number,public code:string){super("Job creation rejected");}}
