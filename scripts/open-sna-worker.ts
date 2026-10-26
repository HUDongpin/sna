import { loadEnvConfig } from '@next/env';
import { configuredJobs, readJobConfiguration } from '../lib/open-sna-job-config';
import { runOpenSnaJob, sweepOpenSnaRuntime } from '../lib/open-sna-runner';
async function main() {
    // Match `next dev` by default and `next start` when NODE_ENV=production.
    // Next's loader preserves explicit environment variables and its test-file rules.
    if (!process.env.NODE_ENV)
        Object.assign(process.env, { NODE_ENV: 'development' });
    let environmentFailed = false;
    loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production', {
        info: () => {},
        error: () => { environmentFailed = true; },
    }, true);
    if (environmentFailed)
        throw new Error('WORKER_CONFIGURATION_INVALID');
    if (readJobConfiguration().kind !== 'filesystem')
        throw new Error('Local runner requires the filesystem store. GCS jobs are dispatched by Cloud Tasks.');
    const jobs = await configuredJobs(), once = process.argv.includes('--once');
    let stopping = false;
    process.on('SIGINT', () => { stopping = true; });
    process.on('SIGTERM', () => { stopping = true; });
    do {
        await sweepOpenSnaRuntime();
        // No workbook content, filenames or capability IDs are written to logs.
        for (const id of await jobs.runnable()) {
            if (stopping)
                break;
            if (process.env.OPEN_SNA_R_DISABLED !== '1')
                await runOpenSnaJob(jobs, id);
        }
        if (!once && !stopping)
            await new Promise(resolve => setTimeout(resolve, 2000));
    } while (!once && !stopping);
}
main().catch(() => { console.error('Open SNA worker stopped: configuration or durable storage unavailable.'); process.exitCode = 1; });
