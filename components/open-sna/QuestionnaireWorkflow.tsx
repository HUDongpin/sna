"use client";
import { useEffect, useRef, useState, type DragEvent } from "react";
import type { Locale } from "@/lib/locales";
import type { OpenSnaCopy } from "@/lib/open-sna-copy";
import { fillOpenSna } from "@/lib/open-sna-copy";
import { decodeOpenSnaAnalysisResponse } from "@/lib/open-sna-errors";
import type { OpenSnaResult } from "@/lib/open-sna";
import { isOpenSnaInspectionResult, isOpenSnaSelection, type OpenSnaInspectionResult, type OpenSnaSelection } from "@/lib/open-sna-workbook-selection";
import { isOpenSnaValidationResult, type OpenSnaValidationResult } from "@/lib/open-sna-workbook-validation";
import { selectionRevision, type JobDisplayStatus } from "@/lib/open-sna-workflow";
import { getWorkflowCopy } from "@/lib/open-sna-workflow-copy";
import { useOpenSnaJob } from "./useOpenSnaJob";

const inputClass="focus-ring min-h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] disabled:opacity-50";
const buttonClass="focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--indigo)] hover:border-[var(--indigo)] disabled:cursor-not-allowed disabled:opacity-45";
export default function QuestionnaireWorkflow({copy,locale,analysisDisabled,onResult,onBusyChange,onAnalysisStart,onTaskStatus}:{copy:OpenSnaCopy;locale:Locale;analysisDisabled:boolean;onResult:(result:OpenSnaResult)=>void;onBusyChange?:(busy:boolean)=>void;onAnalysisStart?:()=>void;onTaskStatus?:(status:JobDisplayStatus)=>void}) {
  const text=getWorkflowCopy(locale);
  const [workbook,setWorkbook]=useState<File|null>(null);
  const [inspection,setInspection]=useState<OpenSnaInspectionResult|null>(null);
  const [selection,setSelection]=useState<OpenSnaSelection>({items:[],groupColumn:""});
  const [validation,setValidation]=useState<OpenSnaValidationResult|null>(null);
  const [validatedRevision,setValidatedRevision]=useState<string|null>(null);
  const [confirmed,setConfirmed]=useState(false);
  const [bootstraps,setBootstraps]=useState(500);
  const [operation,setOperation]=useState<"inspect"|"validate"|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [dragging,setDragging]=useState(false);
  const [recoverId,setRecoverId]=useState("");
  const [copied,setCopied]=useState(false);
  const fileInput=useRef<HTMLInputElement>(null);
  const revisionRef=useRef(0);
  const requestAbort=useRef<AbortController|null>(null);
  const job=useOpenSnaJob(locale,onResult);
  const locked=Boolean(job.job);
  const busy=Boolean(operation)||job.busy;
  useEffect(()=>{onBusyChange?.(busy);},[busy,onBusyChange]);
  useEffect(()=>{if(job.job) onTaskStatus?.(job.status);},[job.job?.jobId,job.status,onTaskStatus]);
  useEffect(()=>()=>requestAbort.current?.abort(),[]);
  const revision=inspection?selectionRevision(inspection.inputFingerprint,selection):null;
  const canRun=Boolean(workbook&&validation&&confirmed&&validatedRevision===revision&&!locked&&!operation&&!analysisDisabled);

  function invalidate() {revisionRef.current++;requestAbort.current?.abort();setValidation(null);setValidatedRevision(null);setConfirmed(false);setError(null);setOperation(null);}
  function changeSelection(next:OpenSnaSelection) {invalidate();setSelection(next);}
  async function acceptWorkbook(file:File|null) {
    if(locked) return;
    invalidate();setDragging(false);setWorkbook(null);setInspection(null);setSelection({items:[],groupColumn:""});
    if(analysisDisabled) {
      setError(copy.errors.R_ENGINE_DISABLED);
      if(fileInput.current) fileInput.current.value="";
      return;
    }
    if(!file) return;
    if(!file.name.toLowerCase().endsWith(".xlsx")){setError(copy.errors.notXlsx);return;}
    if(file.size===0 || file.size>5*1024*1024){setError(file.size===0?copy.errors.emptyWorkbook:copy.errors.workbookTooLarge);return;}
    const operationRevision=revisionRef.current;
    const controller=new AbortController();requestAbort.current=controller;
    setWorkbook(file);setOperation("inspect");
    try {
      const body=new FormData();body.set("workbook",file);body.set("locale",locale);
      const response=await fetch("/api/open-sna/inspect",{method:"POST",body,signal:controller.signal});
      const decoded=await decodeOpenSnaAnalysisResponse(response,locale);
      if(operationRevision!==revisionRef.current) return;
      if(!decoded.ok){setError(decoded.message);return;}
      if(!isOpenSnaInspectionResult(decoded.payload)){setError(text.inspectFailed);return;}
      setInspection(decoded.payload);
      // Suggestions help with item mapping; the researcher chooses the grouping variable.
      setSelection(decoded.payload.suggestedSelection?{...decoded.payload.suggestedSelection,groupColumn:""}:{items:[],groupColumn:""});
    } catch {if(operationRevision===revisionRef.current) setError(text.inspectFailed);}
    finally {if(operationRevision===revisionRef.current) setOperation(null);}
  }
  function handleWorkbookDrop(event:DragEvent<HTMLDivElement>) {event.preventDefault();void acceptWorkbook(event.dataTransfer.files?.[0]??null);}
  function toggleItem(column:OpenSnaInspectionResult["columns"][number],index:number) {
    const exists=selection.items.some(item=>item.column===column.name);
    const items=exists?selection.items.filter(item=>item.column!==column.name):[...selection.items,{column:column.name,id:/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(column.name)?column.name:`Item${index+1}`,community:column.suggestedCommunity??"",reverse:false}];
    changeSelection({...selection,items});
  }
  function editItem(column:string,patch:Partial<OpenSnaSelection["items"][number]>) {changeSelection({...selection,items:selection.items.map(item=>item.column===column?{...item,...patch}:item)});}
  async function validate() {
    if(analysisDisabled || !workbook || !inspection || !isOpenSnaSelection(selection) || locked) return;
    setError(null);setConfirmed(false);setValidation(null);setValidatedRevision(null);setOperation("validate");
    const operationRevision=revisionRef.current;
    const controller=new AbortController();requestAbort.current=controller;
    try {
      const body=new FormData();body.set("workbook",workbook);body.set("selection",JSON.stringify(selection));body.set("locale",locale);
      const response=await fetch("/api/open-sna/validate",{method:"POST",body,signal:controller.signal});
      const decoded=await decodeOpenSnaAnalysisResponse(response,locale);
      if(operationRevision!==revisionRef.current) return;
      if(!decoded.ok){setError(decoded.message);return;}
      const value=decoded.payload;
      if(!isOpenSnaValidationResult(value) || value.schemaVersion!=="1.1" || !value.selection || value.inputFingerprint!==inspection.inputFingerprint || selectionRevision(value.inputFingerprint,value.selection)!==revision){setError(copy.errors.generic);return;}
      setValidation(value);setValidatedRevision(revision);
    } catch {if(operationRevision===revisionRef.current) setError(copy.errors.generic);}
    finally {if(operationRevision===revisionRef.current) setOperation(null);}
  }
  async function run() {
    if(!canRun || !workbook || !validation) return;
    onAnalysisStart?.();
    await job.start({workbook,selection:structuredClone(selection),inputFingerprint:validation.inputFingerprint,bootstraps});
  }
  return <div className="space-y-5" aria-busy={busy}>
    <p className="text-sm leading-6 text-[var(--muted)]">{analysisDisabled?copy.setup.uploadClosedDetail:text.uploadNotice}</p>
    <div className="grid gap-5 lg:grid-cols-2">
      <div onDragOver={event=>{event.preventDefault();if(!analysisDisabled&&!locked)setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={handleWorkbookDrop} aria-disabled={analysisDisabled||locked} className={`rounded-2xl border border-dashed p-5 ${dragging?"border-[var(--indigo)] bg-[var(--surface-soft)]":"border-[var(--line-strong)] bg-[var(--page)]"}`}>
        <label htmlFor="research-workbook" className="block text-sm font-black">{analysisDisabled?copy.setup.uploadClosed:copy.setup.chooseWorkbook}</label>
        <p className="mt-1 text-xs text-[var(--muted)]">{copy.setup.fileLimit}</p>
        <input ref={fileInput} id="research-workbook" className="focus-ring mt-3 block w-full text-sm file:mr-3 file:min-h-11 file:rounded-xl file:border-0 file:bg-[#403A8F] file:px-4 file:font-bold file:text-white disabled:opacity-50" type="file" accept=".xlsx" aria-label={copy.setup.chooseFileAria} aria-describedby="research-upload-help" disabled={analysisDisabled||locked} onChange={event=>void acceptWorkbook(event.target.files?.[0]??null)}/>
        {workbook?<div className="mt-3 flex flex-wrap items-center gap-3"><span className="min-w-0 break-all text-xs">{workbook.name}</span><button type="button" className={buttonClass} disabled={analysisDisabled||locked} onClick={()=>{void acceptWorkbook(null);if(fileInput.current)fileInput.current.value="";}}>{copy.setup.remove}</button></div>:null}
        <p id="research-upload-help" className="mt-3 text-xs leading-5 text-[var(--muted)]">{copy.setup.help} <a className="font-bold text-[var(--indigo)]" href="/open-sna/programming-resilience-sample.xlsx" download>{copy.setup.sampleDownload}</a></p>
      </div>
      <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--page)] p-5">
        <label className="block text-sm font-black" htmlFor="research-bootstrap">{copy.setup.stabilityPrecision}</label>
        <select id="research-bootstrap" className={`${inputClass} pr-20 xl:pr-3`} value={bootstraps} disabled={analysisDisabled||locked} onChange={event=>{setBootstraps(Number(event.target.value));setConfirmed(false);}}><option value={100}>{copy.setup.bootstrap100}</option><option value={500}>{copy.setup.bootstrap500}</option><option value={1000}>{copy.setup.bootstrap1000}</option></select>
        <p className="text-xs leading-5 text-[var(--muted)]">{copy.setup.bootstrapTiming}</p>
        <p className="text-xs leading-5 text-[var(--muted)]">{copy.setup.profileValue} · {copy.setup.ebicGamma} 0.50 · {copy.setup.nctValue} · {copy.setup.seed} 2026</p>
        <p className="text-xs leading-5 text-[var(--muted)]">{text.optionalAi}</p>
      </div>
    </div>
    {operation?<p role="status" className="rounded-xl bg-[var(--teal-tint)] p-3 text-sm">{operation==="inspect"?text.inspecting:text.validating}</p>:null}
    {error?<p role="alert" className="rounded-xl border border-[var(--danger-line)] bg-[var(--danger-tint)] p-3 text-sm text-[var(--danger)]">{error}</p>:null}
    {inspection?<section className="space-y-4" aria-labelledby="research-mapping-title">
      <div className="flex flex-wrap items-baseline justify-between gap-3"><h3 id="research-mapping-title" className="text-xl font-black">{text.mapping}</h3><p className="text-sm tabular-nums text-[var(--muted)]">{text.rows}: {inspection.originalRows} · {text.columns}: {inspection.columns.length} · {text.selected}: {selection.items.length} · {text.communities}: {new Set(selection.items.map(item=>item.community).filter(Boolean)).size}</p></div>
      <p className="text-sm leading-6 text-[var(--muted)]">{text.mappingHelp}</p>
      <div className="overflow-x-auto rounded-2xl border border-[var(--line)]"><table className="w-full min-w-[44rem] text-left text-sm"><caption className="sr-only">{text.preview}</caption><thead className="bg-[var(--page-strong)]"><tr>{[text.include,text.column,text.missing,text.itemId,text.community,text.reverse].map(label=><th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--line)]">{inspection.columns.map((column,index)=>{
        const item=selection.items.find(item=>item.column===column.name);
        return <tr key={column.name} className={item?"bg-[var(--surface)]":"bg-[var(--page)] text-[var(--muted)]"}><td className="p-3"><input type="checkbox" className="focus-ring h-5 w-5 accent-[#403A8F]" checked={Boolean(item)} disabled={analysisDisabled||locked||!column.eligibleItem||selection.groupColumn===column.name} aria-label={`${text.include}: ${column.name}`} onChange={()=>toggleItem(column,index)}/></td><th scope="row" className="max-w-[15rem] break-words px-3 py-2">{column.name}{!column.eligibleItem?<span className="block text-xs font-normal">{text.unavailable}</span>:null}</th><td className="px-3 py-2 tabular-nums">{column.missingCount}</td><td className="p-2"><input className={inputClass} maxLength={40} value={item?.id??""} disabled={analysisDisabled||locked||!item} aria-label={`${text.itemId}: ${column.name}`} onChange={event=>editItem(column.name,{id:event.target.value})}/></td><td className="p-2"><input className={inputClass} maxLength={40} value={item?.community??""} disabled={analysisDisabled||locked||!item} aria-label={`${text.community}: ${column.name}`} onChange={event=>editItem(column.name,{community:event.target.value})}/></td><td className="p-3"><input type="checkbox" className="focus-ring h-5 w-5 accent-[#403A8F]" checked={item?.reverse??false} disabled={analysisDisabled||locked||!item} aria-label={`${text.reverse}: ${column.name}`} onChange={event=>editItem(column.name,{reverse:event.target.checked})}/></td></tr>;
      })}</tbody></table></div>
      <label className="block max-w-lg text-sm font-black">{text.group}<select className={`${inputClass} mt-2`} value={selection.groupColumn} disabled={analysisDisabled||locked} onChange={event=>changeSelection({items:selection.items.filter(item=>item.column!==event.target.value),groupColumn:event.target.value})}><option value="">{text.chooseGroup}</option>{inspection.columns.filter(column=>column.eligibleGroup).map(column=><option key={column.name} value={column.name}>{column.name}</option>)}</select></label>
      <p className="text-xs leading-5 text-[var(--muted)]">{text.groupHelp}</p>
      <button type="button" className={buttonClass} disabled={locked||Boolean(operation)||!isOpenSnaSelection(selection)||analysisDisabled} onClick={()=>void validate()}>{text.validate}</button>
      {!isOpenSnaSelection(selection)?<p className="text-xs text-[var(--muted)]">{text.invalid}</p>:null}
    </section>:null}
    {validation && validatedRevision===revision?<section className="space-y-4 rounded-2xl border border-[var(--teal-line)] bg-[var(--teal-tint)] p-5" aria-labelledby="research-confirm-title"><h3 id="research-confirm-title" className="text-xl font-black">{text.validationTitle}</h3><dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-7">{[[text.original,validation.summary.originalRows],[text.analyzed,validation.summary.analyzedRows],[text.dropped,validation.summary.droppedRows],[text.selected,validation.summary.itemCount],[text.communities,validation.summary.communityCount],...validation.summary.groupCounts.map(group=>[group.group,group.n])].map(([label,value])=><div key={String(label)}><dt className="text-xs font-bold text-[var(--muted)]">{label}</dt><dd className="mt-1 text-2xl font-black tabular-nums">{value}</dd></div>)}</dl><p className="text-sm leading-6">{text.confirmationHelp}</p><label className="flex min-h-11 items-start gap-3 text-sm font-bold"><input className="focus-ring mt-1 h-5 w-5 shrink-0 accent-[#403A8F]" type="checkbox" checked={confirmed} disabled={analysisDisabled||locked} onChange={event=>setConfirmed(event.target.checked)}/><span>{text.confirm}</span></label></section>:null}
    <button type="button" className="focus-ring inline-flex min-h-12 items-center justify-center rounded-xl bg-[#403A8F] px-6 font-black text-white shadow-sm hover:bg-[#302B78] disabled:cursor-not-allowed disabled:opacity-45" onClick={()=>void run()} disabled={!canRun}>{text.run}</button>
    {analysisDisabled?<p className="text-xs text-[var(--muted)]">{copy.setup.runUnavailable}</p>:null}
    {job.job?<section className="space-y-3 rounded-2xl border border-[var(--teal-line)] bg-[var(--page)] p-5" aria-label={text.jobTitle}><h3 className="font-black">{text.jobTitle}</h3><p role="status" className="text-sm leading-6">{text[job.status]}</p><div className="flex flex-wrap items-center gap-3"><label className="min-w-0 flex-1 text-xs font-bold">{text.taskId}<input className={`${inputClass} mt-1 font-mono`} readOnly value={job.job.jobId} onFocus={event=>event.target.select()}/></label><button type="button" className={buttonClass} onClick={()=>{void navigator.clipboard.writeText(job.job!.jobId).then(()=>setCopied(true),()=>setCopied(false));}}>{copied?text.copied:text.copyId}</button></div>{job.job.expiresAt?<p className="text-xs text-[var(--muted)]">{text.expires}: <time dateTime={job.job.expiresAt}>{new Date(job.job.expiresAt).toLocaleString(locale)}</time></p>:null}<div className="flex flex-wrap gap-3">{job.retryAvailable&&["uncertain","unknown","reconnecting"].includes(job.status)?<button type="button" className={buttonClass} disabled={job.submitting} onClick={()=>void job.retry()}>{text.retry}</button>:null}{!job.terminal?<button type="button" className={buttonClass} disabled={job.submitting||job.cancelling} onClick={()=>void job.cancel()}>{text.cancel}</button>:null}{job.terminal||job.status==="unknown"?<button type="button" className={buttonClass} onClick={job.dismiss}>{text.dismiss}</button>:null}</div></section>:<details className="rounded-xl border border-[var(--line)] p-4"><summary className="focus-ring cursor-pointer pe-20 text-sm font-bold xl:pe-0">{text.recover}</summary><p className="mt-3 text-xs leading-5 text-[var(--muted)]">{text.recoverHelp}</p><div className="mt-3 flex flex-wrap gap-3"><label className="min-w-0 flex-1"><span className="sr-only">{text.taskId}</span><input className={inputClass} value={recoverId} onChange={event=>setRecoverId(event.target.value)} autoComplete="off" spellCheck={false}/></label><button type="button" className={buttonClass} onClick={()=>job.recover(recoverId.trim())}>{text.recover}</button></div></details>}
    {job.error?<p role="alert" className="text-sm text-[var(--danger)]">{job.error}</p>:null}
    {job.storageWarning?<p role="status" className="text-xs text-[var(--muted)]">{text.storageUnavailable}</p>:null}
    <p className="text-xs leading-5 text-[var(--muted)]">{text.recoveryNotice}</p>
  </div>;
}
