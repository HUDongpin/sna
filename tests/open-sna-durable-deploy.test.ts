import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, chmod, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const repository = path.resolve(import.meta.dirname, '..');
const script = path.join(repository, 'scripts/deploy-open-sna-worker-cloud-run.sh');
const origin = 'https://worker.example.run.app';
const bucket = 'sna-test-private-jobs';
const worker = 'open-sna-r-worker@test-project.iam.gserviceaccount.com';
const identity = 'open-sna-tasks@test-project.iam.gserviceaccount.com';

// This executable is the only gcloud on the child process PATH. Every invocation
// is captured as argv; no Google SDK, network request, or cloud credential is used.
const fakeGcloud = `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2), command = args.slice(0, 4).join(' ');
fs.appendFileSync(process.env.FAKE_GCLOUD_LOG, JSON.stringify(args) + '\\n');
let state = {}; try { state = JSON.parse(fs.readFileSync(process.env.FAKE_GCLOUD_STATE, 'utf8')); } catch {}
const save = () => fs.writeFileSync(process.env.FAKE_GCLOUD_STATE, JSON.stringify(state));
const out = value => { console.log(typeof value === 'string' ? value : JSON.stringify(value)); process.exit(0); };
if (args.slice(0, 2).join(' ') === 'projects describe') out('123456789');
if (command.startsWith('storage buckets describe ')) {
  if (process.env.FAKE_BUCKET === 'unreadable') { console.error('PERMISSION_DENIED'); process.exit(1); }
  if (process.env.FAKE_BUCKET === 'missing' && !state.bucketCreated) { console.error('HTTPError 404: bucket not found'); process.exit(1); }
  const metadata = {name: '${bucket}', projectNumber: '123456789', labels: {app:'open-sna',purpose:'durable-jobs','managed-by':'open-sna-worker-deploy'}, iamConfiguration:{publicAccessPrevention:'enforced',uniformBucketLevelAccess:{enabled:true}}, softDeletePolicy:{retentionDurationSeconds:'0'}, versioning:{enabled:false}, defaultEventBasedHold:false, lifecycle:{rule:[{action:{type:'Delete'},condition:{age:1,matchesPrefix:['jobs/']}}]}};
  if (process.env.FAKE_BUCKET === 'unrelated') metadata.labels.purpose = 'archive';
  if (process.env.FAKE_BUCKET === 'wrong-project') metadata.projectNumber = '999999999';
  if (process.env.FAKE_BUCKET === 'retained') metadata.retentionPolicy = {retentionPeriod:'86400'};
  if (process.env.FAKE_BUCKET === 'held') metadata.defaultEventBasedHold = true;
  if (process.env.FAKE_BUCKET === 'unsafe-after-update' && state.bucketUpdated) metadata.softDeletePolicy.retentionDurationSeconds = '604800';
  out(metadata);
}
if (command.startsWith('storage buckets create ')) { state.bucketCreated=true; save(); }
if (command.startsWith('storage buckets update ')) { state.bucketUpdated=true; save(); }
if (command.startsWith('run services describe ')) {
  if (state.deployed || process.env.FAKE_RESOURCES_EXIST === '1') out('${origin}');
  console.error('NOT_FOUND'); process.exit(1);
}
if (args.slice(0, 2).join(' ') === 'run deploy') { state.deployed=true; save(); }
if (command.startsWith('tasks queues describe ') && process.env.FAKE_RESOURCES_EXIST === '1') {
  out(process.env.FAKE_QUEUE === 'overridden' ? {httpTarget:{uriOverride:{host:'unrelated.example'}}} : {state:process.env.FAKE_QUEUE === 'paused' ? 'PAUSED' : 'RUNNING'});
}
if (args.includes('describe') && !args.includes('buckets') && process.env.FAKE_RESOURCES_EXIST !== '1') process.exit(1);
`;

