import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { uniquePositiveLeader, selectionRevision, parseSavedJob, serializeSavedJob, jobPollDelay, receiptDisplayStatus, advanceJobReceipt, onePollAtATime, jobFailureResponse, detachJobRecovery, advanceWorkbenchTask, JOB_STORAGE_KEY, OpenSnaJobClient } from "../lib/open-sna-workflow";
import { getWorkflowCopy } from "../lib/open-sna-workflow-copy";
import { getOpenSnaCopy, presentOpenSnaInsight } from "../lib/open-sna-copy";
import type { OpenSnaResult } from "../lib/open-sna";

const selection = { items: [{column:"題目1",id:"A1",community:"A",reverse:false}],groupColumn:"組別" };
const jobId = "01234567-89ab-4cde-8fab-0123456789ab";
test("every mapping change invalidates the confirmed selection revision", () => {
  const before = selectionRevision("sha256:one",selection);
  for (const changed of [{...selection,groupColumn:"Group"},{...selection,items:[{...selection.items[0],reverse:true}]},{...selection,items:[{...selection.items[0],community:"B"}]},{...selection,items:[{...selection.items[0],id:"B1"}]}]) assert.notEqual(selectionRevision("sha256:one",changed),before);
  assert.notEqual(selectionRevision("sha256:two",selection),before);
  assert.equal(selectionRevision("sha256:one",structuredClone(selection)),before);
});
test("only a unique positive finite estimate can lead a ranking", () => {
  assert.equal(uniquePositiveLeader([{id:"A",strength:0},{id:"B",strength:0}],"strength"),null);
  assert.equal(uniquePositiveLeader([{id:"A",strength:1},{id:"B",strength:1}],"strength"),null);
  assert.equal(uniquePositiveLeader([{id:"A",strength:null},{id:"B",strength:null}],"strength"),null);
  assert.equal(uniquePositiveLeader([{id:"A",strength:1},{id:"B",strength:0.5}],"strength")?.id,"A");
});
test("saved recovery data contains only ID, locale and timestamps", () => {
  const raw=serializeSavedJob({jobId,locale:"zh-hant",createdAt:"2026-10-26T00:00:00.000Z",expiresAt:"2026-10-27T00:00:00.000Z",workbook:"secret",selection} as never);
  assert.deepEqual(Object.keys(JSON.parse(raw)).sort(),["createdAt","expiresAt","jobId","locale"]);
  assert.equal(parseSavedJob(raw)?.jobId,jobId);
  assert.equal(parseSavedJob(JSON.stringify({jobId:"../bad",locale:"en",createdAt:"today"})),null);
  assert.equal(parseSavedJob("not json"),null);
});
test("queued and running polling stays bounded and backs off transient failures", () => {
  assert.equal(jobPollDelay("queued",0),2000);
  assert.equal(jobPollDelay("running",0),5000);
  assert.ok(jobPollDelay("running",3)>5000);
  assert.ok(jobPollDelay("running",30)<=30000);
});
test("lost creation response preserves identity and retries the exact request", async () => {
  const requests:Array<{id:string|null;body:FormData}> = [];
  const saved:string[]=[];
  let attempts=0;
  const client = new OpenSnaJobClient({fetch: async (_url,init) => {requests.push({id:new Headers(init?.headers).get("Idempotency-Key"),body:init?.body as FormData});if(++attempts===1) throw new Error("network loss");return Response.json({jobId,status:"queued",createdAt:"2026-10-26T00:00:00.000Z",expiresAt:"2026-10-27T00:00:00.000Z",pollAfterMs:2000},{status:202});},save: raw=>saved.push(raw)});
  const request={jobId,locale:"en" as const,workbook:new File(["PK data"],"private.xlsx"),selection,inputFingerprint:"sha256:"+"a".repeat(64),bootstraps:1000};
  assert.equal(await client.create(request),null);
  assert.equal(saved.length,1,"recovery identity must be persisted before POST");
  assert.equal(await client.retry()?.then(x=>x?.status),"queued");
  assert.equal(requests[0].id,requests[1].id);
  assert.equal(requests[0].body,requests[1].body,"retry retains frozen file and settings");
});
test("all researcher workflow labels and neutral interpretations exist in three locales", () => {
  for(const locale of ["en","zh-hant","zh-hans"] as const) {
    const copy=getWorkflowCopy(locale);
    assert.ok(copy.confirm.length>8);
    assert.ok(copy.reconnecting.length>8);
    const demo=JSON.parse(readFileSync(new URL("../public/open-sna/programming-resilience-demo.json",import.meta.url),"utf8")) as OpenSnaResult;
    demo.nodes.forEach(node=>{node.strength=0;node.predictability=0;node.bridgeStrength=0;});
    for(const id of ["central-node","predictability","bridge-node"]) {
      const displayed=presentOpenSnaInsight(getOpenSnaCopy(locale),demo,{id,title:"old",text:"FIRST NODE",evidence:"old"});
      assert.doesNotMatch(displayed.text,/FIRST NODE|Cnf1|Cnf2/);
      if(locale!=="en") assert.match(displayed.text,/\p{Script=Han}/u);
    }
  }
});

