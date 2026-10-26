import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import { handleOpenSnaForm, handleOpenSnaJob, readBoundedBytes } from '../lib/open-sna-http';
import { verifyTaskRequest, readJobConfiguration } from '../lib/open-sna-job-config';
import { fingerprint } from '../lib/open-sna-jobs';
const selection={items:['A1','A2','A3','B1','B2','B3'].map(id=>({column:id,id,community:id[0],reverse:false})),groupColumn:'Gender'};
const bytes=Buffer.from('PK\x03\x04private row');
function request(id=randomUUID(),override?:{fingerprint?:string,selection?:unknown}){const form=new FormData();form.set('workbook',new Blob([bytes]),'participant-names.xlsx');form.set('selection',JSON.stringify(override?.selection??selection));form.set('inputFingerprint',override?.fingerprint??fingerprint(bytes));form.set('bootstraps','100');form.set('permutations','1000');form.set('locale','en');return new Request('http://localhost/api/open-sna/jobs',{method:'POST',headers:{'Idempotency-Key':id},body:form});}
const valid=()=>({schemaVersion:'1.1',valid:true,inputFingerprint:fingerprint(bytes),selection,summary:{originalRows:40,analyzedRows:40,droppedRows:0,itemCount:6,communityCount:2,groupColumn:'Gender',groupCounts:[{group:'A',n:20},{group:'B',n:20}]}});
async function environment(t:any,updates:Record<string,string|undefined>){const old={...process.env};for(const [key,value]of Object.entries(updates))if(value===undefined)delete process.env[key];else process.env[key]=value;t.after(()=>{for(const key of Object.keys(process.env))if(!(key in old))delete process.env[key];Object.assign(process.env,old);});}

