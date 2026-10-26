import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { isOpenSnaResult } from './open-sna';
import { isOpenSnaInspectionResult, type OpenSnaSelection } from './open-sna-workbook-selection';
import { isOpenSnaValidationResult } from './open-sna-workbook-validation';
import { canonicalSelection, fingerprint, MAX_RESULT_BYTES, OpenSnaJobs, type JobFailureCode } from './open-sna-jobs';
export type RRunOptions = {
    mode: 'inspect' | 'validate' | 'analyze';
    bytes: Buffer;
    selection?: OpenSnaSelection;
    bootstraps?: number;
    permutations?: number;
    signal?: AbortSignal;
    rscript?: string;
    scriptPath?: string;
    temporaryRoot?: string;
    timeoutMs?: number;
    runtimeIdentity?: {
        jobId: string;
        token: string;
    };
};
// This independently timed process owns R. Losing the web/worker caller cannot
// orphan an unbounded R process or defeat the single-execution lease.
const R_SUPERVISOR = String.raw `
const {spawn}=require('node:child_process');
const config=JSON.parse(process.argv[1]);
const owner=config.parentPid;
let reason='',killTimer,finished=false;
const child=spawn(config.command,config.args,{env:process.env,stdio:['ignore','ignore','pipe'],detached:process.platform!=='win32'});
function signal(name){try{if(process.platform==='win32')child.kill(name);else process.kill(-child.pid,name);}catch{}}
function stop(code){if(finished)return;reason=reason||code;signal('SIGTERM');killTimer=killTimer||setTimeout(()=>signal('SIGKILL'),1000);}
const watchdog=setInterval(()=>{if(process.ppid!==owner)stop('JOB_CANCELLED');else{try{process.kill(owner,0);}catch{stop('JOB_CANCELLED');}}},250);
const deadline=setTimeout(()=>stop('R_ANALYSIS_TIMEOUT'),config.timeout);
process.on('SIGTERM',()=>stop('JOB_CANCELLED'));
process.on('SIGINT',()=>stop('JOB_CANCELLED'));
process.stderr.on('error',()=>stop('JOB_CANCELLED'));
let diagnosticBytes=0;
child.stderr.on('data',chunk=>{const remaining=65536-diagnosticBytes;diagnosticBytes+=chunk.length;try{if(remaining>0)process.stderr.write(chunk.subarray(0,remaining));}catch{stop('JOB_CANCELLED');}if(diagnosticBytes>65536)stop('R_ANALYSIS_FAILED');});
function done(code){if(finished)return;finished=true;clearInterval(watchdog);clearTimeout(deadline);clearTimeout(killTimer);signal('SIGKILL');if(reason){try{process.stderr.write('\nOPEN_SNA_ERROR_CODE='+reason+'\n');}catch{}}process.exitCode=reason?1:(code??1);}
child.once('error',()=>{reason='R_RUNTIME_NOT_READY';done(1);});
child.once('close',done);
`;
export function openSnaRuntimeRoot() {
    return process.env.OPEN_SNA_R_WORKER_TMP_ROOT || path.join(tmpdir(), `open-sna-execution-${fingerprint(process.cwd() + '|' + (process.env.OPEN_SNA_JOB_ROOT || '') + '|' + (process.env.OPEN_SNA_GCS_BUCKET || '')).slice(7, 23)}`);
}
function processAlive(pid: unknown) { if (!Number.isSafeInteger(pid) || Number(pid) < 1)
    return false; try {
    process.kill(Number(pid), 0);
    return true;
}
catch (error) {
    return (error as {
        code?: string;
    }).code === 'EPERM';
} }
/** Removes only recognized abandoned runtime directories. A live caller or its
 * supervisor protects an attempt until the 24h privacy boundary. */
