# Open SNA durable R worker deployment

This runbook prepares and qualifies the durable researcher workflow. Local implementation tests and mocked deployment commands do **not** establish target-container readiness, production readiness, or acceptance by a researcher pilot. Running the deployment script is a separate cloud mutation; nothing in this document or the local test suite activates public R, changes DNS, or deploys the web application.

## Request flow and authentication

1. The web application forwards workbook inspection, selection validation, job creation, status, cancellation, and result requests to the configured worker over HTTPS with the application service Bearer token.
2. The worker persists job state, workbook bytes, and the selected analysis specification in a dedicated private GCS bucket before dispatch. Cloud Tasks receives an opaque job ID in its request path and an empty JSON body; it never receives workbook rows.
3. A Cloud Task invokes `/api/open-sna/internal/jobs/<job-id>/run` using a Google-signed OIDC token. The worker checks the exact audience, issuer, verified email, and configured task identity. Task names are `<job-id>-<dispatchGeneration>` so maintenance can recover from deleted or exhausted task-name tombstones.
4. Cloud Scheduler invokes `/api/open-sna/internal/maintenance` every minute using the **same OIDC service account and exact audience**. Maintenance repairs missed dispatches and retries terminal/expiry cleanup without requiring an open browser.
5. The worker stores the validated aggregate result. The web application owns optional LUNA interpretation and commits the finalized aggregate through Bearer-authenticated finalization endpoints. The OpenRouter key belongs to the web application's secret environment; it is not installed on the R worker.

Cloud Run retains `--allow-unauthenticated`: its HTTPS endpoint must accept both application Bearer tokens and Google OIDC tokens. Authentication is enforced by the application routes. Changing this to a Cloud Run IAM-only ingress boundary would break the existing web Bearer-token adapter and requires a separate design change. The OIDC identity has no storage, queue, or secret access of its own.

The job ID is a browser-side bearer capability. Do not put it in support reports, screenshots, analytics, or shared URLs. Application logging avoids raw workbook data, but this does not disable platform request logs. Before researcher release, configure and verify exclusions or path redaction for `/api/open-sna/jobs/` and `/api/open-sna/internal/jobs/` across the web host, Cloud Run request logs, proxies, traces, and any enabled Data Access logs that record GCS object names or task names. The deploy script sets Cloud Tasks operation log sampling to zero; that setting does not cover other platform logs.

## Selected target and limits

| Setting | Prepared value |
| --- | --- |
| Region | `asia-east2` (Hong Kong) |
| Cloud Run CPU / memory | 8 vCPU / 16 GiB |
| HTTP requests per container / configured maximum instances | 8 / 1 |
| Minimum instances / environment | 0 / gen2 |
| Cloud Run and Cloud Tasks dispatch deadline | 900 seconds |
| R analysis deadline / durable run lease | 600 / 660 seconds |
| Queue concurrency / rate | 1 / 1 dispatch per second |
| Queue attempts / backoff | 5 attempts; 30–300 seconds |
| Maintenance schedule / attempt deadline | Every minute / 180 seconds |
| Job availability | 24 hours from creation |
| Bucket lifecycle safety net | Delete objects under `jobs/` at age 1 day |

The long-running task request awaits an asynchronously spawned R subprocess. HTTP concurrency is eight so status polling, cancellation, new submissions, and maintenance can reach the same Node/Next.js instance while that task remains open. Cloud Tasks dispatch concurrency and the shared durable execution lease still restrict durable job analysis to one active run. A second durable submission should queue; it is not the former synchronous `429 WORKER_BUSY` acceptance criterion.

Eight is an HTTP admission ceiling, not a guarantee of eight responsive requests under load. Inspection/validation requests also launch bounded R subprocesses, so measure their overlap with a full analysis, peak memory, and status/cancellation latency on the target. Cold starts, CPU pressure, and saturated request slots can delay maintenance; the minute schedule is a recovery cadence. Cloud Run can also temporarily exceed an instance limit, so the durable lease remains the analysis guard across instances/revisions. See Google's [concurrency guidance](https://cloud.google.com/run/docs/about-concurrency) and [maximum-instance caveats](https://cloud.google.com/run/docs/configuring/max-instances).

## Deployment assets and prerequisites

