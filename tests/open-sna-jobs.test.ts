import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { FileJobObjectStore } from '../lib/open-sna-job-store';
import { OpenSnaJobs, fingerprint, type JobSubmission } from '../lib/open-sna-jobs';

const workbook = Buffer.from('PK\x03\x04private respondent data');
const selection = { items: ['A1','A2','A3','B1','B2','B3'].map(id => ({column:id,id,community:id[0],reverse:false})),groupColumn:'Gender'};
const submission = (): JobSubmission => ({jobId:randomUUID(),bytes:workbook,selection,inputFingerprint:fingerprint(workbook),bootstraps:100,permutations:1000,locale:'en'});
async function setup(t: any) {
  const root = await mkdtemp(path.join(tmpdir(),'open-sna-store-test-'));
  t.after(() => rm(root,{recursive:true,force:true}));
  let now = Date.now();
  const store = new FileJobObjectStore(root);
  return {store,root,jobs:new OpenSnaJobs(store,()=>now),advance:(ms:number)=>{now+=ms}};
}
async function aggregate(input:JobSubmission) {
  const result=JSON.parse(await readFile(path.join(process.cwd(),'public/open-sna/programming-resilience-demo.json'),'utf8'));
  result.dataSource='uploaded-workbook'; result.inputFingerprint=input.inputFingerprint;
  result.settings.bootstrapReplicates=100; result.stability.bootstraps=100; result.source.fileName='Uploaded workbook';result.source.sheet='Uploaded worksheet';
  return result;
}

test('parallel identical submissions create one durable job and conflicting payload is rejected',async t=>{
 const {jobs,store}=await setup(t);const input=submission();
 const results=await Promise.all(Array.from({length:8},()=>jobs.create(input)));
 assert.equal(new Set(results.map(x=>x.jobId)).size,1);
 await assert.rejects(jobs.create({...input,locale:'zh-hant'}),/IDEMPOTENCY_CONFLICT/);
 const metadata=(await store.read(`jobs/${input.jobId}/state.json`))!.bytes.toString();
 assert.equal(metadata.includes('respondent'),false);assert.equal(metadata.includes('Gender'),false);assert.equal(metadata.includes('A1'),false);
 assert.equal((await jobs.get(input.jobId))?.status,'queued');
});
test('CAS permits one winner across independent filesystem store instances',async t=>{
 const {store,root}=await setup(t);const other=new FileJobObjectStore(root);
 const winners=await Promise.all(Array.from({length:16},(_,i)=>(i%2?store:other).write('one.json',Buffer.from(String(i)),null)));
 assert.equal(winners.filter(Boolean).length,1);
});
test('cancel fences late success and deletes confidential artifacts',async t=>{
 const {jobs,store}=await setup(t);const input=submission();await jobs.create(input);const lease=await jobs.claim(input.jobId);assert.ok(lease);
 await jobs.cancel(input.jobId);assert.equal(await jobs.complete(input.jobId,lease.token,await aggregate(input)),false);
 assert.equal((await jobs.get(input.jobId))?.status,'cancelled');
 assert.deepEqual(await store.list(`jobs/${input.jobId}/`),[`jobs/${input.jobId}/state.json`]);
});
test('a new worker recovers stale lease and old attempt cannot overwrite new result',async t=>{
 const {jobs,store,advance}=await setup(t);const input=submission();await jobs.create(input);const old=await jobs.claim(input.jobId);assert.ok(old);
 assert.equal(await jobs.claim(input.jobId),null);advance(661_000);
 const fresh=await jobs.claim(input.jobId);assert.ok(fresh);assert.notEqual(fresh.token,old.token);
 assert.equal(await jobs.complete(input.jobId,old.token,await aggregate(input)),false);
 assert.equal(await jobs.complete(input.jobId,fresh.token,await aggregate(input)),true);
 const restarted=new OpenSnaJobs(store);assert.equal((await restarted.get(input.jobId))?.status,'succeeded');
 assert.equal(await jobs.claim(input.jobId),null);
});
test('global lease limits execution to one job and transient attempts are bounded',async t=>{
 const {jobs}=await setup(t);const a=submission(),b=submission();await jobs.create(a);await jobs.create(b);
 for(let attempt=1;attempt<=3;attempt++) {
 const lease=await jobs.claim(a.jobId);assert.ok(lease);assert.equal(await jobs.claim(b.jobId),null);
 await jobs.fail(a.jobId,lease.token,'R_RUNTIME_NOT_READY',true);
 }
 assert.equal((await jobs.get(a.jobId))?.status,'failed');assert.ok(await jobs.claim(b.jobId));
});
test('expiry removes source, selection, and aggregate result but retains bounded tombstone',async t=>{
 const {jobs,store,advance}=await setup(t);const input=submission();await jobs.create(input);advance(86_400_001);
 assert.equal((await jobs.get(input.jobId))?.status,'expired');assert.equal(await jobs.claim(input.jobId),null);
 assert.deepEqual(await store.list(`jobs/${input.jobId}/`),[`jobs/${input.jobId}/state.json`]);
});
test('finalization has one winner, is persisted, and rejects statistical mutations',async t=>{
 const {jobs}=await setup(t);const input=submission();await jobs.create(input);const run=await jobs.claim(input.jobId);assert.ok(run);await jobs.complete(input.jobId,run.token,await aggregate(input));
 const claims=await Promise.all(Array.from({length:8},()=>jobs.claimFinalization(input.jobId)));
 assert.equal(claims.filter(Boolean).length,1);const claim=claims.find(Boolean)!;
 const tampered=structuredClone(claim.result);tampered.overview.density=0.7;
 await assert.rejects(jobs.commitFinalization(input.jobId,claim.token,tampered),/RESULT_INVALID/);
 assert.equal(await jobs.commitFinalization(input.jobId,claim.token,claim.result),true);
 assert.deepEqual(await jobs.result(input.jobId),claim.result);assert.equal(await jobs.claimFinalization(input.jobId),null);
});
test('abandoned finalization falls back after lease without a second provider call',async t=>{
 const {jobs,advance}=await setup(t);const input=submission();await jobs.create(input);const run=await jobs.claim(input.jobId);assert.ok(run);await jobs.complete(input.jobId,run.token,await aggregate(input));
 assert.ok(await jobs.claimFinalization(input.jobId));advance(61_000);
 assert.equal(await jobs.claimFinalization(input.jobId),null);assert.ok(await jobs.result(input.jobId));
});

