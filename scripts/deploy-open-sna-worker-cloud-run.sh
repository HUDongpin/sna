#!/usr/bin/env bash

# This script mutates the explicitly selected worker resources when invoked.
# It does not enable public-web R, change Vercel configuration, or change DNS.
set -euo pipefail
umask 077

require_value() {
  if [[ -z "${!1:-}" ]]; then
    printf 'Missing required environment variable: %s\n' "$1" >&2
    exit 2
  fi
}
fail() { printf '%s\n' "$1" >&2; exit 2; }
for variable in OPEN_SNA_GCP_PROJECT_ID OPEN_SNA_WORKER_TOKEN_FILE OPEN_SNA_GCS_BUCKET OPEN_SNA_TASKS_QUEUE; do
  require_value "$variable"
done
for command in gcloud node git; do
  command -v "$command" >/dev/null || fail "Required command is unavailable: ${command}"
done

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repository_root"
[[ -f "$OPEN_SNA_WORKER_TOKEN_FILE" ]] || fail 'Worker token file does not exist.'
token_bytes="$(wc -c < "$OPEN_SNA_WORKER_TOKEN_FILE" | tr -d '[:space:]')"
token_newlines="$(tr -cd '\n\r' < "$OPEN_SNA_WORKER_TOKEN_FILE" | wc -c | tr -d '[:space:]')"
if (( token_bytes < 32 || token_bytes > 256 || token_newlines != 0 )); then
  fail 'Worker token file must contain 32 to 256 bytes with no newline.'
fi
# Cloud Build uploads source before Docker applies .dockerignore. Keep the token
# outside that source tree even if an operator later changes the ignore rules.
node - "$OPEN_SNA_WORKER_TOKEN_FILE" "$repository_root" <<'NODE'
const fs = require('node:fs'), path = require('node:path');
const token = fs.realpathSync(process.argv[2]), root = fs.realpathSync(process.argv[3]);
if (token === root || token.startsWith(root + path.sep)) {
  console.error('Worker token file must be outside the repository/build context.');
  process.exit(2);
}
NODE

gcp_region="${OPEN_SNA_GCP_REGION:-asia-east2}"
service_name="${OPEN_SNA_GCP_SERVICE:-open-sna-durable-worker}"
worker_account_name="${OPEN_SNA_GCP_WORKER_ACCOUNT:-open-sna-r-worker}"
artifact_repository="${OPEN_SNA_GCP_REPOSITORY:-open-sna}"
secret_name="${OPEN_SNA_GCP_SECRET:-open-sna-durable-worker-token}"
tasks_location="${OPEN_SNA_TASKS_LOCATION:-$gcp_region}"
scheduler_name="${OPEN_SNA_GCP_SCHEDULER:-${service_name}-maintenance}"
service_account_email="${worker_account_name}@${OPEN_SNA_GCP_PROJECT_ID}.iam.gserviceaccount.com"
tasks_account_email="${OPEN_SNA_TASKS_SERVICE_ACCOUNT:-open-sna-tasks@${OPEN_SNA_GCP_PROJECT_ID}.iam.gserviceaccount.com}"
tasks_account_name="${tasks_account_email%%@*}"
[[ "$OPEN_SNA_GCP_PROJECT_ID" =~ ^[a-z][a-z0-9-]{4,61}[a-z0-9]$ ]] || fail 'Invalid Google Cloud project ID.'
[[ "$OPEN_SNA_GCS_BUCKET" =~ ^[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]$ ]] || fail 'Invalid dedicated bucket name.'
[[ "$OPEN_SNA_TASKS_QUEUE" =~ ^[a-zA-Z0-9_-]{1,100}$ ]] || fail 'Invalid dedicated queue name.'
[[ "$service_name" =~ ^[a-z][a-z0-9-]{0,47}[a-z0-9]$ ]] || fail 'Invalid worker service name.'
[[ "$worker_account_name" =~ ^[a-z][a-z0-9-]{4,28}[a-z0-9]$ ]] || fail 'Invalid worker service account ID (6 to 30 characters required).'
[[ "$tasks_account_name" =~ ^[a-z][a-z0-9-]{4,28}[a-z0-9]$ ]] || fail 'Invalid task service account ID.'
[[ "$tasks_account_email" == "${tasks_account_name}@${OPEN_SNA_GCP_PROJECT_ID}.iam.gserviceaccount.com" && "$tasks_account_email" != "$service_account_email" ]] || fail 'Task identity must be a separate service account in the selected project.'
for value in "$gcp_region" "$tasks_location" "$artifact_repository" "$secret_name" "$scheduler_name"; do
  [[ "$value" =~ ^[a-zA-Z0-9_-]+$ ]] || fail 'Invalid resource name or location.'