test('Vercel fails closed when durable remote worker is missing',async t=>{
 await environment(t,{VERCEL:'1',OPEN_SNA_R_API_URL:undefined,OPEN_SNA_R_API_TOKEN:undefined,OPEN_SNA_R_WORKER_MODE:undefined});
 const response=await handleOpenSnaForm(request(),'jobs');assert.equal(response.status,503);assert.equal((await response.json()).code,'R_ENGINE_NOT_CONFIGURED');
});
test('worker rejects bearer credentials before processing workbook',async t=>{
 await environment(t,{VERCEL:undefined,OPEN_SNA_R_WORKER_MODE:'1',OPEN_SNA_R_WORKER_TOKEN:'test-valid-token-12345678901234567890',OPEN_SNA_R_API_URL:undefined});
 const response=await handleOpenSnaForm(request(),'jobs');assert.equal(response.status,401);
});
test('disabled analysis rejects create and polling without starting R',async t=>{
 await environment(t,{OPEN_SNA_R_DISABLED:'1'});assert.equal((await handleOpenSnaForm(request(),'jobs')).status,503);assert.equal((await handleOpenSnaJob(new Request('http://localhost'),randomUUID(),'status')).status,503);
});
test('upload is revalidated, stale fingerprint rejected, and receipt hides private details',async t=>{
 const root=await mkdtemp(path.join(tmpdir(),'open-sna-http-'));t.after(()=>rm(root,{recursive:true,force:true}));await environment(t,{VERCEL:undefined,OPEN_SNA_R_DISABLED:undefined,OPEN_SNA_R_WORKER_MODE:undefined,OPEN_SNA_R_API_URL:undefined,OPEN_SNA_R_API_TOKEN:undefined,OPEN_SNA_JOB_STORE:'filesystem',OPEN_SNA_JOB_ROOT:root});let validations=0;
 const run=async()=>{validations++;return valid();};const id=randomUUID();
 const stale=await handleOpenSnaForm(request(id,{fingerprint:'sha256:'+'a'.repeat(64)}),'jobs',run);assert.equal(stale.status,409);assert.equal(validations,0);
 const accepted=await handleOpenSnaForm(request(id),'jobs',run);assert.equal(accepted.status,202);assert.equal(validations,1);const receipt=await accepted.json();assert.equal(receipt.jobId,id);assert.equal(receipt.status,'queued');assert.equal(JSON.stringify(receipt).includes('participant'),false);assert.equal(JSON.stringify(receipt).includes('Gender'),false);
 const cancel=await handleOpenSnaJob(new Request('http://localhost',{method:'DELETE'}),id,'cancel');assert.equal((await cancel.json()).status,'cancelled');
 const pending=await handleOpenSnaJob(new Request('http://localhost'),id,'result');assert.equal(pending.status,409);
});
test('bounded request reader enforces limit even without content-length',async()=>{
 const request=new Request('http://localhost',{method:'POST',body:new ReadableStream({start(c){c.enqueue(new Uint8Array(10));c.enqueue(new Uint8Array(10));c.close();}}),duplex:'half'} as RequestInit);
 await assert.rejects(readBoundedBytes(request,15),/PAYLOAD_TOO_LARGE/);
});
test('OIDC requires exact audience and verified configured service identity',async t=>{
 await environment(t,{OPEN_SNA_WORKER_ORIGIN:'https://worker.example.com',OPEN_SNA_TASKS_AUDIENCE:'https://worker.example.com',OPEN_SNA_TASKS_SERVICE_ACCOUNT:'tasks@project.iam.gserviceaccount.com'});
 const req=new Request('https://worker.example.com/api/open-sna/internal/jobs/x/run',{headers:{Authorization:'Bearer fake-oidc'}});
 const payload={aud:'https://worker.example.com',iss:'https://accounts.google.com',email:'tasks@project.iam.gserviceaccount.com',email_verified:true};
 assert.equal(await verifyTaskRequest(req,async token=>{assert.equal(token,'fake-oidc');return payload;}),true);
 for(const changed of [{aud:'https://worker.example.com/'},{email:'other@project.iam.gserviceaccount.com'},{email_verified:false},{iss:'https://attacker.example'}])assert.equal(await verifyTaskRequest(req,async()=>({...payload,...changed})),false);
 assert.equal(await verifyTaskRequest(new Request('https://worker.example.com'),async()=>payload),false);
});
test('production worker refuses filesystem durability and incomplete GCS queue configuration',async t=>{
 await environment(t,{OPEN_SNA_R_WORKER_MODE:'1',OPEN_SNA_JOB_STORE:'filesystem',VERCEL:undefined});assert.throws(readJobConfiguration,/WORKER_CONFIGURATION_INVALID/);
 process.env.OPEN_SNA_JOB_STORE='gcs';delete process.env.OPEN_SNA_GCS_BUCKET;assert.throws(readJobConfiguration,/WORKER_CONFIGURATION_INVALID/);
});

test('maintenance repairs enqueue gap and sweeps expiry without rerunning completed jobs',async t=>{
 const {reconcileOpenSnaJobs}=await import('../lib/open-sna-job-config');const {FileJobObjectStore}=await import('../lib/open-sna-job-store');const {OpenSnaJobs}=await import('../lib/open-sna-jobs');
 const root=await mkdtemp(path.join(tmpdir(),'open-sna-maintenance-'));t.after(()=>rm(root,{recursive:true,force:true}));let now=Date.now();const jobs=new OpenSnaJobs(new FileJobObjectStore(root),()=>now),id=randomUUID();
 await jobs.create({jobId:id,bytes,selection,inputFingerprint:fingerprint(bytes),bootstraps:100,permutations:1000,locale:'en'});const dispatched:string[]=[];
 assert.equal(await reconcileOpenSnaJobs(jobs,async id=>{dispatched.push(id);}),1);assert.deepEqual(dispatched,[id]);
 now+=86_400_001;assert.equal(await reconcileOpenSnaJobs(jobs,async()=>{throw new Error('must not enqueue expired');}),0);assert.equal((await jobs.get(id))?.status,'expired');
});