test('cancellation retains execution slot until the old runner has actually stopped',async t=>{
 const {jobs}=await setup(t);const a=submission(),b=submission();await jobs.create(a);await jobs.create(b);const lease=await jobs.claim(a.jobId);assert.ok(lease);await jobs.cancel(a.jobId);
 assert.equal(await jobs.claim(b.jobId),null);await jobs.complete(a.jobId,lease.token,await aggregate(a));assert.ok(await jobs.claim(b.jobId));
});
test('terminal cleanup removes confidential bytes from the SQLite database and WAL',async t=>{
 const {jobs,root}=await setup(t);const input=submission();await jobs.create(input);await jobs.cancel(input.jobId);
 const {readdir}=await import('node:fs/promises');
 for(const file of await readdir(root)){if(file.endsWith('-shm'))continue;const bytes=await readFile(path.join(root,file));assert.equal(bytes.includes(Buffer.from('private respondent data')),false);assert.equal(bytes.includes(Buffer.from('"groupColumn":"Gender"')),false);}
});

test('SQLite CAS coordinates separate OS processes',async t=>{
 const {root}=await setup(t);const {spawn}=await import('node:child_process');
 const outcomes=await Promise.all(Array.from({length:6},(_,i)=>new Promise<string>((resolve,reject)=>{
  const child=spawn(process.execPath,['--import','tsx','tests/fixtures/open-sna-store-process.ts',root,String(i)],{cwd:process.cwd(),stdio:['ignore','pipe','pipe']});let output='',error='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>error+=data);child.once('error',reject);child.once('close',code=>code===0?resolve(output.trim()):reject(new Error(error)));
 })));
 assert.equal(outcomes.filter(value=>value==='winner').length,1);
});

test('a crashed partial upload becomes bounded failure instead of staying queued for a day',async t=>{
 const {jobs,store,advance}=await setup(t);const input=submission();await jobs.create(input);const key=`jobs/${input.jobId}/state.json`,current=await store.read(key);assert.ok(current);await store.write(key,Buffer.from(JSON.stringify({...JSON.parse(current.bytes.toString()),ready:false})),current.version);await store.delete(`jobs/${input.jobId}/selection.json`);advance(180_001);
 const state=await jobs.get(input.jobId);assert.equal(state?.status,'failed');assert.equal(state?.code,'UPLOAD_INCOMPLETE');assert.deepEqual(await store.list(`jobs/${input.jobId}/`),[key]);
});