done

deployment_tmp="$(mktemp -d "${TMPDIR:-/tmp}/open-sna-deploy.XXXXXX")"
trap 'rm -rf "$deployment_tmp"' EXIT
bucket_uri="gs://${OPEN_SNA_GCS_BUCKET}"
project_number="$(gcloud projects describe "$OPEN_SNA_GCP_PROJECT_ID" --format 'value(projectNumber)')"
[[ "$project_number" =~ ^[0-9]+$ ]] || fail 'Could not verify the selected project number.'

# Validate ownership before any mutation. A permission failure is not absence.
bucket_exists=false
if gcloud storage buckets describe "$bucket_uri" --raw --format json --project "$OPEN_SNA_GCP_PROJECT_ID" >"$deployment_tmp/bucket.json" 2>"$deployment_tmp/bucket-error"; then
  bucket_exists=true
  node deploy/open-sna/verify-job-bucket.mjs "$deployment_tmp/bucket.json" "$project_number" "$OPEN_SNA_GCS_BUCKET" existing
else
  node - "$deployment_tmp/bucket-error" <<'NODE'
const text = require('node:fs').readFileSync(process.argv[2], 'utf8');
if (!/\b404\b|\bNOT_FOUND\b|\bNotFoundException\b/i.test(text)) {
  console.error('Cannot verify job bucket ownership: bucket lookup failed. No cloud changes made.');
  process.exit(2);
}
NODE
fi

gcloud services enable \
  artifactregistry.googleapis.com cloudbuild.googleapis.com run.googleapis.com \
  secretmanager.googleapis.com storage.googleapis.com cloudtasks.googleapis.com \
  cloudscheduler.googleapis.com iamcredentials.googleapis.com \
  --project "$OPEN_SNA_GCP_PROJECT_ID" --quiet >/dev/null

if [[ "$bucket_exists" == false ]]; then
  gcloud storage buckets create "$bucket_uri" \
    --location "$gcp_region" --uniform-bucket-level-access --public-access-prevention \
    --project "$OPEN_SNA_GCP_PROJECT_ID" --quiet >/dev/null
fi
gcloud storage buckets update "$bucket_uri" \
  --uniform-bucket-level-access --public-access-prevention \
  --clear-soft-delete --no-versioning --clear-retention-period --no-default-event-based-hold \
  --update-labels 'app=open-sna,purpose=durable-jobs,managed-by=open-sna-worker-deploy' \
  --lifecycle-file "$repository_root/deploy/open-sna/job-lifecycle.json" \
  --project "$OPEN_SNA_GCP_PROJECT_ID" --quiet >/dev/null
gcloud storage buckets describe "$bucket_uri" --raw --format json \
  --project "$OPEN_SNA_GCP_PROJECT_ID" >"$deployment_tmp/bucket.json"
node deploy/open-sna/verify-job-bucket.mjs "$deployment_tmp/bucket.json" "$project_number" "$OPEN_SNA_GCS_BUCKET" configured

for account in "$service_account_email" "$tasks_account_email"; do
  if ! gcloud iam service-accounts describe "$account" --project "$OPEN_SNA_GCP_PROJECT_ID" >/dev/null 2>&1; then
    gcloud iam service-accounts create "${account%%@*}" \
      --display-name "Open SNA ${account%%@*}" --project "$OPEN_SNA_GCP_PROJECT_ID" --quiet >/dev/null
  fi