async function runDeployment(t: {after: (fn: () => Promise<void>) => void}, options: {bucket?: string; existing?: boolean; missing?: string; queue?:string} = {}) {
    const directory = await mkdtemp(path.join(tmpdir(), 'sna-deploy-test-'));
    t.after(() => rm(directory, {recursive:true, force:true}));
    await writeFile(path.join(directory, 'gcloud'), fakeGcloud);
    await chmod(path.join(directory, 'gcloud'), 0o700);
    const token = 'local-test-token-that-is-not-a-cloud-secret-00000000';
    const tokenPath = path.join(directory, 'token');
    await writeFile(tokenPath, token, {mode:0o600});
    const log = path.join(directory, 'calls.jsonl');
    await writeFile(log, '');
    const env: NodeJS.ProcessEnv = {
        PATH: `${directory}:${process.env.PATH}`, HOME: directory, NODE_ENV:'test',
        OPEN_SNA_GCP_PROJECT_ID:'test-project', OPEN_SNA_WORKER_TOKEN_FILE:tokenPath,
        OPEN_SNA_GCS_BUCKET:bucket, OPEN_SNA_TASKS_QUEUE:'open-sna-test-jobs',
        FAKE_GCLOUD_LOG:log, FAKE_GCLOUD_STATE:path.join(directory, 'state.json'),
        FAKE_BUCKET:options.bucket || 'missing', FAKE_RESOURCES_EXIST:options.existing ? '1' : '0',
        FAKE_QUEUE:options.queue || 'safe',
    };
    if (options.missing) delete env[options.missing];
    const result = spawnSync('bash', [script], {cwd:repository, env, encoding:'utf8'});
    const calls = (await readFile(log, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line) as string[]);
    assert.ok(!result.stdout.includes(token) && !result.stderr.includes(token));
    assert.ok(!JSON.stringify(calls).includes(token));
    return {...result, calls};
}

const matches = (call:string[], command:string) => call.slice(0, command.split(' ').length).join(' ') === command;
function findCall(calls:string[][], command:string) {
    const call = calls.find(item => matches(item, command));
    assert.ok(call, `Expected ${command}`);
    return call;
}
function value(call:string[], flag:string) { return call[call.indexOf(flag) + 1]; }