- `scripts/deploy-open-sna-worker-cloud-run.sh`: provisions the selected worker, dedicated storage, queue, service identities, and maintenance schedule.
- `deploy/open-sna/job-lifecycle.json`: the bounded storage lifecycle rule.
- `deploy/open-sna/verify-job-bucket.mjs`: checks bucket ownership and configured privacy settings from Storage API metadata.
- `deploy/open-sna/cloudbuild.gcloudignore`: excludes local credentials and research workbook/document files from the Cloud Build upload.
- `cloudbuild.open-sna-worker.yaml` and `Dockerfile.open-sna-worker`: build the Linux worker image with the pinned R runtime.
- `tests/open-sna-durable-deploy.test.ts`: runs the shell script against a local fake `gcloud`, without cloud credentials or network access.

Use Bash, Node.js, Git, and a current Google Cloud CLI. The selected project must have billing and a deployment identity authorized to enable APIs, build/publish images, manage the named storage/queue/schedule/secret, create service accounts, bind the resource-scoped roles below, and deploy Cloud Run. The deployment identity also needs `iam.serviceAccounts.actAs` on the worker and task identities. These are operator permissions, not permissions granted to the runtime worker.

Enabling the Cloud Tasks and Cloud Scheduler APIs normally establishes their Google-managed service agents. Verify that the project still grants `roles/cloudtasks.serviceAgent` and `roles/cloudscheduler.serviceAgent` to the corresponding Google-managed agents. An old API setup or a removed service-agent grant needs an explicitly reviewed IAM repair; do not compensate by granting broad roles to the worker or by disabling OIDC checks. Google's [Cloud Tasks service-agent guidance](https://cloud.google.com/tasks/docs/creating-http-target-tasks#manually_add_the_cloud_tasks_service_agent_role) and [Cloud Scheduler authentication guidance](https://cloud.google.com/scheduler/docs/http-target-auth) describe these prerequisites.

The script grants only these runtime resource bindings:

| Principal | Resource | Role |
| --- | --- | --- |
| Worker service account | Named GCS bucket | `roles/storage.objectAdmin` |
| Worker service account | Named Cloud Tasks queue | `roles/cloudtasks.enqueuer` and `roles/cloudtasks.viewer` |
| Worker service account | Separate task service account | `roles/iam.serviceAccountUser` |
| Worker service account | Named worker-token secret | `roles/secretmanager.secretAccessor` |

Queue viewer access includes the task lookup used to distinguish a live task from a deleted-name tombstone. Enqueuer alone is insufficient for recovery. No project-wide worker IAM grants or service-account keys are created by the script.

## Dedicated storage and cleanup

Choose a **new, dedicated bucket and queue** explicitly. Never point the script at a shared upload bucket, backup archive, or unrelated queue. An existing bucket is reusable only when it belongs to the selected project and already has all of these labels:

```text
app=open-sna
purpose=durable-jobs
managed-by=open-sna-worker-deploy
```

The script refuses an unrelated/unreadable bucket before making cloud changes. It also refuses an existing retention policy, default event-based hold, or enabled per-object retention. It does not silently remove those protections to reuse an archive. Choose a fresh dedicated bucket instead; do not relabel an unrelated bucket just to bypass the check.