done

queue_action=create
if gcloud tasks queues describe "$OPEN_SNA_TASKS_QUEUE" --location "$tasks_location" --project "$OPEN_SNA_GCP_PROJECT_ID" --format json >"$deployment_tmp/queue.json" 2>/dev/null; then
  # Per-task routing and OIDC must reach the configured worker unmodified. An
  # override suggests another workload; a paused queue is an operator decision.
  node - "$deployment_tmp/queue.json" <<'NODE'
const queue = JSON.parse(require('node:fs').readFileSync(process.argv[2], 'utf8'));
if (Object.keys(queue.httpTarget || {}).length || Object.keys(queue.appEngineRoutingOverride || {}).length || (queue.state && queue.state !== 'RUNNING')) {
  console.error('Refusing a queue with routing/auth overrides or a non-running state. Choose a dedicated running queue.');
  process.exit(2);
}
NODE
  queue_action=update
fi
gcloud tasks queues "$queue_action" "$OPEN_SNA_TASKS_QUEUE" \
  --location "$tasks_location" --max-concurrent-dispatches 1 --max-dispatches-per-second 1 \
  --max-attempts 5 --min-backoff 30s --max-backoff 300s --max-doublings 3 --max-retry-duration 0s \
  --log-sampling-ratio 0 --project "$OPEN_SNA_GCP_PROJECT_ID" --quiet >/dev/null
for role in roles/cloudtasks.enqueuer roles/cloudtasks.viewer; do
  gcloud tasks queues add-iam-policy-binding "$OPEN_SNA_TASKS_QUEUE" \
    --location "$tasks_location" --member "serviceAccount:${service_account_email}" \
    --role "$role" --project "$OPEN_SNA_GCP_PROJECT_ID" --quiet >/dev/null
done
gcloud storage buckets add-iam-policy-binding "$bucket_uri" \
  --member "serviceAccount:${service_account_email}" --role roles/storage.objectAdmin \
  --project "$OPEN_SNA_GCP_PROJECT_ID" --quiet >/dev/null
gcloud iam service-accounts add-iam-policy-binding "$tasks_account_email" \
  --member "serviceAccount:${service_account_email}" --role roles/iam.serviceAccountUser \
  --project "$OPEN_SNA_GCP_PROJECT_ID" --quiet >/dev/null

if gcloud secrets describe "$secret_name" --project "$OPEN_SNA_GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud secrets versions add "$secret_name" --data-file "$OPEN_SNA_WORKER_TOKEN_FILE" \
    --project "$OPEN_SNA_GCP_PROJECT_ID" --quiet >/dev/null
else
  gcloud secrets create "$secret_name" --replication-policy automatic --data-file "$OPEN_SNA_WORKER_TOKEN_FILE" \
    --project "$OPEN_SNA_GCP_PROJECT_ID" --quiet >/dev/null
fi
gcloud secrets add-iam-policy-binding "$secret_name" \
  --member "serviceAccount:${service_account_email}" --role roles/secretmanager.secretAccessor \
  --project "$OPEN_SNA_GCP_PROJECT_ID" --quiet >/dev/null

if ! gcloud artifacts repositories describe "$artifact_repository" --location "$gcp_region" --project "$OPEN_SNA_GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$artifact_repository" --repository-format docker \
    --location "$gcp_region" --description 'Open SNA worker images' --project "$OPEN_SNA_GCP_PROJECT_ID" --quiet >/dev/null
fi
release_id="$(git rev-parse --short=12 HEAD)"
image_uri="${gcp_region}-docker.pkg.dev/${OPEN_SNA_GCP_PROJECT_ID}/${artifact_repository}/${service_name}:${release_id}"
gcloud builds submit . --config cloudbuild.open-sna-worker.yaml \
  --ignore-file deploy/open-sna/cloudbuild.gcloudignore --substitutions "_IMAGE=${image_uri}" \
  --project "$OPEN_SNA_GCP_PROJECT_ID" --quiet >/dev/null

