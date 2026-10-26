import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {Bucket} from '@google-cloud/storage';
import {GcsJobObjectStore} from '../lib/open-sna-job-store';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {FileJobObjectStore} from '../lib/open-sna-job-store';
import {OpenSnaJobs,fingerprint} from '../lib/open-sna-jobs';
import {enqueueJob} from '../lib/open-sna-job-config';

test('GCS uses generation-pinned reads and conditional write fencing',async()=>{
 let counter=0;const objects=new Map<string,{bytes:Buffer,generation:string}>(),pinned:string[]=[];
 const bucket={file:(key:string,options?:{generation?:string})=>({
  getMetadata:async()=>{const value=objects.get(key);if(!value)throw {code:404};return [{generation:value.generation}];},
  download:async()=>{const value=objects.get(key);assert.equal(options?.generation,value?.generation);pinned.push(options!.generation!);if(!value)throw {code:404};return [value.bytes];},
  save:async(bytes:Buffer,options:{preconditionOpts:{ifGenerationMatch:string|number}})=>{const old=objects.get(key),expected=String(options.preconditionOpts.ifGenerationMatch);if((old?.generation??'0')!==expected)throw {code:412};objects.set(key,{bytes,generation:String(++counter)});},
  delete:async()=>{objects.delete(key);}
 }),getFiles:async({prefix}:{prefix:string})=>[[...objects.keys()].filter(key=>key.startsWith(prefix)).map(name=>({name}))]};
 const store=new GcsJobObjectStore(bucket as unknown as Bucket);assert.equal(await store.read('state.json'),null);assert.equal(await store.write('state.json',Buffer.from('queued'),null),true);
 const first=await store.read('state.json');assert.ok(first);const results=await Promise.all([store.write('state.json',Buffer.from('cancelled'),first.version),store.write('state.json',Buffer.from('succeeded'),first.version)]);
 assert.deepEqual(results,[true,false]);assert.equal((await store.read('state.json'))?.bytes.toString(),'cancelled');assert.deepEqual(pinned,['1','2']);assert.deepEqual(await store.list('state'),['state.json']);
});
test('Cloud Task dispatch contains only an opaque job URL and verified OIDC identity',async t=>{
 const old={...process.env};t.after(()=>{for(const key of Object.keys(process.env))if(!(key in old))delete process.env[key];Object.assign(process.env,old);});
 Object.assign(process.env,{VERCEL:'',OPEN_SNA_R_WORKER_MODE:'1',OPEN_SNA_JOB_STORE:'gcs',OPEN_SNA_GCS_BUCKET:'sna-private-jobs',GOOGLE_CLOUD_PROJECT:'project-id',OPEN_SNA_TASKS_LOCATION:'asia-east2',OPEN_SNA_TASKS_QUEUE:'open-sna',OPEN_SNA_WORKER_ORIGIN:'https://worker.example.com',OPEN_SNA_TASKS_AUDIENCE:'https://worker.example.com',OPEN_SNA_TASKS_SERVICE_ACCOUNT:'tasks@project-id.iam.gserviceaccount.com'});
 const root=await mkdtemp(path.join(tmpdir(),'open-sna-cloud-dispatch-'));t.after(()=>rm(root,{recursive:true,force:true}));const jobs=new OpenSnaJobs(new FileJobObjectStore(root));
 let task:unknown,closed=false;const client={queuePath:()=> 'queue',taskPath:(_p:string,_l:string,_q:string,id:string)=>`queue/tasks/${id}`,createTask:async(request:unknown)=>{task=request;},getTask:async()=>[{}],close:async()=>{closed=true;}};const id=randomUUID();
 await jobs.create({jobId:id,bytes:Buffer.from('fake'),inputFingerprint:fingerprint('fake'),selection:{items:['A1','A2','A3','B1','B2','B3'].map(id=>({column:id,id,community:id[0],reverse:false})),groupColumn:'Gender'},bootstraps:100,permutations:1000,locale:'en'});
 await enqueueJob(id,client,jobs);const dispatched=task as {task:{name:string,dispatchDeadline:{seconds:number},httpRequest:{url:string,headers:Record<string,string>,oidcToken:{audience:string,serviceAccountEmail:string},body:string}}};
 assert.equal(dispatched.task.name,`queue/tasks/${id}-0`);assert.equal(dispatched.task.dispatchDeadline.seconds,900);assert.equal(dispatched.task.httpRequest.url,`https://worker.example.com/api/open-sna/internal/jobs/${id}/run`);assert.equal(dispatched.task.httpRequest.headers.Authorization,undefined);assert.equal(Buffer.from(dispatched.task.httpRequest.body,'base64').toString(),'{}');assert.equal(dispatched.task.httpRequest.oidcToken.audience,'https://worker.example.com');assert.equal(closed,true);
 await enqueueJob(id,{...client,createTask:async()=>{throw {code:6};}},jobs);
 await assert.rejects(enqueueJob(id,{...client,createTask:async()=>{throw {code:7,message:'private details'};}},jobs),/QUEUE_UNAVAILABLE/);
 let calls=0;const repair={...client,createTask:async(request:unknown)=>{calls++;if(calls===1)throw {code:6};task=request;},getTask:async()=>{throw {code:5};}};
 await enqueueJob(id,repair,jobs);assert.equal(calls,2);assert.equal((task as typeof dispatched).task.name,`queue/tasks/${id}-1`);assert.equal((await jobs.get(id))?.dispatchGeneration,1);
});

test('GCS read retries obsolete generation instead of reporting existing state missing',async()=>{
 let metadataReads=0,downloads=0;
 const bucket={file:(_key:string,options?:{generation?:string})=>({getMetadata:async()=>[{generation:String(++metadataReads)}],download:async()=>{downloads++;if(downloads===1)throw {code:404};assert.equal(options?.generation,'2');return [Buffer.from('current')];}})};
 const value=await new GcsJobObjectStore(bucket as unknown as Bucket).read('state.json');assert.equal(value?.bytes.toString(),'current');assert.equal(value?.version,'2');
});
