import { timingSafeEqual } from 'node:crypto';
import { isOpenSnaResult, type OpenSnaResult } from './open-sna';
import { withLunaInterpretation } from './open-sna-ai';
import { isValidOpenSnaServiceToken, readOpenSnaEngineConfigurationStatus } from './open-sna-config';
import { configuredJobs, enqueueJob, verifyTaskRequest } from './open-sna-job-config';
import { canonicalSelection, fingerprint, isJobId, MAX_RESULT_BYTES, publicJobState, type JobSubmission } from './open-sna-jobs';
import { runOpenSnaR, runOpenSnaJob, sweepOpenSnaRuntime, type RRunOptions } from './open-sna-runner';
import { isOpenSnaInspectionResult, isOpenSnaSelection } from './open-sna-workbook-selection';
import { isOpenSnaValidationResult } from './open-sna-workbook-validation';
const MAX_UPLOAD = 5 * 1024 * 1024, MAX_MULTIPART = MAX_UPLOAD + 256 * 1024;
const statuses: Record<string, number> = { R_ENGINE_DISABLED: 503, R_ENGINE_NOT_CONFIGURED: 503, WORKER_CONFIGURATION_INVALID: 503, WORKER_UNAUTHORIZED: 401, WORKBOOK_INVALID: 422, INVALID_REQUEST: 400, INVALID_JOB_ID: 400, UNSUPPORTED_MEDIA_TYPE: 415, PAYLOAD_TOO_LARGE: 413, VALIDATION_STALE: 409, IDEMPOTENCY_CONFLICT: 409, JOB_NOT_FOUND: 404, JOB_EXPIRED: 410, RESULT_PENDING: 409, RESULT_FINALIZING: 409, R_RUNTIME_NOT_READY: 503, R_ANALYSIS_FAILED: 502, R_ANALYSIS_TIMEOUT: 504, RESULT_INVALID: 502, QUEUE_UNAVAILABLE: 503, STORE_BUSY: 503, R_ENGINE_UNAVAILABLE: 502 };
export function jobJson(body: unknown, status = 200) { return Response.json(body, { status, headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', ...(status === 409 ? { 'Retry-After': '2' } : {}) } }); }
function failure(code: string) { const safe = Object.hasOwn(statuses, code) ? code : 'R_ENGINE_UNAVAILABLE'; return jobJson({ code: safe, error: 'The requested Open SNA operation could not be completed.' }, statuses[safe]); }
function caught(error: unknown) { return failure(error instanceof Error ? error.message : 'R_ENGINE_UNAVAILABLE'); }
function workerAuthentication(request: Request) {
    if (process.env.OPEN_SNA_R_WORKER_MODE !== '1')
        return;
    const token = process.env.OPEN_SNA_R_WORKER_TOKEN || '';
    if (!isValidOpenSnaServiceToken(token) || process.env.OPEN_SNA_R_API_URL)
        throw new Error('WORKER_CONFIGURATION_INVALID');
    const actual = Buffer.from(request.headers.get('authorization') || ''), expected = Buffer.from(`Bearer ${token}`);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
        throw new Error('WORKER_UNAUTHORIZED');
}
function access(request: Request) { if (process.env.OPEN_SNA_R_DISABLED === '1')
    throw new Error('R_ENGINE_DISABLED'); workerAuthentication(request); }
function remoteConfiguration() {
    if (process.env.OPEN_SNA_R_WORKER_MODE === '1')
        return null;
    const config = readOpenSnaEngineConfigurationStatus();
    if (config.configured)
        return config;
    if (config.reason === 'invalid')
        throw new Error('WORKER_CONFIGURATION_INVALID');
    if (process.env.VERCEL)
        throw new Error('R_ENGINE_NOT_CONFIGURED');
    return null;
}
export async function readBoundedBytes(message: Request | Response, limit: number) {
    const length = Number(message.headers.get('content-length'));
    if (Number.isFinite(length) && length > limit)
        throw new Error('PAYLOAD_TOO_LARGE');
    if (!message.body)
        return Buffer.alloc(0);
    const reader = message.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            size += value.length;
            if (size > limit) {
                await reader.cancel();
                throw new Error('PAYLOAD_TOO_LARGE');
            }
            chunks.push(value);
        }
        return Buffer.concat(chunks);
    }
    finally {
        reader.releaseLock();
    }
}
async function jsonBody(request: Request, limit = MAX_RESULT_BYTES + 16384) { try {
    return JSON.parse((await readBoundedBytes(request, limit)).toString());
}
catch (error) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE')
        throw error;
    throw new Error('INVALID_REQUEST');
} }
async function upload(request: Request) {
    if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('multipart/form-data'))
        throw new Error('UNSUPPORTED_MEDIA_TYPE');
    const bounded = await readBoundedBytes(request, MAX_MULTIPART);
    let form: FormData;
    try {
        form = await new Request('http://localhost', { method: 'POST', headers: { 'Content-Type': request.headers.get('content-type')! }, body: bounded }).formData();
    }
    catch {
        throw new Error('INVALID_REQUEST');
    }
    const file = form.get('workbook');
    if (!(file instanceof File))
        throw new Error('INVALID_REQUEST');
    if (!file.name.toLowerCase().endsWith('.xlsx') || (file.type && !['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream'].includes(file.type)))
        throw new Error('UNSUPPORTED_MEDIA_TYPE');
    if (!file.size || file.size > MAX_UPLOAD)
        throw new Error('PAYLOAD_TOO_LARGE');
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 3 || bytes[3] !== 4)
        throw new Error('UNSUPPORTED_MEDIA_TYPE');
    return { form, bytes };
}
async function remoteCall(config: {
    apiUrl: string;
    apiToken: string;
}, suffix: string, method = 'GET', body?: FormData | unknown, idempotencyKey?: string) {
    const headers = new Headers({ Accept: 'application/json', Authorization: `Bearer ${config.apiToken}` });
    let outgoing: BodyInit | undefined;
    if (body instanceof FormData)
        outgoing = body;
    else if (body !== undefined) {
        headers.set('Content-Type', 'application/json');
        outgoing = JSON.stringify(body);
    }
    if (idempotencyKey)
        headers.set('Idempotency-Key', idempotencyKey);
    const response = await fetch(config.apiUrl.replace(/\/analyze$/, suffix), { method, headers, body: outgoing, cache: 'no-store', signal: AbortSignal.timeout(150000), redirect: 'error' });
    let payload: unknown;
    try {
        payload = JSON.parse((await readBoundedBytes(response, MAX_RESULT_BYTES + 32768)).toString());
    }
    catch {
        throw new Error('RESULT_INVALID');
    }
    return { status: response.status, payload };
}
function isJobAggregate(value: unknown): value is OpenSnaResult { return isOpenSnaResult(value) && value.dataSource === 'uploaded-workbook' && typeof value.inputFingerprint === 'string' && value.source.fileName === 'Uploaded workbook' && value.source.sheet === 'Uploaded worksheet'; }
function remoteError(payload: unknown) { const code = payload && typeof payload === 'object' ? 'code' in payload ? payload.code : null : null; return failure(typeof code === 'string' ? code : 'R_ENGINE_UNAVAILABLE'); }
function validReceipt(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return false;
    const p = value as Record<string, unknown>;
    return Object.keys(p).every(k => ['jobId', 'status', 'createdAt', 'expiresAt', 'pollAfterMs', 'code'].includes(k)) && typeof p.jobId === 'string' && isJobId(p.jobId) && ['queued', 'running', 'succeeded', 'failed', 'cancelled', 'expired'].includes(String(p.status)) && typeof p.createdAt === 'string' && Number.isFinite(Date.parse(p.createdAt)) && typeof p.expiresAt === 'string' && Number.isFinite(Date.parse(p.expiresAt)) && [2000, 5000].includes(Number(p.pollAfterMs)) && (p.code === undefined || ['R_RUNTIME_NOT_READY', 'WORKBOOK_INVALID', 'R_ANALYSIS_FAILED', 'R_ANALYSIS_TIMEOUT', 'RESULT_INVALID', 'ATTEMPTS_EXHAUSTED', 'UPLOAD_INCOMPLETE', 'JOB_CANCELLED', 'JOB_EXPIRED'].includes(String(p.code)));
}
export async function handleOpenSnaForm(request: Request, operation: 'inspect' | 'validate' | 'jobs', run: (options: RRunOptions) => Promise<unknown> = runOpenSnaR) {
    try {
        access(request);
        const remote = remoteConfiguration();
        const { form, bytes } = await upload(request);
        let selection;
        if (operation !== 'inspect') {
            try {
                selection = JSON.parse(String(form.get('selection')));
            }
            catch {
                throw new Error('INVALID_REQUEST');
            }
            if (!isOpenSnaSelection(selection))
                throw new Error('WORKBOOK_INVALID');
        }
        let input: JobSubmission | undefined;
        if (operation === 'jobs') {
            const id = request.headers.get('Idempotency-Key') || '';
            if (!isJobId(id))
                throw new Error('INVALID_JOB_ID');
            const inputFingerprint = String(form.get('inputFingerprint'));
            if (inputFingerprint !== fingerprint(bytes))
                throw new Error('VALIDATION_STALE');
            const bootstraps = Number(form.get('bootstraps')), permutations = Number(form.get('permutations')), locale = String(form.get('locale'));
            if (![100, 500, 1000].includes(bootstraps) || permutations !== 1000 || !['en', 'zh-hant', 'zh-hans'].includes(locale))
                throw new Error('INVALID_REQUEST');
            input = { jobId: id, bytes, selection: selection!, inputFingerprint, bootstraps: bootstraps as 100 | 500 | 1000, permutations: 1000, locale: locale as JobSubmission['locale'] };
        }
        if (remote) {
            const clean = new FormData();
            clean.set('workbook', new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'input.xlsx');
            if (selection)
                clean.set('selection', canonicalSelection(selection));
            if (input) {
                clean.set('inputFingerprint', input.inputFingerprint);
                clean.set('bootstraps', String(input.bootstraps));
                clean.set('permutations', '1000');
                clean.set('locale', input.locale);
            }
            const response = await remoteCall(remote, `/${operation}`, 'POST', clean, input?.jobId);
            if (response.status >= 400)
                return remoteError(response.payload);
            if (operation === 'inspect' ? !isOpenSnaInspectionResult(response.payload) : operation === 'validate' ? !isOpenSnaValidationResult(response.payload) : !validReceipt(response.payload))
                throw new Error('RESULT_INVALID');
            if (operation === 'jobs' && (response.payload as {
                jobId: string;
            }).jobId !== input!.jobId)
                throw new Error('RESULT_INVALID');
            if (operation !== 'jobs' && (response.payload as {
                inputFingerprint: string;
            }).inputFingerprint !== fingerprint(bytes))
                throw new Error('RESULT_INVALID');
            if (operation === 'validate' && (!('selection' in (response.payload as object)) || canonicalSelection((response.payload as {
                selection: JobSubmission['selection'];
            }).selection) !== canonicalSelection(selection!)))
                throw new Error('RESULT_INVALID');
            return jobJson(response.payload, operation === 'jobs' ? 202 : 200);
        }
        // Configuration is checked before R so production cannot accept a non-durable job.
        const jobs = operation === 'jobs' ? await configuredJobs() : null;
        const result = await run({ mode: operation === 'inspect' ? 'inspect' : 'validate', bytes, selection });
        if (operation === 'inspect') {
            if (!isOpenSnaInspectionResult(result) || result.inputFingerprint !== fingerprint(bytes))
                throw new Error('RESULT_INVALID');
            return jobJson(result);
        }
        if (!isOpenSnaValidationResult(result) || result.inputFingerprint !== fingerprint(bytes) || !('selection' in result) || canonicalSelection(result.selection as JobSubmission['selection']) !== canonicalSelection(selection!))
            throw new Error('RESULT_INVALID');
        if (operation === 'validate')
            return jobJson(result);
        const state = await jobs!.create(input!);
        if (state.status === 'queued')
            await enqueueJob(state.jobId);
        return jobJson(publicJobState(state), 202);
    }
    catch (error) {
        return caught(error);
    }
}
async function finalizeLocal(id: string) {
    const jobs = await configuredJobs();
    const existing = await jobs.result(id);
    if (existing)
        return jobJson(existing);
    const claim = await jobs.claimFinalization(id);
    if (claim) {
        const outcome = await withLunaInterpretation(claim.result, { locale: claim.locale });
        await jobs.commitFinalization(id, claim.token, outcome.result);
    }
    const result = await jobs.result(id);
    return result ? jobJson(result) : failure('RESULT_FINALIZING');
}
async function finalizeRemote(config: {
    apiUrl: string;
    apiToken: string;
}, id: string) {
    const response = await remoteCall(config, `/internal/jobs/${id}/finalize/claim`, 'POST', {});
    if (response.status >= 400)
        return remoteError(response.payload);
    const claim = response.payload as {
        token?: unknown;
        result?: unknown;
        locale?: unknown;
    };
    if (!claim || typeof claim.token !== 'string' || !isJobId(claim.token) || !isJobAggregate(claim.result) || !['en', 'zh-hant', 'zh-hans'].includes(String(claim.locale)))
        throw new Error('RESULT_INVALID');
    const outcome = await withLunaInterpretation(claim.result, { locale: claim.locale as JobSubmission['locale'] });
    const commit = await remoteCall(config, `/internal/jobs/${id}/finalize/commit`, 'POST', { token: claim.token, result: outcome.result });
    if (commit.status >= 400)
        return remoteError(commit.payload);
    const result = await remoteCall(config, `/jobs/${id}/result`);
    if (result.status >= 400)
        return remoteError(result.payload);
    if (!isJobAggregate(result.payload))
        throw new Error('RESULT_INVALID');
    return jobJson(result.payload);
}
export async function handleOpenSnaJob(request: Request, id: string, operation: 'status' | 'cancel' | 'result') {
    try {
        access(request);
        if (!isJobId(id))
            throw new Error('JOB_NOT_FOUND');
        const remote = remoteConfiguration();
        if (remote) {
            const response = await remoteCall(remote, `/jobs/${id}${operation === 'result' ? '/result' : ''}`, operation === 'cancel' ? 'DELETE' : 'GET');
            if (operation === 'result' && response.status === 409 && (response.payload as {
                code?: unknown;
            })?.code === 'RESULT_FINALIZING')
                return await finalizeRemote(remote, id);
            if (response.status >= 400)
                return remoteError(response.payload);
            if (operation === 'result' ? !isJobAggregate(response.payload) : !validReceipt(response.payload) || (response.payload as {
                jobId: string;
            }).jobId !== id)
                throw new Error('RESULT_INVALID');
            return jobJson(response.payload);
        }
        const jobs = await configuredJobs(), state = operation === 'cancel' ? await jobs.cancel(id) : await jobs.get(id);
        if (!state)
            throw new Error('JOB_NOT_FOUND');
        if (operation !== 'result')
            return jobJson(publicJobState(state));
        if (state.status === 'expired')
            throw new Error('JOB_EXPIRED');
        if (state.status !== 'succeeded')
            throw new Error('RESULT_PENDING');
        const result = await jobs.result(id);
        if (result)
            return jobJson(result);
        // A production worker does not own the optional AI key: its web adapter finalizes.
        if (process.env.OPEN_SNA_R_WORKER_MODE === '1')
            throw new Error('RESULT_FINALIZING');
        return await finalizeLocal(id);
    }
    catch (error) {
        return caught(error);
    }
}
export async function handleOpenSnaInternal(request: Request, id: string, operation: 'run' | 'claim' | 'commit') {
    try {
        if (process.env.OPEN_SNA_R_DISABLED === '1')
            throw new Error('R_ENGINE_DISABLED');
        if (!isJobId(id))
            throw new Error('JOB_NOT_FOUND');
        if (process.env.OPEN_SNA_R_WORKER_MODE !== '1')
            throw new Error('WORKER_UNAUTHORIZED');
        if (operation === 'run') {
            if (!await verifyTaskRequest(request))
                throw new Error('WORKER_UNAUTHORIZED');
            const jobs = await configuredJobs(), outcome = await runOpenSnaJob(jobs, id);
            return jobJson({ accepted: outcome === 'done' }, outcome === 'done' ? 200 : 503);
        }
        workerAuthentication(request);
        const jobs = await configuredJobs(), state = await jobs.get(id);
        if (!state)
            throw new Error('JOB_NOT_FOUND');
        if (state.status === 'expired')
            throw new Error('JOB_EXPIRED');
        if (state.status !== 'succeeded')
            throw new Error('RESULT_PENDING');
        if (operation === 'claim') {
            const claim = await jobs.claimFinalization(id);
            if (!claim)
                throw new Error('RESULT_FINALIZING');
            return jobJson(claim);
        }
        const body = await jsonBody(request);
        if (!body || typeof body.token !== 'string' || !isJobId(body.token) || !isOpenSnaResult(body.result))
            throw new Error('RESULT_INVALID');
        const committed = await jobs.commitFinalization(id, body.token, body.result);
        return committed ? jobJson({ committed: true }) : failure('RESULT_FINALIZING');
    }
    catch (error) {
        return caught(error);
    }
}
export async function handleOpenSnaMaintenance(request: Request) {
    try {
        if (process.env.OPEN_SNA_R_WORKER_MODE !== '1' || !await verifyTaskRequest(request))
            throw new Error('WORKER_UNAUTHORIZED');
        const { reconcileOpenSnaJobs } = await import('./open-sna-job-config');
        const jobs = await configuredJobs();
        await sweepOpenSnaRuntime();
        // Expiry cleanup remains enabled while analysis is disabled; it must not enqueue work.
        const queued = await reconcileOpenSnaJobs(jobs, process.env.OPEN_SNA_R_DISABLED === '1' ? async () => { } : enqueueJob);
        return jobJson({ accepted: true, queued });
    }
    catch (error) {
        return caught(error);
    }
}