test("a positive bridge leader is suppressed when stability is unavailable or below .25",()=>{
  const demo=JSON.parse(readFileSync(new URL("../public/open-sna/programming-resilience-demo.json",import.meta.url),"utf8")) as OpenSnaResult;
  demo.nodes.forEach((node,index)=>node.bridgeStrength=index===0?1:0.1);
  for(const coefficient of [null,0,0.24]) {
    demo.stability.metrics.find(metric=>metric.id==="bridgeStrength")!.coefficient=coefficient;
    assert.equal(presentOpenSnaInsight(getOpenSnaCopy("en"),demo,{id:"bridge-node",title:"",evidence:"",text:""}).text,getWorkflowCopy("en").neutralBridge);
  }
});
test("workflow localization keeps matching template parameters",()=>{
  const en=getWorkflowCopy("en");
  for(const locale of ["zh-hant","zh-hans"] as const) {
    const other=getWorkflowCopy(locale);
    assert.deepEqual(Object.keys(other).sort(),Object.keys(en).sort());
    for(const key of Object.keys(en) as Array<keyof typeof en>) {
      assert.ok(other[key].trim().length>0);
      assert.deepEqual(other[key].match(/\{\w+\}/g),en[key].match(/\{\w+\}/g),key);
    }
  }
});
test("explicit job rejection is not mistaken for a lost response",async()=>{
  const client=new OpenSnaJobClient({fetch:async()=>Response.json({code:"VALIDATION_STALE"},{status:409}),save:()=>{}});
  await assert.rejects(client.create({jobId,locale:"en",workbook:new File(["PK"],"a.xlsx"),selection,inputFingerprint:"sha256:"+"a".repeat(64),bootstraps:1000}),error=>Boolean(error&&typeof error==="object"&&"code" in error&&error.code==="VALIDATION_STALE"));
});

test("initial researcher UI announces temporary inspection and keeps analysis disabled in each locale",async()=>{
  const {createElement}=await import("react");
  const {renderToStaticMarkup}=await import("react-dom/server");
  const {default:QuestionnaireWorkflow}=await import("../components/open-sna/QuestionnaireWorkflow");
  for(const locale of ["en","zh-hant","zh-hans"] as const){
    const text=getWorkflowCopy(locale);
    const html=renderToStaticMarkup(createElement(QuestionnaireWorkflow,{copy:getOpenSnaCopy(locale),locale,analysisDisabled:false,onResult:()=>{}}));
    assert.ok(html.includes(text.uploadNotice));
    assert.ok(html.includes(text.recoverHelp));
    assert.match(html,new RegExp('disabled=""[^>]*>'+text.run+'<'));
    assert.ok(html.includes(getOpenSnaCopy(locale).setup.chooseFileAria));
    assert.doesNotMatch(html,/type="checkbox"/,'confirmation is unavailable before R validation');
  }
});

test("a succeeded creation or cancellation receipt still retrieves its result",()=>{
  assert.equal(receiptDisplayStatus("succeeded"),"finalizing");
  assert.equal(receiptDisplayStatus("cancelled"),"cancelled");
  assert.equal(receiptDisplayStatus("running"),"running");
});