test('durable deployment provisions a private bounded bucket, queue and OIDC maintenance without cloud execution', async t => {
    const result = await runDeployment(t);
    assert.equal(result.status, 0, result.stderr);
    const {calls} = result;
    const enabled = findCall(calls, 'services enable');
    for (const api of ['storage.googleapis.com','cloudtasks.googleapis.com','cloudscheduler.googleapis.com']) assert.ok(enabled.includes(api));
    const create = findCall(calls, 'storage buckets create');
    assert.equal(create[3], `gs://${bucket}`);
    assert.ok(create.includes('--uniform-bucket-level-access') && create.includes('--public-access-prevention'));
    const storage = findCall(calls, 'storage buckets update');
    for (const flag of ['--clear-soft-delete','--no-versioning','--clear-retention-period','--no-default-event-based-hold','--uniform-bucket-level-access','--public-access-prevention']) assert.ok(storage.includes(flag), flag);
    const lifecycle = JSON.parse(await readFile(value(storage, '--lifecycle-file'), 'utf8'));
    assert.deepEqual(lifecycle, {rule:[{action:{type:'Delete'},condition:{age:1,matchesPrefix:['jobs/']}}]});
    const queue = findCall(calls, 'tasks queues create');
    assert.equal(queue[3], 'open-sna-test-jobs');
    assert.equal(value(queue, '--max-concurrent-dispatches'), '1');
    assert.ok(Number(value(queue, '--max-attempts')) >= 4);
    const queueRoles = calls.filter(call => matches(call, 'tasks queues add-iam-policy-binding'));
    assert.deepEqual(queueRoles.map(call => value(call, '--role')).sort(), ['roles/cloudtasks.enqueuer','roles/cloudtasks.viewer']);
    assert.ok(queueRoles.every(call => call[3] === 'open-sna-test-jobs' && value(call, '--member') === `serviceAccount:${worker}`));
    const objectRole = findCall(calls, 'storage buckets add-iam-policy-binding');
    assert.equal(objectRole[3], `gs://${bucket}`);
    assert.equal(value(objectRole, '--role'), 'roles/storage.objectAdmin');
    assert.equal(value(objectRole, '--member'), `serviceAccount:${worker}`);
    const actAs = findCall(calls, 'iam service-accounts add-iam-policy-binding');
    assert.equal(actAs[3], identity);
    assert.equal(value(actAs, '--member'), `serviceAccount:${worker}`);
    assert.equal(value(actAs, '--role'), 'roles/iam.serviceAccountUser');
    assert.ok(!calls.some(call => matches(call, 'projects add-iam-policy-binding')), 'Runtime roles must be resource scoped');
    const deploy = findCall(calls, 'run deploy');
    assert.equal(deploy[2], 'open-sna-durable-worker', 'Stage alongside the old synchronous worker');
    assert.equal(value(deploy, '--set-secrets'), 'OPEN_SNA_R_WORKER_TOKEN=open-sna-durable-worker-token:latest');
    assert.equal(value(deploy, '--timeout'), '900');
    assert.equal(value(deploy, '--cpu'), '8');
    assert.equal(value(deploy, '--memory'), '16Gi');
    assert.equal(value(deploy, '--concurrency'), '8', 'Status, cancellation and maintenance must share the instance with the long task request');
    assert.equal(value(deploy, '--max-instances'), '1');
    assert.ok(deploy.includes('--allow-unauthenticated'));
    const initial = value(deploy, '--set-env-vars');
    assert.ok(initial.includes('OPEN_SNA_JOB_STORE=gcs'));
    assert.ok(!initial.includes(`OPEN_SNA_WORKER_ORIGIN=${origin}`), 'First deploy must fail closed until its URL exists');
    const update = findCall(calls, 'run services update');
    const complete = value(update, '--update-env-vars');
    assert.ok(complete.includes(`OPEN_SNA_WORKER_ORIGIN=${origin}`));
    assert.ok(complete.includes(`OPEN_SNA_TASKS_AUDIENCE=${origin}`));
    assert.ok(initial.includes(`OPEN_SNA_TASKS_SERVICE_ACCOUNT=${identity}`));
    assert.ok(!JSON.stringify(calls).includes('OPENROUTER'));
    const scheduler = findCall(calls, 'scheduler jobs create http');
    assert.equal(value(scheduler, '--schedule'), '* * * * *');
    assert.equal(value(scheduler, '--uri'), `${origin}/api/open-sna/internal/maintenance`);
    assert.equal(value(scheduler, '--oidc-service-account-email'), identity);
    assert.equal(value(scheduler, '--oidc-token-audience'), origin);
    assert.ok(calls.indexOf(scheduler) > calls.indexOf(update));
});

test('repeat deployment updates the existing dedicated queue and maintenance schedule', async t => {
    const result = await runDeployment(t, {bucket:'owned',existing:true});
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!result.calls.some(call => matches(call, 'storage buckets create')));
    findCall(result.calls, 'tasks queues update');
    findCall(result.calls, 'scheduler jobs update http');
});

for (const missing of ['OPEN_SNA_GCS_BUCKET','OPEN_SNA_TASKS_QUEUE']) {
    test(`deployment refuses missing ${missing} before any gcloud call`, async t => {
        const result = await runDeployment(t, {missing});
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, new RegExp(missing));
        assert.deepEqual(result.calls, []);
    });
}
for (const unsafe of ['unrelated','wrong-project','retained','held','unreadable']) {
    test(`deployment refuses ${unsafe} existing storage before any cloud mutation`, async t => {
        const result = await runDeployment(t, {bucket:unsafe,existing:true});
        assert.notEqual(result.status, 0);
        assert.ok(result.calls.every(call => matches(call, 'projects describe') || matches(call, 'storage buckets describe')), JSON.stringify(result.calls));
    });
}
test('deployment verifies storage privacy after applying configuration before deploying the worker', async t => {
    const result = await runDeployment(t, {bucket:'unsafe-after-update'});
    assert.notEqual(result.status, 0);
    assert.ok(!result.calls.some(call => matches(call, 'run deploy')));
});
for (const queue of ['overridden','paused']) {
    test(`deployment refuses an existing ${queue} queue before changing its settings`, async t => {
        const result = await runDeployment(t, {bucket:'owned', existing:true, queue});
        assert.notEqual(result.status, 0);
        assert.ok(!result.calls.some(call => matches(call, 'tasks queues update') || matches(call, 'run deploy')));
    });
}
