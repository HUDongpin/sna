#!/usr/bin/env bash

set -euo pipefail

require_value() {
  local variable_name="$1"
  if [[ -z "${!variable_name:-}" ]]; then
    printf 'Missing required environment variable: %s\n' "$variable_name" >&2
    exit 2
  fi
}

require_value OPEN_SNA_GCP_PROJECT_ID
require_value OPEN_SNA_WORKER_TOKEN_FILE

if [[ ! -f "$OPEN_SNA_WORKER_TOKEN_FILE" ]]; then
  printf 'Worker token file does not exist.\n' >&2
  exit 2
fi

token_bytes="$(wc -c < "$OPEN_SNA_WORKER_TOKEN_FILE" | tr -d '[:space:]')"
token_newlines="$(tr -cd '\n' < "$OPEN_SNA_WORKER_TOKEN_FILE" | wc -c | tr -d '[:space:]')"
if (( token_bytes < 32 || token_bytes > 256 || token_newlines != 0 )); then
  printf 'Worker token file must contain 32 to 256 bytes with no newline.\n' >&2
  exit 2
fi

gcp_region="${OPEN_SNA_GCP_REGION:-asia-east2}"
service_name="${OPEN_SNA_GCP_SERVICE:-open-sna-r-worker}"
artifact_repository="${OPEN_SNA_GCP_REPOSITORY:-open-sna}"
secret_name="${OPEN_SNA_GCP_SECRET:-open-sna-r-worker-token}"
release_id="$(git rev-parse --short=12 HEAD)"
image_uri="${gcp_region}-docker.pkg.dev/${OPEN_SNA_GCP_PROJECT_ID}/${artifact_repository}/${service_name}:${release_id}"
service_account_name="${service_name}"
service_account_email="${service_account_name}@${OPEN_SNA_GCP_PROJECT_ID}.iam.gserviceaccount.com"

gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  --project "$OPEN_SNA_GCP_PROJECT_ID" \
  --quiet

if ! gcloud artifacts repositories describe "$artifact_repository" \
  --location "$gcp_region" \
  --project "$OPEN_SNA_GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$artifact_repository" \
    --repository-format docker \
    --location "$gcp_region" \
    --description "Open SNA production worker images" \
    --project "$OPEN_SNA_GCP_PROJECT_ID" \
    --quiet
fi

gcloud builds submit . \
  --config cloudbuild.open-sna-worker.yaml \
  --substitutions "_IMAGE=${image_uri}" \
  --project "$OPEN_SNA_GCP_PROJECT_ID" \
  --quiet

if gcloud secrets describe "$secret_name" \
  --project "$OPEN_SNA_GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud secrets versions add "$secret_name" \
    --data-file "$OPEN_SNA_WORKER_TOKEN_FILE" \
    --project "$OPEN_SNA_GCP_PROJECT_ID" \
    --quiet
else
  gcloud secrets create "$secret_name" \
    --replication-policy automatic \
    --data-file "$OPEN_SNA_WORKER_TOKEN_FILE" \
    --project "$OPEN_SNA_GCP_PROJECT_ID" \
    --quiet
fi

if ! gcloud iam service-accounts describe "$service_account_email" \
  --project "$OPEN_SNA_GCP_PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$service_account_name" \
    --display-name "Open SNA R worker" \
    --project "$OPEN_SNA_GCP_PROJECT_ID" \
    --quiet
fi

gcloud secrets add-iam-policy-binding "$secret_name" \
  --member "serviceAccount:${service_account_email}" \
  --role roles/secretmanager.secretAccessor \
  --project "$OPEN_SNA_GCP_PROJECT_ID" \
  --quiet >/dev/null

gcloud run deploy "$service_name" \
  --image "$image_uri" \
  --region "$gcp_region" \
  --project "$OPEN_SNA_GCP_PROJECT_ID" \
  --platform managed \
  --execution-environment gen2 \
  --service-account "$service_account_email" \
  --allow-unauthenticated \
  --cpu 8 \
  --memory 16Gi \
  --concurrency 1 \
  --min-instances 0 \
  --max-instances 1 \
  --timeout 300 \
  --port 8080 \
  --set-env-vars "OPEN_SNA_R_WORKER_MODE=1,OPEN_SNA_R_WORKER_TMP_ROOT=/tmp/open-sna-jobs,R_LIBS_USER=/opt/open-sna/r-library" \
  --update-secrets OPEN_SNA_R_WORKER_TOKEN="${secret_name}:latest" \
  --labels "app=open-sna,component=r-worker,release=${release_id}" \
  --quiet

gcloud run services describe "$service_name" \
  --region "$gcp_region" \
  --project "$OPEN_SNA_GCP_PROJECT_ID" \
  --format 'value(status.url)'
