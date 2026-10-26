import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { FileJobObjectStore } from '../lib/open-sna-job-store';
import { OpenSnaJobs, fingerprint, type JobSubmission } from '../lib/open-sna-jobs';
import { runOpenSnaR, runOpenSnaJob } from '../lib/open-sna-runner';
const selection={items:['A1','A2','A3','B1','B2','B3'].map(id=>({column:id,id,community:id[0],reverse:false})),groupColumn:'Gender'};

test('R execution never exposes raw stderr and always removes temporary workbook',async t=>{
 const root=await mkdtemp(path.join(tmpdir(),'open-sna-execution-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await assert.rejects(runOpenSnaR({mode:'validate',bytes:Buffer.from('private rows'),selection,rscript:process.execPath,scriptPath:path.join(process.cwd(),'tests/fixtures/fake-open-sna-job-r.mjs'),temporaryRoot:root}),error=>error instanceof Error&&error.message==='WORKBOOK_INVALID');
 assert.deepEqual(await readdir(root),[]);
});
test('R execution time and diagnostic limits terminate process and discard uploads',async t=>{
 const root=await mkdtemp(path.join(tmpdir(),'open-sna-execution-'));t.after(()=>rm(root,{recursive:true,force:true}));
 for(const behavior of ['timeout','stderr']){
  await assert.rejects(runOpenSnaR({mode:'validate',bytes:Buffer.from(behavior),selection,rscript:process.execPath,scriptPath:path.join(process.cwd(),'tests/fixtures/fake-open-sna-job-r.mjs'),temporaryRoot:root,timeoutMs:100}),new RegExp(behavior==='timeout'?'R_ANALYSIS_TIMEOUT':'R_ANALYSIS_FAILED'));
  assert.deepEqual(await readdir(root),[]);
 }
});
test('worker persists result after independent client has gone, then another runner cannot rerun it',async t=>{
 const root=await mkdtemp(path.join(tmpdir(),'open-sna-runner-'));t.after(()=>rm(root,{recursive:true,force:true}));const jobs=new OpenSnaJobs(new FileJobObjectStore(root));
 const bytes=Buffer.from('PK\x03\x04'),input:JobSubmission={jobId:randomUUID(),bytes,selection,inputFingerprint:fingerprint(bytes),locale:'en',bootstraps:1000,permutations:1000};await jobs.create(input);let calls=0;
 const execute=async()=>{calls++;const result=JSON.parse(await readFile('public/open-sna/programming-resilience-demo.json','utf8'));result.inputFingerprint=input.inputFingerprint;result.dataSource='uploaded-workbook';result.source.fileName='Uploaded workbook';result.source.sheet='Uploaded worksheet';return result;};
 assert.equal(await runOpenSnaJob(jobs,input.jobId,execute),'done');
 assert.equal((await new OpenSnaJobs(new FileJobObjectStore(root)).get(input.jobId))?.status,'succeeded');
 assert.equal(await runOpenSnaJob(jobs,input.jobId,execute),'done');assert.equal(calls,1);
});

test('mapped execution rejects a legacy result that omits the confirmed selection',async t=>{
 const root=await mkdtemp(path.join(tmpdir(),'open-sna-execution-'));t.after(()=>rm(root,{recursive:true,force:true}));
 await assert.rejects(runOpenSnaR({mode:'analyze',bytes:Buffer.from('legacy-success'),selection,rscript:process.execPath,scriptPath:path.join(process.cwd(),'tests/fixtures/fake-open-sna-job-r.mjs'),temporaryRoot:root}),/RESULT_INVALID/);
});

test('separate runner process recovers persisted expired claim and restart does not rerun success',async t=>{
 const root=await mkdtemp(path.join(tmpdir(),'open-sna-process-restart-'));t.after(()=>rm(root,{recursive:true,force:true}));const store=new FileJobObjectStore(root),oldJobs=new OpenSnaJobs(store,()=>Date.now()-700_000);
 const result=JSON.parse(await readFile('public/open-sna/programming-resilience-demo.json','utf8'));const mapped={items:result.nodes.map((node:{id:string,community:string})=>({column:node.id,id:node.id,community:node.community,reverse:false})),groupColumn:result.source.groupColumn};
 const bytes=Buffer.from('PK\x03\x04synthetic'),input:JobSubmission={jobId:randomUUID(),bytes,selection:mapped,inputFingerprint:fingerprint(bytes),locale:'en',bootstraps:1000,permutations:1000};await oldJobs.create(input);assert.ok(await oldJobs.claim(input.jobId));
 const {spawn}=await import('node:child_process');const execute=()=>new Promise<void>((resolve,reject)=>{
  const child=spawn(process.execPath,['--import','tsx','scripts/open-sna-worker.ts','--once'],{cwd:process.cwd(),stdio:['ignore','pipe','pipe'],env:{...process.env,VERCEL:'',OPEN_SNA_R_DISABLED:'',OPEN_SNA_R_WORKER_MODE:'',OPEN_SNA_JOB_STORE:'filesystem',OPEN_SNA_JOB_ROOT:root,OPEN_SNA_RSCRIPT_BIN:path.join(process.cwd(),'tests/fixtures/fake-open-sna-durable-success.mjs')}});let error='';child.stderr.on('data',data=>error+=data);child.once('error',reject);child.once('close',code=>code===0?resolve():reject(new Error(error)));
 });
 await execute();const jobs=new OpenSnaJobs(store);const complete=await jobs.get(input.jobId);assert.equal(complete?.status,'succeeded');assert.equal(complete?.attempts,2);await assert.rejects(jobs.inputs(input.jobId),/INPUT_UNAVAILABLE/);
 await execute();assert.equal((await jobs.get(input.jobId))?.attempts,2);
});

test('SIGKILL of an active caller stops orphan R and startup sweep removes abandoned source',async t=>{
 const runtimeRoot=await mkdtemp(path.join(tmpdir(),'open-sna-killed-runtime-'));t.after(()=>rm(runtimeRoot,{recursive:true,force:true}));const {spawn}=await import('node:child_process');
 const child=spawn(process.execPath,['--import','tsx','tests/fixtures/open-sna-crash-process.ts',runtimeRoot],{cwd:process.cwd(),stdio:['ignore','ignore','pipe']});
 t.after(()=>{try{child.kill('SIGKILL');}catch{}});
 let owner:{runtimePid?:number}|undefined;
 for(let tries=0;tries<80;tries++){
  const directories=await readdir(runtimeRoot);if(directories.length){try{owner=JSON.parse(await readFile(path.join(runtimeRoot,directories[0],'owner.json'),'utf8'));}catch{}}
  if(owner?.runtimePid)break;await new Promise(resolve=>setTimeout(resolve,50));
 }
 assert.ok(owner?.runtimePid,'running process must publish its runtime owner');child.kill('SIGKILL');await new Promise(resolve=>child.once('close',resolve));
 let alive=true;for(let tries=0;tries<80;tries++){try{process.kill(owner.runtimePid,0);}catch{alive=false;break;}await new Promise(resolve=>setTimeout(resolve,50));}
 assert.equal(alive,false,'supervisor must stop after its caller is killed');
 const {sweepOpenSnaRuntime}=await import('../lib/open-sna-runner');await sweepOpenSnaRuntime(runtimeRoot,Date.now()+6000);assert.deepEqual(await readdir(runtimeRoot),[]);
});

test('runtime sweep preserves live attempts and bounds malformed crash metadata retention',async t=>{
 const root=await mkdtemp(path.join(tmpdir(),'open-sna-sweep-'));t.after(()=>rm(root,{recursive:true,force:true}));const {mkdir,writeFile,utimes}=await import('node:fs/promises');const {sweepOpenSnaRuntime}=await import('../lib/open-sna-runner');
 const live=path.join(root,'job-live'),broken=path.join(root,'job-broken');await mkdir(live);await mkdir(broken);const now=Date.now();
 await writeFile(path.join(live,'owner.json'),JSON.stringify({schemaVersion:'1.0',createdAt:now-6000,expiresAt:now+5000,parentPid:process.pid,runtimePid:null}));await writeFile(path.join(live,'input.xlsx'),'live private input');
 await writeFile(path.join(broken,'owner.json'),'{');await writeFile(path.join(broken,'input.xlsx'),'abandoned private input');await utimes(broken,new Date(now-86_400_001),new Date(now-86_400_001));
 await sweepOpenSnaRuntime(root,now);assert.deepEqual(await readdir(root),['job-live']);
});

test('disabled local worker still performs expiry and source cleanup',async t=>{
 const root=await mkdtemp(path.join(tmpdir(),'open-sna-disabled-worker-'));t.after(()=>rm(root,{recursive:true,force:true}));const store=new FileJobObjectStore(root),oldJobs=new OpenSnaJobs(store,()=>Date.now()-86_401_000),bytes=Buffer.from('PK\x03\x04');const id=randomUUID();
 await oldJobs.create({jobId:id,bytes,selection,inputFingerprint:fingerprint(bytes),bootstraps:100,permutations:1000,locale:'en'});
 const {spawn}=await import('node:child_process');await new Promise<void>((resolve,reject)=>{
 const child=spawn(process.execPath,['--import','tsx','scripts/open-sna-worker.ts','--once'],{cwd:process.cwd(),stdio:['ignore','ignore','pipe'],env:{...process.env,VERCEL:'',OPEN_SNA_R_DISABLED:'1',OPEN_SNA_R_WORKER_MODE:'',OPEN_SNA_JOB_STORE:'filesystem',OPEN_SNA_JOB_ROOT:root}});let error='';child.stderr.on('data',data=>error+=data);child.once('close',code=>code===0?resolve():reject(new Error(error)));child.once('error',reject);
 });
 assert.equal(JSON.parse((await store.read(`jobs/${id}/state.json`))!.bytes.toString()).status,'expired');assert.deepEqual(await store.list(`jobs/${id}/`),[`jobs/${id}/state.json`]);
});

async function expiredJobAt(root:string){
 const store=new FileJobObjectStore(root),jobs=new OpenSnaJobs(store,()=>Date.now()-86_401_000),bytes=Buffer.from('PK\x03\x04'),id=randomUUID();
 await jobs.create({jobId:id,bytes,selection,inputFingerprint:fingerprint(bytes),bootstraps:100,permutations:1000,locale:'en'});
 return {id,status:async()=>JSON.parse((await store.read(`jobs/${id}/state.json`))!.bytes.toString()).status as string};
}
async function workerInIsolatedDirectory(cwd:string,mode:'development'|'production',explicitRoot?:string){
 const {spawn}=await import('node:child_process');const env:NodeJS.ProcessEnv={...process.env,NODE_ENV:mode};
 for(const key of ['OPEN_SNA_JOB_ROOT','OPEN_SNA_JOB_STORE','OPEN_SNA_R_DISABLED','OPEN_SNA_R_WORKER_MODE','VERCEL','__NEXT_PROCESSED_ENV'])delete env[key];
 if(explicitRoot)env.OPEN_SNA_JOB_ROOT=explicitRoot;
 return new Promise<string>((resolve,reject)=>{
  const child=spawn(process.execPath,['--import',require.resolve('tsx'),path.join(process.cwd(),'scripts/open-sna-worker.ts'),'--once'],{cwd,env,stdio:['ignore','pipe','pipe']});let output='';child.stdout.on('data',data=>output+=data);child.stderr.on('data',data=>output+=data);child.once('error',reject);child.once('close',code=>code===0?resolve(output):reject(new Error(output)));
 });
}
test('standalone worker reads a .env.local-only job root in the same project directory',async t=>{
 const cwd=await mkdtemp(path.join(tmpdir(),'open-sna-env-local-'));t.after(()=>rm(cwd,{recursive:true,force:true}));const root=path.join(cwd,'configured jobs');const pending=await expiredJobAt(root);const {writeFile}=await import('node:fs/promises');
 await writeFile(path.join(cwd,'.env.local'),`OPEN_SNA_JOB_ROOT="${root}"\nOPEN_SNA_R_DISABLED=1\nOPEN_SNA_JOB_STORE=filesystem\nTEST_PRIVATE_ENV_VALUE=must-not-be-logged\n`);
 const output=await workerInIsolatedDirectory(cwd,'development');assert.equal(await pending.status(),'expired');assert.equal(output.includes(root),false);assert.equal(output.includes('must-not-be-logged'),false);assert.equal(output.includes(pending.id),false);
});
test('standalone worker uses Next development/production precedence and explicit environment wins',async t=>{
 const cwd=await mkdtemp(path.join(tmpdir(),'open-sna-env-modes-'));t.after(()=>rm(cwd,{recursive:true,force:true}));const {writeFile}=await import('node:fs/promises');
 const roots={common:path.join(cwd,'common'),development:path.join(cwd,'development'),production:path.join(cwd,'production'),explicit:path.join(cwd,'explicit')};const jobs={common:await expiredJobAt(roots.common),development:await expiredJobAt(roots.development),production:await expiredJobAt(roots.production),explicit:await expiredJobAt(roots.explicit)};
 await writeFile(path.join(cwd,'.env.local'),`OPEN_SNA_JOB_ROOT=${roots.common}\nOPEN_SNA_R_DISABLED=1\nOPEN_SNA_JOB_STORE=filesystem\n`);
 await writeFile(path.join(cwd,'.env.development.local'),`OPEN_SNA_JOB_ROOT=${roots.development}\n`);await writeFile(path.join(cwd,'.env.production.local'),`OPEN_SNA_JOB_ROOT=${roots.production}\n`);
 await workerInIsolatedDirectory(cwd,'development');assert.equal(await jobs.development.status(),'expired');assert.equal(await jobs.production.status(),'queued');assert.equal(await jobs.common.status(),'queued');
 await workerInIsolatedDirectory(cwd,'production');assert.equal(await jobs.production.status(),'expired');assert.equal(await jobs.common.status(),'queued');
 await workerInIsolatedDirectory(cwd,'development',roots.explicit);assert.equal(await jobs.explicit.status(),'expired');assert.equal(await jobs.common.status(),'queued');
});