export async function sweepOpenSnaRuntime(root = openSnaRuntimeRoot(), now = Date.now()) {
    let entries;
    try {
        entries = await readdir(root, { withFileTypes: true });
    }
    catch (error) {
        if ((error as {
            code?: string;
        }).code === 'ENOENT')
            return;
        throw error;
    }
    for (const entry of entries) {
        if (!entry.isDirectory() || !/^job-[A-Za-z0-9_-]+$/.test(entry.name))
            continue;
        const directory = path.join(root, entry.name);
        try {
            const owner = JSON.parse(await readFile(path.join(directory, 'owner.json'), 'utf8'));
            if (owner.schemaVersion !== '1.0' || !Number.isFinite(owner.createdAt) || !Number.isFinite(owner.expiresAt))
                throw new SyntaxError('INVALID_RUNTIME_OWNER');
            if (now - owner.createdAt < 5000)
                continue;
            const beyondRetention = now - owner.createdAt >= 86400000;
            if (!beyondRetention && (processAlive(owner.parentPid) || processAlive(owner.runtimePid)))
                continue;
            await rm(directory, { recursive: true, force: true });
        }
        catch (error) {
            if (!(error instanceof SyntaxError) && (error as {
                code?: string;
            }).code !== 'ENOENT')
                throw error;
            try {
                if (now - (await stat(directory)).mtimeMs >= 86400000)
                    await rm(directory, { recursive: true, force: true });
            }
            catch (error) {
                if ((error as {
                    code?: string;
                }).code !== 'ENOENT')
                    throw error;
            }
        }
    }
}
const failureCodes = new Set(['WORKBOOK_INVALID', 'R_RUNTIME_NOT_READY', 'R_ANALYSIS_FAILED', 'R_ANALYSIS_TIMEOUT', 'JOB_CANCELLED']);
export async function runOpenSnaR(options: RRunOptions): Promise<unknown> {
    if (process.env.OPEN_SNA_R_DISABLED === '1')
        throw new Error('R_ENGINE_DISABLED');
    const temporaryRoot = options.temporaryRoot || openSnaRuntimeRoot();
    await mkdir(temporaryRoot, { recursive: true, mode: 0o700 });
    const directory = await mkdtemp(path.join(temporaryRoot, 'job-'));
    try {
        const timeoutMs = options.timeoutMs ?? (options.mode === 'analyze' ? 600000 : 120000);
        const owner = { schemaVersion: '1.0', createdAt: Date.now(), expiresAt: Date.now() + timeoutMs + 5000, parentPid: process.pid, runtimePid: null as number | null, ...(options.runtimeIdentity ? { jobId: options.runtimeIdentity.jobId, leaseToken: options.runtimeIdentity.token } : {}) };
        await writeFile(path.join(directory, 'owner.json'), JSON.stringify(owner), { mode: 0o600 });
        const input = path.join(directory, 'input.xlsx'), output = path.join(directory, 'result.json');
        await writeFile(input, options.bytes, { mode: 0o600 });
        const args = [options.scriptPath || path.join(process.cwd(), 'analysis/open-sna/analyze.R'), '--input', input, '--output', output, '--mode', options.mode];
        if (options.selection) {
            const selection = path.join(directory, 'selection.json');
            await writeFile(selection, canonicalSelection(options.selection), { mode: 0o600 });
            args.push('--selection', selection);
        }
        if (options.mode === 'analyze')
            args.push('--bootstraps', String(options.bootstraps ?? 1000), '--permutations', String(options.permutations ?? 1000), '--seed', '2026', '--data-source', 'uploaded-workbook');
        const label1 = process.env.OPEN_SNA_GENDER_1_LABEL, label2 = process.env.OPEN_SNA_GENDER_2_LABEL;
        if (label1 || label2) {
            if (!label1 || !label2 || label1 === label2 || ![label1, label2].every(x => /^[A-Za-z][A-Za-z0-9 _-]{0,39}$/.test(x)))
                throw new Error('WORKER_CONFIGURATION_INVALID');
            args.push('--gender-1-label', label1, '--gender-2-label', label2);
        }
        const outcome = await new Promise<{
            code: number;
            failure: string | undefined;
            timedOut: boolean;
            overflow: boolean;
            aborted: boolean;
        }>((resolve, reject) => {
            const child = spawn(/* turbopackIgnore: true */ process.execPath, ['-e', R_SUPERVISOR, JSON.stringify({ parentPid: process.pid, command: options.rscript || process.env.OPEN_SNA_RSCRIPT_BIN || 'Rscript', args, timeout: timeoutMs })], { cwd: process.cwd(), shell: false, stdio: ['ignore', 'ignore', 'pipe'], env: { NODE_ENV: process.env.NODE_ENV || 'development', PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8', R_LIBS_USER: process.env.OPEN_SNA_R_LIBS_USER || process.env.R_LIBS_USER || path.join(process.cwd(), 'tmp/r-library') } });
            owner.runtimePid = child.pid ?? null;
            void writeFile(path.join(directory, 'owner.next.json'), JSON.stringify(owner), { mode: 0o600 }).then(() => rename(path.join(directory, 'owner.next.json'), path.join(directory, 'owner.json'))).catch(() => { });
            let timedOut = false, overflow = false, aborted = false, size = 0;
            const chunks: Buffer[] = [];
            let killTimer: NodeJS.Timeout | undefined;
            const kill = () => { child.kill('SIGTERM'); killTimer ??= setTimeout(() => child.kill('SIGKILL'), 3000); killTimer.unref(); };
            const abort = () => { aborted = true; kill(); };
            options.signal?.addEventListener('abort', abort, { once: true });
            if (options.signal?.aborted)
                abort();
            child.stderr.on('data', (chunk: Buffer) => { const remain = 64 * 1024 - size; if (remain > 0)
                chunks.push(chunk.subarray(0, remain)); size += chunk.length; if (size > 64 * 1024) {
                overflow = true;
                kill();
            } });
            const timer = setTimeout(() => { timedOut = true; kill(); }, timeoutMs + 1500);
            timer.unref();
            const cleanup = () => { clearTimeout(timer); if (killTimer)
                clearTimeout(killTimer); options.signal?.removeEventListener('abort', abort); };
            child.once('error', () => { cleanup(); reject(new Error('R_RUNTIME_NOT_READY')); });
            child.once('close', code => { cleanup(); const diagnostic = Buffer.concat(chunks).toString('utf8'); const codeMatch = diagnostic.match(/^OPEN_SNA_ERROR_CODE=([A-Z_]+)$/m)?.[1]; resolve({ code: code ?? 1, failure: codeMatch && failureCodes.has(codeMatch) ? codeMatch : undefined, timedOut, overflow, aborted }); });
        });
        if (outcome.aborted)
            throw new Error('JOB_CANCELLED');
        if (outcome.timedOut)
            throw new Error('R_ANALYSIS_TIMEOUT');
        if (outcome.overflow)
            throw new Error('R_ANALYSIS_FAILED');
        if (outcome.code !== 0)
            throw new Error(outcome.failure || 'R_ANALYSIS_FAILED');
        const metadata = await stat(output);
        if (metadata.size === 0 || metadata.size > MAX_RESULT_BYTES)
            throw new Error('RESULT_INVALID');
        let result: unknown;
        try {
            result = JSON.parse(await readFile(output, 'utf8'));
        }
        catch {
            throw new Error('RESULT_INVALID');
        }
        if (options.mode === 'inspect') {
            if (!isOpenSnaInspectionResult(result) || result.inputFingerprint !== fingerprint(options.bytes))
                throw new Error('RESULT_INVALID');
        }
        else if (options.mode === 'validate') {
            if (!isOpenSnaValidationResult(result) || result.inputFingerprint !== fingerprint(options.bytes) || !('selection' in result) || canonicalSelection(result.selection as OpenSnaSelection) !== canonicalSelection(options.selection!))
                throw new Error('RESULT_INVALID');
        }
        else {
            if (!isOpenSnaResult(result) || !result.source.selection || !options.selection || canonicalSelection(result.source.selection) !== canonicalSelection(options.selection) || result.dataSource !== 'uploaded-workbook' || (result.inputFingerprint !== undefined && result.inputFingerprint !== fingerprint(options.bytes)))
                throw new Error('RESULT_INVALID');
            result = { ...result, inputFingerprint: fingerprint(options.bytes), source: { ...result.source, fileName: 'Uploaded workbook', sheet: 'Uploaded worksheet' } };
        }
        return result;
    }
    finally {
        await rm(directory, { recursive: true, force: true });
    }
}
export async function runOpenSnaJob(jobs: OpenSnaJobs, id: string, execute: (options: RRunOptions) => Promise<unknown> = runOpenSnaR): Promise<'done' | 'retry' | 'busy'> {
    if (process.env.OPEN_SNA_R_DISABLED === '1')
        return 'retry';
    const claim = await jobs.claim(id);
    if (!claim) {
        const state = await jobs.get(id);
        return !state || ['succeeded', 'failed', 'cancelled', 'expired'].includes(state.status) ? 'done' : 'busy';
    }
    const controller = new AbortController();
    let checking = false;
    const interval = setInterval(async () => { if (checking)
        return; checking = true; try {
        const state = await jobs.get(id);
        if (state?.status !== 'running' || state.lease?.token !== claim.token)
            controller.abort();
    }
    catch { /* Transient store failures do not discard R; the fenced commit remains authoritative. */ }
    finally {
        checking = false;
    } }, 1000);
    interval.unref();
    try {
        const inputs = await jobs.inputs(id);
        if (fingerprint(inputs.bytes) !== claim.state.inputFingerprint || fingerprint(canonicalSelection(inputs.selection)) !== claim.state.selectionFingerprint)
            throw new Error('RESULT_INVALID');
        const result = await execute({ mode: 'analyze', ...inputs, bootstraps: claim.state.bootstraps, permutations: claim.state.permutations, signal: controller.signal, runtimeIdentity: { jobId: id, token: claim.token } });
        if (!isOpenSnaResult(result))
            throw new Error('RESULT_INVALID');
        await jobs.complete(id, claim.token, result);
        return 'done';
    }
    catch (error) {
        const message = error instanceof Error ? error.message : '';
        const allowed = new Set(['R_RUNTIME_NOT_READY', 'WORKBOOK_INVALID', 'R_ANALYSIS_FAILED', 'R_ANALYSIS_TIMEOUT', 'RESULT_INVALID', 'JOB_CANCELLED']);
        const failure: JobFailureCode = allowed.has(message) ? message as JobFailureCode : 'R_ANALYSIS_FAILED';
        const retryable = message === 'R_RUNTIME_NOT_READY' || !allowed.has(message);
        await jobs.fail(id, claim.token, failure, retryable);
        const state = await jobs.get(id);
        return state?.status === 'queued' ? 'retry' : 'done';
    }
    finally {
        clearInterval(interval);
    }
}