test("serialized metric tolerance and partial missingness suppress unsupported leaders",()=>{
  assert.equal(uniquePositiveLeader([{id:"A",strength:1},{id:"B",strength:0.9999995}],"strength"),null);
  assert.equal(uniquePositiveLeader([{id:"A",strength:1},{id:"B",strength:null}],"strength"),null);
});
test("strength interpretation needs acceptable strength stability",()=>{
  const demo=JSON.parse(readFileSync(new URL("../public/open-sna/programming-resilience-demo.json",import.meta.url),"utf8")) as OpenSnaResult;
  demo.stability.metrics.find(metric=>metric.id==="strength")!.coefficient=0.24;
  assert.equal(presentOpenSnaInsight(getOpenSnaCopy("en"),demo,{id:"central-node",title:"",evidence:"",text:""}).text,getWorkflowCopy("en").neutralStrength);
});
test("late creation and polling receipts cannot replace a terminal outcome",()=>{
  assert.equal(advanceJobReceipt("succeeded","queued"),"succeeded");
  assert.equal(advanceJobReceipt("cancelled","running"),"cancelled");
  assert.equal(advanceJobReceipt("expired","running"),"expired");
  assert.equal(advanceJobReceipt("running","succeeded"),"finalizing");
});
test("online reconnect and timer requests share one in-flight poll",async()=>{
  let calls=0;let finish:()=>void=()=>{};
  const poll=onePollAtATime(async()=>{calls++;await new Promise<void>(resolve=>{finish=resolve;});});
  const first=poll();const reconnect=poll();
  assert.equal(calls,1);assert.equal(first,reconnect);
  finish();await first;
  const next=poll();assert.equal(calls,2);finish();await next;
});

test("worker failures map only known codes to bounded localized messages",()=>{
  assert.deepEqual(jobFailureResponse("R_ANALYSIS_TIMEOUT"),{status:504,code:"R_ANALYSIS_TIMEOUT"});
  assert.deepEqual(jobFailureResponse("RESULT_INVALID"),{status:502,code:"R_ENGINE_CONTRACT_FAILED"});
  assert.deepEqual(jobFailureResponse("ATTEMPTS_EXHAUSTED"),{status:502,code:"R_ANALYSIS_FAILED"});
  assert.equal(jobFailureResponse("https://private.invalid/token=secret"),null);
});

test("explicit source switching clears completed task recovery and preserves unrelated storage",()=>{
  const store=new Map([[JOB_STORAGE_KEY,serializeSavedJob({jobId,locale:"en",createdAt:"2026-10-26T00:00:00Z"})],["theme","dark"]]);
  const storage={removeItem:(key:string)=>{store.delete(key);}};
  assert.equal(detachJobRecovery(true,storage),false,"an active job cannot be detached by source switching");
  assert.ok(store.has(JOB_STORAGE_KEY));
  assert.equal(detachJobRecovery(false,storage),true);
  assert.equal(parseSavedJob(store.get(JOB_STORAGE_KEY)??null),null,"refresh cannot restore the previous task over the chosen source");
  assert.equal(store.get("theme"),"dark");
});
test("a gateway creation failure stays recoverable with the same task and request",async()=>{
  const requests:FormData[]=[];const saved:string[]=[];let calls=0;
  const client=new OpenSnaJobClient({fetch:async(_url,init)=>{
    requests.push(init?.body as FormData);
    return ++calls===1?Response.json({code:"QUEUE_UNAVAILABLE"},{status:503}):Response.json({jobId,status:"queued",createdAt:"2026-10-26T00:00:00Z",expiresAt:"2026-10-27T00:00:00Z"},{status:202});
  },save:raw=>saved.push(raw)});
  assert.equal(await client.create({jobId,locale:"en",workbook:new File(["PK"],"a.xlsx"),selection,inputFingerprint:"sha256:"+"a".repeat(64),bootstraps:1000}),null);
  assert.equal(parseSavedJob(saved[0])?.jobId,jobId);
  assert.equal((await client.retry())?.jobId,jobId);
  assert.equal(requests[0],requests[1]);
});

