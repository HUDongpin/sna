"use client";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/locales";
import { isOpenSnaResult, type OpenSnaResult } from "@/lib/open-sna";
import { openSnaAnalysisErrorMessage } from "@/lib/open-sna-errors";
import { JOB_ID_PATTERN, JOB_STORAGE_KEY, JobCreationError, OpenSnaJobClient, isJobReceipt, jobPollDelay, advanceJobReceipt, onePollAtATime, jobFailureResponse, parseSavedJob, serializeSavedJob, type JobRequest, type SavedJob, type JobDisplayStatus } from "@/lib/open-sna-workflow";
import { getWorkflowCopy } from "@/lib/open-sna-workflow-copy";

type DisplayStatus = JobDisplayStatus;
const terminal = new Set<DisplayStatus>(["succeeded","failed","cancelled","expired"]);
export function useOpenSnaJob(locale:Locale, onResult:(result:OpenSnaResult)=>void) {
  const copy=getWorkflowCopy(locale);
  const [job,setJob]=useState<SavedJob|null>(null);
  const [status,setStatusValue]=useState<DisplayStatus>("queued");
  const [error,setError]=useState<string|null>(null);
  const [storageWarning,setStorageWarning]=useState(false);
  const [retryAvailable,setRetryAvailable]=useState(false);
  const [submitting,setSubmitting]=useState(false);
  const [cancelling,setCancelling]=useState(false);
  const resultCallback=useRef(onResult);
  resultCallback.current=onResult;
  const statusRef=useRef(status);
  function setStatus(value:DisplayStatus) {statusRef.current=value;setStatusValue(value);}
  const currentId=useRef<string|null>(null);
  const client=useRef<OpenSnaJobClient|null>(null);
  if(!client.current) client.current=new OpenSnaJobClient({fetch:(...args)=>fetch(...args),save:raw=>{
    try { localStorage.setItem(JOB_STORAGE_KEY,raw); } catch {setStorageWarning(true);}
  }});
  useEffect(()=>()=>{currentId.current=null;client.current?.clear();},[]);
  useEffect(()=>{
    try {
      const saved=parseSavedJob(localStorage.getItem(JOB_STORAGE_KEY));
      if(saved){currentId.current=saved.jobId;setJob(saved);setStatus("reconnecting");}
    } catch {setStorageWarning(true);}
  },[]);
  function save(value:SavedJob) {
    try {localStorage.setItem(JOB_STORAGE_KEY,serializeSavedJob(value));} catch {setStorageWarning(true);}
  }
  useEffect(()=>{
    if(!job) return;
    const jobId=job.jobId;
    const jobLocale=job.locale;
    let stopped=false;
    let failures=0;
    let lastStatus="queued";
    let timer:ReturnType<typeof setTimeout>;
    const controller=new AbortController();
    const schedule=()=>{if(!stopped) timer=setTimeout(()=>void poll(),jobPollDelay(lastStatus,failures));};
    const poll=onePollAtATime(async () => {
      if(stopped || currentId.current!==jobId || terminal.has(statusRef.current)) return;
      try {
        const response=await fetch(`/api/open-sna/jobs/${jobId}?locale=${jobLocale}`,{cache:"no-store",signal:controller.signal});
        if(stopped || terminal.has(statusRef.current)) return;
        if(response.status===410){setStatus("expired");return;}
        if(response.status===404){setStatus(statusRef.current==="creating"?"creating":"unknown");failures++;schedule();return;}
        if(!response.ok) throw new Error("Status unavailable");
        const value:unknown=await response.json();
        if(!isJobReceipt(value,jobId)) throw new Error("Invalid status response");
        if(stopped || terminal.has(statusRef.current)) return;
        failures=0;lastStatus=value.status;
        const saved={jobId,locale:jobLocale,createdAt:value.createdAt,expiresAt:value.expiresAt};
        setJob(saved);save(saved);setError(null);
        if(value.status==="succeeded") {
          const resultResponse=await fetch(`/api/open-sna/jobs/${jobId}/result?locale=${jobLocale}`,{cache:"no-store",signal:controller.signal});
          if(stopped || terminal.has(statusRef.current)) return;
          if(resultResponse.status===409){setStatus("finalizing");schedule();return;}
          if(resultResponse.status===410){setStatus("expired");return;}
          if(!resultResponse.ok) throw new Error("Result unavailable");
          const result:unknown=await resultResponse.json();
          if(!isOpenSnaResult(result)) throw new Error("Invalid result response");
          if(stopped || currentId.current!==jobId || terminal.has(statusRef.current)) return;
          setStatus("succeeded");setRetryAvailable(false);client.current?.clear();resultCallback.current(result);return;
        }
        setStatus(advanceJobReceipt(statusRef.current,value.status));
        if(value.status === "failed") {
          const failure=jobFailureResponse(value.code);
          setError(failure?openSnaAnalysisErrorMessage(failure.status,failure,jobLocale):getWorkflowCopy(jobLocale).failed);
        }
        if(terminal.has(value.status)){setRetryAvailable(false);client.current?.clear();return;}
        schedule();
      } catch {
        if(stopped || terminal.has(statusRef.current)) return;
        failures++;setStatus("reconnecting");schedule();
      }
    });
    const reconnect=()=>{failures=0;clearTimeout(timer);void poll();};
    window.addEventListener("online",reconnect);
    void poll();
    return ()=>{stopped=true;clearTimeout(timer);controller.abort();window.removeEventListener("online",reconnect);};
  },[job?.jobId]);
  async function start(request:Omit<JobRequest,"jobId"|"locale">) {
    if(currentId.current || submitting) return;
    const jobId=crypto.randomUUID();
    const saved={jobId,locale,createdAt:new Date().toISOString()};
    currentId.current=jobId;setJob(saved);setStatus("creating");setSubmitting(true);setError(null);setRetryAvailable(true);
    try {
      const receipt=await client.current!.create({...request,jobId,locale});
      if(currentId.current!==jobId || terminal.has(statusRef.current)) return;
      if(receipt){setJob(receipt);setStatus(advanceJobReceipt(statusRef.current,receipt.status));}else setStatus("uncertain");
    } catch(caught) {
      if(currentId.current!==jobId || terminal.has(statusRef.current)) return;
      setStatus("failed");setRetryAvailable(false);
      setError(caught instanceof JobCreationError?openSnaAnalysisErrorMessage(caught.status,{code:caught.code},locale):copy.failed);
    } finally {setSubmitting(false);}
  }
  async function retry() {
    if(submitting || !retryAvailable) return;
    const jobId=currentId.current;setSubmitting(true);setError(null);
    try {
      const receipt=await client.current!.retry();
      if(currentId.current!==jobId || terminal.has(statusRef.current)) return;
      if(receipt){setJob(receipt);setStatus(advanceJobReceipt(statusRef.current,receipt.status));}else setStatus("uncertain");
    } catch(caught) {
      setError(caught instanceof JobCreationError?openSnaAnalysisErrorMessage(caught.status,{code:caught.code},locale):copy.reconnecting);
    } finally{setSubmitting(false);}
  }
  function recover(jobId:string) {
    if(currentId.current) return;
    if(!JOB_ID_PATTERN.test(jobId)){setError(copy.invalidId);return;}
    const saved={jobId,locale,createdAt:new Date().toISOString()};
    currentId.current=jobId;save(saved);setJob(saved);setStatus("reconnecting");setError(null);
  }
  async function cancel() {
    if(!job || cancelling) return;
    setCancelling(true);
    try {
      const response=await fetch(`/api/open-sna/jobs/${job.jobId}?locale=${job.locale}`,{method:"DELETE"});
      if(!response.ok){setError(copy.reconnecting);return;}
      // The next status poll confirms the cancellation, including races with completion.
      const payload:unknown=await response.json();
      if(currentId.current!==job.jobId) return;
      if(isJobReceipt(payload,job.jobId)) setStatus(advanceJobReceipt(statusRef.current,payload.status));
    } catch {setError(copy.reconnecting);} finally {setCancelling(false);}
  }
  function dismiss() {
    if(!terminal.has(status) && status!=="unknown") return;
    currentId.current=null;client.current?.clear();setJob(null);setError(null);setRetryAvailable(false);
    try {localStorage.removeItem(JOB_STORAGE_KEY);}catch {setStorageWarning(true);}
  }
  return {job,status,error,storageWarning,retryAvailable,submitting,cancelling,start,retry,recover,cancel,dismiss,busy:Boolean(job&&!terminal.has(status)),terminal:terminal.has(status)};
}