worker_origin="$(gcloud run services describe "$service_name" --region "$gcp_region" \
  --project "$OPEN_SNA_GCP_PROJECT_ID" --format 'value(status.url)' 2>/dev/null || true)"
validate_origin() {
  node - "$1" <<'NODE'
try {
  const origin = process.argv[2], parsed = new URL(origin);
  if (parsed.protocol !== 'https:' || parsed.origin !== origin || parsed.username || parsed.password || origin.includes(',')) throw new Error();
} catch { console.error('Could not obtain a valid HTTPS worker origin. Durable jobs remain unavailable.'); process.exit(2); }
NODE
}
if [[ -n "$worker_origin" ]]; then validate_origin "$worker_origin"; fi
worker_environment="OPEN_SNA_R_WORKER_MODE=1,OPEN_SNA_R_WORKER_TMP_ROOT=/tmp/open-sna-jobs,R_LIBS_USER=/opt/open-sna/r-library,OPEN_SNA_JOB_STORE=gcs,OPEN_SNA_GCS_BUCKET=${OPEN_SNA_GCS_BUCKET},GOOGLE_CLOUD_PROJECT=${OPEN_SNA_GCP_PROJECT_ID},OPEN_SNA_TASKS_LOCATION=${tasks_location},OPEN_SNA_TASKS_QUEUE=${OPEN_SNA_TASKS_QUEUE},OPEN_SNA_TASKS_SERVICE_ACCOUNT=${tasks_account_email},OPEN_SNA_WORKER_ORIGIN=${worker_origin},OPEN_SNA_TASKS_AUDIENCE=${worker_origin}"
# A new service has no origin yet. Its first revision fails closed for durable
# jobs; the following update supplies its exact URL as both origin and audience.
# Replace the worker's env/secret allowlists; AI provider keys belong to the web.
# Permit status/cancel/maintenance requests while a task awaits its R subprocess.
# The queue dispatch limit and durable global lease serialize job analyses.
gcloud run deploy "$service_name" \
  --image "$image_uri" --region "$gcp_region" --project "$OPEN_SNA_GCP_PROJECT_ID" \
  --platform managed --execution-environment gen2 --service-account "$service_account_email" \
  --allow-unauthenticated --cpu 8 --memory 16Gi --concurrency 8 \
  --min-instances 0 --max-instances 1 --timeout 900 --port 8080 \
  --set-env-vars "$worker_environment" --set-secrets "OPEN_SNA_R_WORKER_TOKEN=${secret_name}:latest" \
  --labels "app=open-sna,component=r-worker,release=${release_id}" --quiet >/dev/null
worker_origin="$(gcloud run services describe "$service_name" --region "$gcp_region" \
  --project "$OPEN_SNA_GCP_PROJECT_ID" --format 'value(status.url)')"
validate_origin "$worker_origin"
gcloud run services update "$service_name" --region "$gcp_region" --project "$OPEN_SNA_GCP_PROJECT_ID" \
  --update-env-vars "OPEN_SNA_WORKER_ORIGIN=${worker_origin},OPEN_SNA_TASKS_AUDIENCE=${worker_origin}" --quiet >/dev/null

scheduler_action=create
if gcloud scheduler jobs describe "$scheduler_name" --location "$tasks_location" --project "$OPEN_SNA_GCP_PROJECT_ID" >/dev/null 2>&1; then
  scheduler_action=update
fi
gcloud scheduler jobs "$scheduler_action" http "$scheduler_name" \
  --location "$tasks_location" --schedule '* * * * *' --time-zone Etc/UTC \
  --uri "${worker_origin}/api/open-sna/internal/maintenance" --http-method POST --message-body '{}' \
  --oidc-service-account-email "$tasks_account_email" --oidc-token-audience "$worker_origin" \
  --attempt-deadline 180s --max-retry-attempts 3 --min-backoff 10s --max-backoff 60s \
  --description 'Open SNA durable job recovery and expiry maintenance' \
  --project "$OPEN_SNA_GCP_PROJECT_ID" --quiet >/dev/null

printf 'Worker resources configured; public-web activation and production qualification remain separate.\n'