test("a detached source cannot repersist its recovery ID from a late creation response",async()=>{
  let finish:(response:Response)=>void=()=>{};const saved:string[]=[];
  const client=new OpenSnaJobClient({fetch:async()=>new Promise<Response>(resolve=>{finish=resolve;}),save:raw=>saved.push(raw)});
  const pending=client.create({jobId,locale:"en",workbook:new File(["PK"],"a.xlsx"),selection,inputFingerprint:"sha256:"+"a".repeat(64),bootstraps:1000});
  client.clear();
  finish(Response.json({jobId,status:"queued",createdAt:"2026-10-26T00:00:00Z",expiresAt:"2026-10-27T00:00:00Z"},{status:202}));
  assert.equal(await pending,null);
  assert.equal(saved.length,1,"only pre-creation storage happened; source switching already removed it");
});

test("submitting a new analysis clears an old result and failure never presents the old completion",()=>{
  const previous=JSON.parse(readFileSync(new URL("../public/open-sna/programming-resilience-demo.json",import.meta.url),"utf8")) as OpenSnaResult;
  for(const locale of ["en","zh-hant","zh-hans"] as const){
    const copy=getWorkflowCopy(locale);
    const started=advanceWorkbenchTask({result:previous,message:copy.succeeded,error:null},{type:"start"},copy);
    assert.equal(started.result,null);assert.equal(started.message,copy.creating);
    const queued=advanceWorkbenchTask(started,{type:"status",status:"queued"},copy);
    assert.equal(queued.result,null);assert.equal(queued.message,copy.queued);
    const failed=advanceWorkbenchTask(queued,{type:"status",status:"failed"},copy);
    assert.equal(failed.result,null);assert.equal(failed.message,copy.failed);assert.equal(failed.error,copy.failed);
    assert.notEqual(failed.message,copy.succeeded);
    const cancelled=advanceWorkbenchTask(started,{type:"status",status:"cancelled"},copy);
    assert.equal(cancelled.message,copy.cancelled);assert.equal(cancelled.result,null);
  }
});

test("closed public analysis disables file selection and bootstrap changes in all locales",async()=>{
  const {createElement}=await import("react");
  const {renderToStaticMarkup}=await import("react-dom/server");
  const {default:QuestionnaireWorkflow}=await import("../components/open-sna/QuestionnaireWorkflow");
  for(const locale of ["en","zh-hant","zh-hans"] as const){
    const copy=getOpenSnaCopy(locale);
    const html=renderToStaticMarkup(createElement(QuestionnaireWorkflow,{copy,locale,analysisDisabled:true,onResult:()=>{}}));
    const file=html.match(/<input[^>]+id="research-workbook"[^>]*>/)?.[0]??"";
    const bootstrap=html.match(/<select[^>]+id="research-bootstrap"[^>]*>/)?.[0]??"";
    assert.ok(file.includes('disabled=""'),"file selection must be disabled");
    assert.ok(bootstrap.includes('disabled=""'),"bootstrap changes must be disabled");
    assert.ok(html.includes(copy.setup.uploadClosed));
    assert.ok(html.includes(copy.setup.uploadClosedDetail));
    assert.ok(html.includes(copy.setup.runUnavailable));
    assert.ok(!html.includes(getWorkflowCopy(locale).uploadNotice),"closed state must not invite inspection uploads");
  }
});
test("researcher workflow defaults to 500 bootstraps and includes approximate sample timing",async()=>{
  const {createElement}=await import("react");
  const {renderToStaticMarkup}=await import("react-dom/server");
  const {default:QuestionnaireWorkflow}=await import("../components/open-sna/QuestionnaireWorkflow");
  for(const locale of ["en","zh-hant","zh-hans"] as const){
    const copy=getOpenSnaCopy(locale);
    const html=renderToStaticMarkup(createElement(QuestionnaireWorkflow,{copy,locale,analysisDisabled:false,onResult:()=>{}}));
    assert.match(html,/<option value="500" selected="">/);
    assert.ok(html.includes(copy.setup.bootstrapTiming));
  }
});
