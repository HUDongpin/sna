import { createHash, randomUUID } from 'node:crypto';
import { isOpenSnaResult, matchesOpenSnaRequest, type OpenSnaResult } from './open-sna';
import type { JobObjectStore } from './open-sna-job-store';
import type { OpenSnaSelection } from './open-sna-workbook-selection';
export const JOB_TTL_MS = 86400000;
export const RUN_LEASE_MS = 660000;
export const FINALIZE_LEASE_MS = 60000;
export const MAX_RESULT_BYTES = 2 * 1024 * 1024;
export const isJobId = (id: string) => /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id);
export const fingerprint = (bytes: Uint8Array | string) => `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
export const canonicalSelection = (selection: OpenSnaSelection) => JSON.stringify({ items: selection.items.map(item => ({ column: item.column, id: item.id, community: item.community, reverse: item.reverse })), groupColumn: selection.groupColumn });
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'expired';
export type JobFailureCode = 'R_RUNTIME_NOT_READY' | 'WORKBOOK_INVALID' | 'R_ANALYSIS_FAILED' | 'R_ANALYSIS_TIMEOUT' | 'RESULT_INVALID' | 'ATTEMPTS_EXHAUSTED' | 'UPLOAD_INCOMPLETE' | 'JOB_CANCELLED' | 'JOB_EXPIRED';
export type JobSubmission = {
    jobId: string;
    bytes: Buffer;
    selection: OpenSnaSelection;
    inputFingerprint: string;
    bootstraps: 100 | 500 | 1000;
    permutations: 1000;
    locale: 'en' | 'zh-hant' | 'zh-hans';
};
export type JobState = {
    schemaVersion: '1.0';
    jobId: string;
    status: JobStatus;
    createdAt: string;
    expiresAt: string;
    updatedAt: string;
    bootstraps: 100 | 500 | 1000;
    permutations: 1000;
    seed: 2026;
    locale: JobSubmission['locale'];
    inputFingerprint: string;
    selectionFingerprint: string;
    payloadFingerprint: string;
    ready: boolean;
    attempts: number;
    dispatchGeneration?: number;
    lease?: {
        token: string;
        expiresAt: string;
    };
    code?: JobFailureCode;
    rResultKey?: string;
    resultKey?: string;
    finalization?: {
        token: string;
        expiresAt: string;
    };
};
const terminal = (state: JobState) => ['succeeded', 'failed', 'cancelled', 'expired'].includes(state.status);
const encode = (value: unknown) => Buffer.from(JSON.stringify(value));
const stateKey = (id: string) => `jobs/${id}/state.json`;
export class OpenSnaJobs {
    constructor(readonly store: JobObjectStore, private readonly now = Date.now) { }
    private timestamp() { return new Date(this.now()).toISOString(); }
    private async read(id: string) { if (!isJobId(id))
        return null; const object = await this.store.read(stateKey(id)); return object ? { state: JSON.parse(object.bytes.toString()) as JobState, version: object.version } : null; }
    private async save(state: JobState, version: string | null) { state.updatedAt = this.timestamp(); return this.store.write(stateKey(state.jobId), encode(state), version); }
    async create(input: JobSubmission): Promise<JobState> {
        if (!isJobId(input.jobId))
            throw new Error('INVALID_JOB_ID');
        const selectionFingerprint = fingerprint(canonicalSelection(input.selection));
        const payloadFingerprint = fingerprint(JSON.stringify({ inputFingerprint: input.inputFingerprint, selectionFingerprint, bootstraps: input.bootstraps, permutations: input.permutations, locale: input.locale }));
        for (let tries = 0; tries < 30; tries++) {
            const existing = await this.read(input.jobId);
            if (existing) {
                if (existing.state.payloadFingerprint !== payloadFingerprint)
                    throw new Error('IDEMPOTENCY_CONFLICT');
                if (existing.state.ready || terminal(existing.state))
                    return (await this.get(input.jobId))!;
            }
            else {
                const state: JobState = { schemaVersion: '1.0', jobId: input.jobId, status: 'queued', createdAt: this.timestamp(), updatedAt: this.timestamp(), expiresAt: new Date(this.now() + JOB_TTL_MS).toISOString(), bootstraps: input.bootstraps, permutations: 1000, seed: 2026, locale: input.locale, inputFingerprint: input.inputFingerprint, selectionFingerprint, payloadFingerprint, ready: false, attempts: 0 };
                if (!await this.save(state, null))
                    continue;
            }
            await this.store.write(`jobs/${input.jobId}/input.xlsx`, input.bytes, null);
            await this.store.write(`jobs/${input.jobId}/selection.json`, Buffer.from(canonicalSelection(input.selection)), null);
            const fresh = await this.read(input.jobId);
            if (!fresh)
                throw new Error('STORE_UNAVAILABLE');
            if (terminal(fresh.state)) {
                await this.cleanup(fresh.state);
                return fresh.state;
            }
            const ready = { ...fresh.state, ready: true };
            if (await this.save(ready, fresh.version))
                return ready;
        }
        throw new Error('STORE_BUSY');
    }
    async get(id: string): Promise<JobState | null> {
        for (let tries = 0; tries < 30; tries++) {
            const current = await this.read(id);
            if (!current)
                return null;
            if (current.state.status !== 'expired' && Date.parse(current.state.expiresAt) <= this.now()) {
                const state = { ...current.state, status: 'expired' as const, code: 'JOB_EXPIRED' as const, lease: undefined, finalization: undefined, resultKey: undefined, rResultKey: undefined };
                if (!await this.save(state, current.version))
                    continue;
                await this.cleanup(state);
                return state;
            }
            if (!current.state.ready && !terminal(current.state) && this.now() - Date.parse(current.state.createdAt) > 180_000) {
                const state = {...current.state, status: 'failed' as const, code: 'UPLOAD_INCOMPLETE' as const};
                if (!await this.save(state, current.version)) continue;
                await this.cleanup(state);
                return state;
            }
            if (terminal(current.state))
                await this.cleanup(current.state);
            return current.state;
        }
        throw new Error('STORE_BUSY');
    }
    async cancel(id: string) {
        await this.get(id);
        for (let tries = 0; tries < 30; tries++) {
            const current = await this.read(id);
            if (!current)
                return null;
            if (terminal(current.state))
                return current.state;
            const state = { ...current.state, status: 'cancelled' as const, code: 'JOB_CANCELLED' as const, lease: undefined };
            if (await this.save(state, current.version)) {
                await this.cleanup(state);
                return state;
            }
        }
        throw new Error('STORE_BUSY');
    }
    private async cleanup(state: JobState) {
        if (!terminal(state))
            return;
        // Leave only the tombstone and reachable aggregate results; clean losing/abandoned attempt objects.
        for (const key of await this.store.list(`jobs/${state.jobId}/`)) {
            if (key === stateKey(state.jobId))
                continue;
            if (state.status === 'succeeded' && !key.endsWith('/input.xlsx') && !key.endsWith('/selection.json'))
                continue;
            await this.store.delete(key);
        }
        if (state.lease)
            await this.releaseSlot(state.lease.token);
    }
    private async acquireSlot(token: string) {
        const old = await this.store.read('runner.json');
        if (old && Date.parse(JSON.parse(old.bytes.toString()).expiresAt) > this.now())
            return false;
        return this.store.write('runner.json', encode({ token, expiresAt: new Date(this.now() + RUN_LEASE_MS).toISOString() }), old?.version ?? null);
    }
    private async releaseSlot(token: string) {
        const old = await this.store.read('runner.json');
        if (!old)
            return;
        const state = JSON.parse(old.bytes.toString());
        if (state.token !== token)
            return;
        await this.store.write('runner.json', encode({ token, expiresAt: new Date(0).toISOString() }), old.version);
    }
    async claim(id: string): Promise<{
        token: string;
        state: JobState;
    } | null> {
        const visible = await this.get(id);
        if (!visible || terminal(visible) || !visible.ready)
            return null;
        const token = randomUUID();
        if (!await this.acquireSlot(token))
            return null;
        let claimed = false;
        try {
            const current = await this.read(id);
            if (!current || terminal(current.state) || !current.state.ready)
                return null;
            if (current.state.status === 'running' && current.state.lease && Date.parse(current.state.lease.expiresAt) > this.now())
                return null;
            if (current.state.attempts >= 3) {
                const failed = { ...current.state, status: 'failed' as const, code: 'ATTEMPTS_EXHAUSTED' as const, lease: undefined };
                if (await this.save(failed, current.version))
                    await this.cleanup(failed);
                return null;
            }
            const state = { ...current.state, status: 'running' as const, attempts: current.state.attempts + 1, lease: { token, expiresAt: new Date(this.now() + RUN_LEASE_MS).toISOString() }, code: undefined };
            claimed = await this.save(state, current.version);
            return claimed ? { token, state } : null;
        }
        finally {
            if (!claimed)
                await this.releaseSlot(token);
        }
    }
    private matchesResult(result: unknown, state: JobState): result is OpenSnaResult {
        return isOpenSnaResult(result) && Buffer.byteLength(JSON.stringify(result)) <= MAX_RESULT_BYTES && result.inputFingerprint === state.inputFingerprint && result.dataSource === 'uploaded-workbook' && result.source.fileName === 'Uploaded workbook' && result.source.sheet === 'Uploaded worksheet' && matchesOpenSnaRequest(result, String(state.bootstraps), '1000') && (!('selection' in result.source) || fingerprint(canonicalSelection(result.source.selection as OpenSnaSelection)) === state.selectionFingerprint);
    }
    async complete(id: string, token: string, result: OpenSnaResult) {
        await this.get(id);
        const current = await this.read(id);
        if (!current || current.state.status !== 'running' || current.state.lease?.token !== token) {
            await this.releaseSlot(token);
            return false;
        }
        if (!this.matchesResult(result, current.state))
            throw new Error('RESULT_INVALID');
        const key = `jobs/${id}/result-r-${token}.json`;
        await this.store.write(key, encode(result), null);
        const state = { ...current.state, status: 'succeeded' as const, rResultKey: key, lease: undefined };
        const saved = await this.save(state, current.version);
        if (saved)
            await this.cleanup(state);
        else
            await this.store.delete(key);
        await this.releaseSlot(token);
        return saved;
    }
    async fail(id: string, token: string, code: JobFailureCode, retryable = false) {
        await this.get(id);
        const current = await this.read(id);
        if (!current || current.state.status !== 'running' || current.state.lease?.token !== token) {
            await this.releaseSlot(token);
            return false;
        }
        const state = { ...current.state, status: (retryable && current.state.attempts < 3 ? 'queued' : 'failed') as JobStatus, code, lease: undefined };
        const saved = await this.save(state, current.version);
        if (saved)
            await this.cleanup(state);
        await this.releaseSlot(token);
        return saved;
    }
    async advanceDispatchGeneration(id: string, expected: number) {
        const current = await this.read(id);
        if (!current || terminal(current.state) || (current.state.dispatchGeneration ?? 0) !== expected)
            return false;
        return this.save({ ...current.state, dispatchGeneration: expected + 1 }, current.version);
    }
    async runnable() {
        const ids = (await this.store.list('jobs/')).filter(key => key.endsWith('/state.json')).map(key => key.split('/')[1]);
        const ready: string[] = [];
        for (const id of ids) {
            const state = await this.get(id);
            if (state && state.ready && !terminal(state) && (state.status === 'queued' || !state.lease || Date.parse(state.lease.expiresAt) <= this.now()))
                ready.push(id);
        }
        return ready;
    }
    async inputs(id: string) { const [input, selection] = await Promise.all([this.store.read(`jobs/${id}/input.xlsx`), this.store.read(`jobs/${id}/selection.json`)]); if (!input || !selection)
        throw new Error('INPUT_UNAVAILABLE'); return { bytes: input.bytes, selection: JSON.parse(selection.bytes.toString()) as OpenSnaSelection }; }
    async result(id: string): Promise<OpenSnaResult | null> {
        const state = await this.get(id);
        if (!state || state.status !== 'succeeded' || !state.resultKey)
            return null;
        const result = await this.store.read(state.resultKey);
        if (!result)
            throw new Error('RESULT_INVALID');
        const parsed: unknown = JSON.parse(result.bytes.toString());
        if (!this.matchesResult(parsed, state))
            throw new Error('RESULT_INVALID');
        return parsed;
    }
    async claimFinalization(id: string): Promise<{
        token: string;
        result: OpenSnaResult;
        locale: JobSubmission['locale'];
    } | null> {
        for (let tries = 0; tries < 30; tries++) {
            await this.get(id);
            const current = await this.read(id);
            if (!current || current.state.status !== 'succeeded' || current.state.resultKey || !current.state.rResultKey)
                return null;
            const object = await this.store.read(current.state.rResultKey);
            if (!object)
                throw new Error('RESULT_INVALID');
            const result: unknown = JSON.parse(object.bytes.toString());
            if (!this.matchesResult(result, current.state))
                throw new Error('RESULT_INVALID');
            if (current.state.finalization) {
                if (Date.parse(current.state.finalization.expiresAt) > this.now())
                    return null;
                // Never call a provider twice: an interrupted owner falls back to the original aggregate.
                await this.commitFinalization(id, current.state.finalization.token, result);
                return null;
            }
            const token = randomUUID(), state = { ...current.state, finalization: { token, expiresAt: new Date(this.now() + FINALIZE_LEASE_MS).toISOString() } };
            if (await this.save(state, current.version))
                return { token, result, locale: state.locale };
        }
        return null;
    }
    async commitFinalization(id: string, token: string, result: OpenSnaResult) {
        await this.get(id);
        const current = await this.read(id);
        if (!current || current.state.status !== 'succeeded' || current.state.resultKey || current.state.finalization?.token !== token)
            return false;
        if (!this.matchesResult(result, current.state))
            throw new Error('RESULT_INVALID');
        const base = await this.store.read(current.state.rResultKey!);
        if (!base)
            throw new Error('RESULT_INVALID');
        const baseline = JSON.parse(base.bytes.toString());
        const statistical = (value: OpenSnaResult) => { const copy = { ...value }; delete (copy as Partial<OpenSnaResult>).interpretation; delete (copy as Partial<OpenSnaResult>).warnings; copy.privacy = { ...copy.privacy, thirdPartyAiUsed: false }; return JSON.stringify(copy); };
        if (statistical(result) !== statistical(baseline) || !baseline.warnings.every((warning: string) => result.warnings.includes(warning)))
            throw new Error('RESULT_INVALID');
        const key = `jobs/${id}/result-${randomUUID()}.json`;
        await this.store.write(key, encode(result), null);
        const saved = await this.save({ ...current.state, resultKey: key }, current.version);
        if (!saved)
            await this.store.delete(key);
        return saved;
    }
}
export function publicJobState(state: JobState) { return { jobId: state.jobId, status: state.status, createdAt: state.createdAt, expiresAt: state.expiresAt, pollAfterMs: state.status === 'queued' ? 2000 : 5000, ...(state.code ? { code: state.code } : {}) }; }
