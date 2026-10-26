import path from 'node:path';
import { FileJobObjectStore, GcsJobObjectStore } from './open-sna-job-store';
import { OpenSnaJobs, isJobId } from './open-sna-jobs';
type CloudConfiguration = {
    kind: 'gcs';
    bucket: string;
    project: string;
    location: string;
    queue: string;
    serviceAccount: string;
    origin: string;
    audience: string;
};
type JobConfiguration = CloudConfiguration | {
    kind: 'filesystem';
    root: string;
};
function workerIdentity() {
    const origin = process.env.OPEN_SNA_WORKER_ORIGIN || '', audience = process.env.OPEN_SNA_TASKS_AUDIENCE || origin, serviceAccount = process.env.OPEN_SNA_TASKS_SERVICE_ACCOUNT || '';
    let parsed: URL;
    try {
        parsed = new URL(origin);
    }
    catch {
        throw new Error('WORKER_CONFIGURATION_INVALID');
    }
    if (parsed.protocol !== 'https:' || parsed.origin !== origin || parsed.username || parsed.password || !audience || !/^[a-zA-Z0-9._-]+@[a-zA-Z0-9-]+\.iam\.gserviceaccount\.com$/.test(serviceAccount))
        throw new Error('WORKER_CONFIGURATION_INVALID');
    return { origin, audience, serviceAccount };
}
export function readJobConfiguration(): JobConfiguration {
    if (process.env.VERCEL)
        throw new Error('R_ENGINE_NOT_CONFIGURED');
    const kind = process.env.OPEN_SNA_JOB_STORE || 'filesystem';
    if (kind === 'filesystem') {
        if (process.env.OPEN_SNA_R_WORKER_MODE === '1')
            throw new Error('WORKER_CONFIGURATION_INVALID');
        const root = process.env.OPEN_SNA_JOB_ROOT || path.join(process.cwd(), 'tmp/open-sna-durable');
        if (!path.isAbsolute(root) || path.resolve(root) === path.parse(root).root || path.resolve(root) === process.cwd())
            throw new Error('WORKER_CONFIGURATION_INVALID');
        return { kind, root };
    }
    if (kind !== 'gcs')
        throw new Error('WORKER_CONFIGURATION_INVALID');
    const identity = workerIdentity();
    const bucket = process.env.OPEN_SNA_GCS_BUCKET || '', project = process.env.GOOGLE_CLOUD_PROJECT || '', location = process.env.OPEN_SNA_TASKS_LOCATION || '', queue = process.env.OPEN_SNA_TASKS_QUEUE || '';
    if (!/^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$/.test(bucket) || !/^[-a-z0-9:]{4,128}$/.test(project) || !/^[-a-z0-9]{2,64}$/.test(location) || !/^[-_a-zA-Z0-9]{1,100}$/.test(queue))
        throw new Error('WORKER_CONFIGURATION_INVALID');
    return { kind, bucket, project, location, queue, ...identity };
}
export async function configuredJobs() {
    const config = readJobConfiguration();
    if (config.kind === 'filesystem')
        return new OpenSnaJobs(new FileJobObjectStore(config.root));
    const { Storage } = await import('@google-cloud/storage');
    return new OpenSnaJobs(new GcsJobObjectStore(new Storage({ projectId: config.project }).bucket(config.bucket)));
}
type TaskClient = {
    queuePath: (project: string, location: string, queue: string) => string;
    taskPath: (project: string, location: string, queue: string, id: string) => string;
    createTask: (request: import('@google-cloud/tasks').protos.google.cloud.tasks.v2.ICreateTaskRequest) => Promise<unknown>;
    getTask: (request: {
        name: string;
    }) => Promise<unknown>;
    close: () => Promise<void>;
};
export async function enqueueJob(id: string, providedClient?: TaskClient, providedJobs?: OpenSnaJobs) {
    const config = readJobConfiguration();
    if (config.kind === 'filesystem')
        return;
    if (!isJobId(id))
        throw new Error('INVALID_JOB_ID');
    const client = providedClient ?? new (await import('@google-cloud/tasks')).CloudTasksClient();
    try {
        const jobs = providedJobs ?? await configuredJobs();
        const parent = client.queuePath(config.project, config.location, config.queue);
        for (let retry = 0; retry < 12; retry++) {
            const state = await jobs.get(id);
            if (!state || !state.ready || ['succeeded', 'failed', 'cancelled', 'expired'].includes(state.status))
                return;
            const generation = state.dispatchGeneration ?? 0;
            const name = client.taskPath(config.project, config.location, config.queue, `${id}-${generation}`);
            try {
                await client.createTask({ parent, task: { name, dispatchDeadline: { seconds: 900 }, httpRequest: { httpMethod: 'POST', url: `${config.origin}/api/open-sna/internal/jobs/${id}/run`, headers: { 'Content-Type': 'application/json' }, body: Buffer.from('{}').toString('base64'), oidcToken: { serviceAccountEmail: config.serviceAccount, audience: config.audience } } } });
                return;
            }
            catch (error) {
                if ((error as {
                    code?: number;
                }).code !== 6)
                    throw error;
            }
            try {
                await client.getTask({ name });
                return;
            }
            catch (error) {
                if ((error as {
                    code?: number;
                }).code !== 5 && (error as {
                    code?: number;
                }).code !== 404)
                    throw error;
            }
            // ALREADY_EXISTS can refer to a deleted/exhausted task's 24h tombstone.
            // Advance a durable generation with CAS; concurrent repairers reuse its new name.
            await jobs.advanceDispatchGeneration(id, generation);
        }
        throw new Error('QUEUE_UNAVAILABLE');
    }
    catch {
        throw new Error('QUEUE_UNAVAILABLE');
    }
    finally {
        await client.close();
    }
}
type VerifiedIdentity = {
    aud?: string | string[];
    iss?: string;
    email?: string;
    email_verified?: boolean;
};
export async function verifyTaskRequest(request: Request, verify?: (token: string, audience: string) => Promise<VerifiedIdentity>) {
    try {
        const config = workerIdentity();
        const authorization = request.headers.get('authorization');
        if (!authorization?.startsWith('Bearer '))
            return false;
        const token = authorization.slice(7);
        if (!token || token.length > 16384)
            return false;
        const verifyToken = verify ?? (async (token: string, audience: string) => { const { OAuth2Client } = await import('google-auth-library'); const ticket = await new OAuth2Client().verifyIdToken({ idToken: token, audience }); return ticket.getPayload() || {}; });
        const payload: VerifiedIdentity = await verifyToken(token, config.audience);
        return payload.aud === config.audience && (payload.iss === 'https://accounts.google.com' || payload.iss === 'accounts.google.com') && payload.email === config.serviceAccount && payload.email_verified === true;
    }
    catch {
        return false;
    }
}
/** Called by an OIDC-authenticated scheduler: repairs a crash between durable create
 * and queue dispatch, and retries terminal/expiry cleanup independently of browsers. */
export async function reconcileOpenSnaJobs(jobs: OpenSnaJobs, enqueue: (id: string) => Promise<void> = enqueueJob) {
    let dispatched = 0;
    for (const id of await jobs.runnable()) {
        await enqueue(id);
        dispatched++;
    }
    return dispatched;
}