The configured bucket has uniform bucket-level access, enforced public access prevention, no versioning, disabled soft delete, no retention policy, no default hold, and only the `jobs/` one-day deletion rule. The script reads back and verifies those settings before deploying the worker. The relevant commands and flags are documented by Google for [bucket metadata](https://cloud.google.com/sdk/gcloud/reference/storage/buckets/describe) and [bucket updates](https://cloud.google.com/sdk/gcloud/reference/storage/buckets/update).

The application attempts to delete workbook and selection objects when a job succeeds, fails, is cancelled, or expires. Successful aggregate results remain available until job expiry. Maintenance retries cleanup independently of the browser. GCS lifecycle deletion is an asynchronous backstop, not proof of immediate deletion or an exact 24-hour physical-erasure guarantee. Disabling soft delete does not purge objects that were already soft-deleted; disabling versioning does not purge existing versions. Before any researcher data is allowed, verify the bucket contains no historical raw-object versions, soft-deleted uploads, or held objects. A new empty bucket is the preferred starting point.

## Prepare and invoke after deployment authorization

Run the local gates first:

```bash
bash -n scripts/deploy-open-sna-worker-cloud-run.sh
npx tsx --test tests/open-sna-durable-deploy.test.ts
npm run release:verify
```

Inspect the final runtime image on the target architecture. The pinned R preflight and applicable R regressions must pass inside that image, including validation isolation/fingerprints, strict CLI rejection, group selection, conditioning, and the researcher-selection workflow. A successful local Node test run cannot substitute for these checks. The container must start as the non-root runtime user, honor Cloud Run's `PORT`, and contain the Google storage/tasks/auth dependencies needed by the traced standalone server.

The token file must be outside the repository and Cloud Build upload context. Use the already approved worker token for an update; token rotation also requires coordinating the web secret. For a genuinely new worker, an example preparation is:

```bash
umask 077
worker_secret_dir="$(mktemp -d "${TMPDIR:-/tmp}/open-sna-secret.XXXXXX")"
openssl rand -hex 32 | tr -d '\n' > "$worker_secret_dir/worker-token"

export OPEN_SNA_GCP_PROJECT_ID='<billing-enabled-project-id>'
export OPEN_SNA_WORKER_TOKEN_FILE="$worker_secret_dir/worker-token"
export OPEN_SNA_GCS_BUCKET='<new-globally-unique-dedicated-job-bucket>'
export OPEN_SNA_TASKS_QUEUE='<new-dedicated-job-queue>'

# Execute only within the separately authorized cloud deployment scope.
scripts/deploy-open-sna-worker-cloud-run.sh
```

Do not print or commit the token. The script sends it to Secret Manager by file reference, with a fresh secret version. It replaces the worker environment/secret allowlists, including removing any accidental AI-provider variables from the worker configuration. Inspect those changes before invocation if the worker has custom environment settings. The script's final message contains no token, job ID, or service URL; Google CLI operations can still print ordinary deployment metadata. Review operational logs before sharing them.

The script defaults and optional inputs are:

| Deployment input | Default / purpose |
| --- | --- |
| `OPEN_SNA_GCP_REGION` | `asia-east2` |
| `OPEN_SNA_GCP_SERVICE` | `open-sna-durable-worker`; a new service alongside the old synchronous worker |
| `OPEN_SNA_GCP_WORKER_ACCOUNT` | `open-sna-r-worker`; reuse the existing worker service account, not the old Cloud Run service |
| `OPEN_SNA_GCP_REPOSITORY` | `open-sna` Artifact Registry repository |
| `OPEN_SNA_GCP_SECRET` | `open-sna-durable-worker-token`; separate from the old worker secret |
| `OPEN_SNA_TASKS_LOCATION` | Same as the selected region |
| `OPEN_SNA_TASKS_SERVICE_ACCOUNT` | `open-sna-tasks@<project>.iam.gserviceaccount.com`; must be separate and in this project |
| `OPEN_SNA_GCP_SCHEDULER` | `<worker-service>-maintenance` |

Queue names and bucket names have no default, to avoid touching an unrelated existing resource. Keep the queue and scheduler dedicated to this service. The script refuses a pre-existing queue with routing/auth overrides or a non-running state; it does not resume an operator-paused queue. [Queue retry/rate settings](https://cloud.google.com/sdk/gcloud/reference/tasks/queues/update) and [Scheduler HTTP OIDC settings](https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http) are explicitly set by the script.

A new Cloud Run service has no origin until it is created. The first revision is deployed with an incomplete origin and therefore rejects durable job creation. The script then reads `status.url`, updates both `OPEN_SNA_WORKER_ORIGIN` and `OPEN_SNA_TASKS_AUDIENCE` to that exact HTTPS origin, and only then creates or updates maintenance. No trailing slash, path, custom audience, or scheduler endpoint path is included in the audience. Existing services use their currently reported origin for the initial deploy and receive the same completion update. A failure between these steps leaves a partially configured deployment; keep public-web activation off and resolve the failed step before qualification.

## Worker environment and web handoff

The script configures:

```text
OPEN_SNA_R_WORKER_MODE=1
OPEN_SNA_R_WORKER_TOKEN=<Secret Manager reference; never plaintext in this file>
OPEN_SNA_R_WORKER_TMP_ROOT=/tmp/open-sna-jobs
R_LIBS_USER=/opt/open-sna/r-library
OPEN_SNA_JOB_STORE=gcs
OPEN_SNA_GCS_BUCKET=<dedicated-bucket>
GOOGLE_CLOUD_PROJECT=<project-id>
OPEN_SNA_TASKS_LOCATION=asia-east2
OPEN_SNA_TASKS_QUEUE=<dedicated-queue>
OPEN_SNA_TASKS_SERVICE_ACCOUNT=<separate-task-identity>
OPEN_SNA_WORKER_ORIGIN=<exact-HTTPS-Cloud-Run-origin>
OPEN_SNA_TASKS_AUDIENCE=<same-exact-origin>
```

`filesystem` storage is for local development only; production worker mode rejects it. The developer worker loop is not the Cloud Run dispatcher: production uses the OIDC task route in the HTTP container.

After worker qualification, the separately authorized web rollout requires the existing adapter pair:

```text
OPEN_SNA_R_API_URL=https://<worker-host>/api/open-sna/analyze
OPEN_SNA_R_API_TOKEN=<matching-worker-token>
```

The adapter uses the configured worker origin for the inspect, validate, jobs, status, cancel, result, and finalization paths. Keep the OpenRouter secret on that web deployment. Do not change a public `OPEN_SNA_R_DISABLED=1` setting or activate uploads until public rollout has been authorized. This script does not modify the web project, DNS, or the Aliyun origin.

The new worker writes schema `1.2`, including the legacy synchronous `/analyze` path. The currently deployed older web adapter may accept only schema `1.1`/`1.0`, while the new researcher workflow requires job endpoints absent from the older worker. Therefore stage the new durable worker alongside the existing synchronous worker, qualify it privately, then deploy the new web build together with its matching worker URL/token. Do not replace the old worker in place. Preserve the old worker, old token, and matching old web configuration for rollback. The script defaults to a new service and secret name specifically to support this transition.

## Target qualification and researcher pilot gates

Record aggregate counts, timings, exit codes, and redacted checks only. Use synthetic workbooks until the privacy and execution gates pass.

1. **Final container:** Build on the target architecture, pass pinned R preflight/regressions, verify required standalone modules, and inspect startup/health behavior. An unauthenticated workbook POST must receive the bounded `401 WORKER_UNAUTHORIZED` response.
2. **Identity:** Task and maintenance requests with the exact OIDC identity/audience succeed. Missing tokens, the application Bearer token on OIDC-only routes, incorrect audiences, and wrong service-account emails fail closed. Web adapter calls still use their distinct service token.
3. **Durability:** Creation returns `202` with an opaque receipt. Refreshing the browser preserves progress. Kill/restart the worker after upload and before dispatch, during R, and between result publication and finalization; demonstrate recovery without duplicate result publication. Exercise deleted/exhausted task-name recovery and three bounded application attempts.
4. **Queue and capacity:** Submit two valid jobs together. While the first task is still running R, verify that status GETs, cancellation DELETEs, new submissions, and maintenance receive responses without waiting for that analysis to finish. Demonstrate queued progress, one active durable analysis across duplicate delivery/revisions, correct release of the execution slot, and bounded peak memory/time at each offered bootstrap setting, including overlap with inspection/validation requests. Measure control-request latency under the configured eight-request admission limit. Queue delivery retries must outlive temporary lease occupancy.
5. **Cancellation and expiry:** Cancel queued/running work, prove the R process group stops, prove partial files and GCS input objects disappear, and prove a late attempt cannot publish. Repeat expiry and cleanup with the browser closed. Inspect historical object versions and soft-deleted objects as well as current keys.
6. **Result contract:** Validate schema `1.2`, exact selected items/community mapping, reverse scoring, row/group counts, available NCT, and the fixed analysis settings. Confirm `rawRowsIncluded: false`, `uploadedWorkbookRetainedByEngine: false`, and absence of raw records/identifiers. The engine retention marker describes the R engine; queued workbook persistence and its deletion must be checked separately.
7. **Finalization:** Demonstrate aggregate-only AI input, one committed interpretation under concurrent result polls, usable aggregate output if the optional provider is unavailable, and that the worker has no provider key.
8. **Browser and logs:** Demonstrate the end-to-end researcher flow, all result panels/exports, clear retry/cancel/expired states, and verified platform log handling of capability IDs. Invalid workbooks must receive bounded errors without raw R stderr or rows.
9. **Human pilot:** Have a researcher complete the selection, validation, submission, interpretation, and export workflow using an approved dataset. Record task completion and misunderstandings. Automated checks alone do not establish usability or scientific acceptance.

## Rollback and partial failure

Preserve the bucket and durable job state during rollback. Restore the prior web build together with its prior synchronous-worker URL/token when reverting the public workflow; the old worker remains available because deployment was parallel. First stop new public submissions through the separately authorized web configuration, then pause the dedicated task queue if needed to avoid incompatible dispatches. Keep or restore compatible maintenance long enough to complete required cleanup; blindly disabling it can strand uploaded workbooks. Inspect running jobs and the previous image/configuration before reverting worker traffic. A synchronous-only worker cannot service the durable endpoints, so retain a compatible job backend until jobs complete or are explicitly cancelled and cleaned.

Do not delete the bucket, purge the queue, remove holds, remove secret versions, or change DNS as an automatic rollback step. Those actions require their own concrete disposition. Retain redacted evidence and inspect any objects affected by a partial failure. Public uploads must fail closed while the configured backend is unavailable; never substitute the bundled reference result for a failed upload.
