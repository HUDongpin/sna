# Open SNA R worker deployment

## Purpose

The public Next.js application cannot execute R on Vercel. Production workbook analysis therefore uses two services:

1. `www.sna.hk` accepts and validates the XLSX upload.
2. The Vercel route forwards the validated workbook over HTTPS with a Bearer token.
3. A dedicated container runs the pinned R analysis and returns aggregate JSON.
4. The Vercel route revalidates the JSON contract, replaces source names with neutral labels, optionally adds aggregate-only LUNA interpretation, and returns the result to the browser.

The worker never returns source rows or respondent identifiers. It deletes the per-job directory in `finally` after success or failure.

## Capacity boundary

Use a dedicated Linux host or container service. Start production qualification at 8 vCPU and 16 GiB RAM with exactly one active analysis per worker process. Do not colocate the worker with several unrelated production sites or a primary database without measured CPU, peak RSS, and timeout evidence.

The current HTTP workflow is synchronous and bounded by 255 seconds in the application. Before advertising larger workbooks or multiple simultaneous analyses, add a durable job queue, cancellation, bounded object storage, and load testing.

## Selected managed target: Google Cloud Run

The initial managed deployment target is Google Cloud Run in Hong Kong region `asia-east2` with these fixed release settings:

```text
CPU: 8 vCPU
Memory: 16 GiB
Container concurrency: 1
Minimum instances: 0
Maximum instances: 1
Request timeout: 300 seconds
Execution environment: gen2
Ingress: public HTTPS endpoint protected by the application Bearer token
Secret source: Google Secret Manager
```

Cloud Run injects its selected `PORT` at runtime. The worker standalone server and its Docker health check both honor that value.

The automated release files are:

- `/cloudbuild.open-sna-worker.yaml`, which builds the final Linux image with an 8-vCPU Cloud Build machine;
- `/scripts/deploy-open-sna-worker-cloud-run.sh`, which creates the Artifact Registry repository, builds the image, versions the worker token in Secret Manager, creates a dedicated service account, grants only that account access to the worker secret, and deploys the bounded Cloud Run service.

The deployment script requires an existing Google Cloud project with billing enabled and an authenticated `gcloud` identity authorized to enable APIs, run Cloud Build, manage Artifact Registry and Secret Manager, create a service account, and deploy Cloud Run.

## Build

From the repository root:

```bash
docker build \
  --file Dockerfile.open-sna-worker \
  --tag open-sna-r-worker:2026-08-23 \
  .
```

The build must finish the following gates:

- Next.js Webpack production build;
- restoration of all 159 locked R packages;
- `analysis/open-sna/preflight.R` with R 4.4.2 and the eight verified direct package versions;
- creation of the non-root `open-sna` runtime user.

Do not push an image that has not completed all four gates.

For the selected Cloud Run target, create a newline-free token file outside tracked paths, then run:

```bash
umask 077
openssl rand -hex 32 | tr -d '\n' > tmp/open-sna-worker-token

export OPEN_SNA_GCP_PROJECT_ID=<billing-enabled-project-id>
export OPEN_SNA_WORKER_TOKEN_FILE="$PWD/tmp/open-sna-worker-token"
scripts/deploy-open-sna-worker-cloud-run.sh
```

The script prints only the Cloud Run HTTPS service URL. It does not print the token. Preserve the local token file until the matching Vercel secret has been configured, then remove it through the approved secure cleanup process.

## Runtime configuration

Provide these variables through the hosting platform's secret manager:

```text
OPEN_SNA_R_WORKER_MODE=1
OPEN_SNA_R_WORKER_TOKEN=<random service token of at least 32 characters>
OPEN_SNA_R_WORKER_TMP_ROOT=/tmp/open-sna-jobs
R_LIBS_USER=/opt/open-sna/r-library
```

Do not place the token in the image, repository, deployment log, screenshot, or report. Bind the container behind a TLS reverse proxy. Apply an ingress body limit slightly above 5 MiB, an application rate limit, a 300-second upstream timeout, one request at a time, and a maximum expanded ZIP size and entry count at the gateway.

A representative hardened start command is:

```bash
docker run --detach \
  --name open-sna-r-worker \
  --cpus 8 \
  --memory 16g \
  --pids-limit 256 \
  --read-only \
  --tmpfs /tmp:rw,nosuid,nodev,noexec,size=6g \
  --tmpfs /app/.next/cache:rw,nosuid,nodev,noexec,size=128m \
  --env-file /root/open-sna-worker.env \
  --publish 127.0.0.1:3101:3000 \
  open-sna-r-worker:2026-08-23
```

The environment file must be owned by root and readable only by root. Restrict outbound network access from the worker after image startup requirements and monitoring destinations are identified. The R analysis itself does not require internet access.

## Web application configuration

After the worker is healthy behind HTTPS, configure the linked Vercel project:

```text
OPEN_SNA_R_API_URL=https://<worker-host>/api/open-sna/analyze
OPEN_SNA_R_API_TOKEN=<same service token>
```

Both values are required. The Web adapter rejects missing or short tokens and rejects non-HTTPS non-loopback URLs.

## Release gates

Complete every gate before describing the production loop as working:

1. Worker image build succeeds on the target architecture.
2. Container health becomes `healthy` while an unauthenticated POST returns `401 WORKER_UNAUTHORIZED`.
3. R preflight passes inside the final runtime image.
4. A valid synthetic XLSX returns HTTP 200 through the public Vercel endpoint.
5. The browser changes from the reference result to `Uploaded workbook` and renders all eight panels.
6. The response contains `rawRowsIncluded: false`, `uploadedWorkbookRetainedByEngine: false`, no `records`, and no `rawData`.
7. The worker job directory is empty after the response.
8. A second simultaneous analysis returns `429 WORKER_BUSY`.
9. Invalid workbooks return the bounded `422 WORKBOOK_INVALID` response without worker diagnostics.
10. Production logs, screenshots, and reports contain no workbook rows, tokens, identifiers, or raw R stderr.

## Rollback

Remove `OPEN_SNA_R_API_URL` and `OPEN_SNA_R_API_TOKEN` from Vercel and redeploy the Web application. Uploads will fail closed with `503 R_ENGINE_NOT_CONFIGURED`, while the aggregate reference analysis remains available. Then stop the worker container. Do not replace failed uploads with the bundled reference result.
