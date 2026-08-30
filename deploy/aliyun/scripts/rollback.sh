#!/usr/bin/env bash
set -euo pipefail

if [ "${CONFIRM_ROLLBACK:-}" != "YES" ]; then
  echo "Set CONFIRM_ROLLBACK=YES to proceed." >&2
  exit 2
fi

previous_web_digest="${1:-}"
previous_worker_digest="${2:-}"
previous_release_sha="${3:-}"

re_hex='^[0-9a-f]{64}$'
re_sha='^[0-9a-f]{40}$'

[[ $previous_web_digest =~ $re_hex ]] || { echo "previous web digest must be a 64-character lowercase hex value" >&2; exit 2; }
[[ $previous_worker_digest =~ $re_hex ]] || { echo "previous worker digest must be a 64-character lowercase hex value" >&2; exit 2; }
[[ $previous_release_sha =~ $re_sha ]] || { echo "previous release SHA must be a 40-character lowercase hex value" >&2; exit 2; }
[[ "$(id -u)" -eq 0 ]] || { echo "rollback must run as root" >&2; exit 2; }

compose_file="${OPEN_SNA_COMPOSE_FILE:-$(dirname "$0")/../compose.yaml}"
compose_env_file="${OPEN_SNA_COMPOSE_ENV_FILE:-/opt/sna/.env}"
rollback_dir="${OPEN_SNA_ROLLBACK_DIR:-/opt/sna/rollback}"

[[ -r "$compose_file" ]] || { echo "missing compose file: $compose_file" >&2; exit 2; }
[[ -e "$compose_env_file" ]] || { echo "missing compose env file: $compose_env_file" >&2; exit 2; }
[[ "$(stat -c '%U' "$compose_env_file")" == "root" ]] || { echo "compose env file must be owned by root: $compose_env_file" >&2; exit 2; }
[[ "$(stat -c '%a' "$compose_env_file")" == "600" ]] || { echo "compose env file must have mode 0600: $compose_env_file" >&2; exit 2; }

export SNA_WEB_IMAGE_DIGEST="$previous_web_digest"
export SNA_WORKER_IMAGE_DIGEST="$previous_worker_digest"
export SNA_RELEASE_SHA="$previous_release_sha"

docker compose --env-file "$compose_env_file" -f "$compose_file" config >/dev/null

echo "Rolling back worker first, then web."
docker compose --env-file "$compose_env_file" -f "$compose_file" pull --no-parallel sna-r-worker
docker compose --env-file "$compose_env_file" -f "$compose_file" up -d --no-deps --force-recreate sna-r-worker

echo "Waiting for the worker container health status to become healthy."
worker_container_id="$(
  docker compose --env-file "$compose_env_file" -f "$compose_file" ps -q sna-r-worker
)"
if [ -z "$worker_container_id" ]; then
  echo "worker container was not created" >&2
  exit 1
fi

worker_health_deadline=$((SECONDS + 300))
worker_health_status=""
while :; do
  worker_health_status="$(docker inspect -f '{{.State.Health.Status}}' "$worker_container_id" 2>/dev/null || true)"
  if [ "$worker_health_status" = "healthy" ]; then
    break
  fi
  if [ "$worker_health_status" = "unhealthy" ]; then
    echo "worker rollback became unhealthy" >&2
    exit 1
  fi
  if [ "$SECONDS" -ge "$worker_health_deadline" ]; then
    echo "timed out waiting for worker rollback health" >&2
    exit 1
  fi
  sleep 5
done

docker compose --env-file "$compose_env_file" -f "$compose_file" exec -T sna-r-worker node -e "
fetch('http://127.0.0.1:3000/api/open-sna/analyze', {
  method: 'POST',
  headers: { Authorization: 'Bearer rollback-check' }
}).then((response) => {
  if (response.status !== 401) {
    throw new Error('expected worker to return 401 after rollback');
  }
}).catch((error) => {
  console.error(error.message);
  process.exit(1);
});
"

mkdir -p "$rollback_dir"
backup_file="$rollback_dir/$(basename "$compose_env_file").$(date +%Y%m%d%H%M%S).bak"
cp -p "$compose_env_file" "$backup_file"

tmp_env_file="$(mktemp "${rollback_dir}/.env.rollback.XXXXXX")"
trap 'rm -f "$tmp_env_file"' EXIT

awk -v web="$previous_web_digest" -v worker="$previous_worker_digest" -v sha="$previous_release_sha" '
  BEGIN {
    seen_web = 0;
    seen_worker = 0;
    seen_sha = 0;
  }
  /^SNA_WEB_IMAGE_DIGEST=/ {
    print "SNA_WEB_IMAGE_DIGEST=" web;
    seen_web = 1;
    next;
  }
  /^SNA_WORKER_IMAGE_DIGEST=/ {
    print "SNA_WORKER_IMAGE_DIGEST=" worker;
    seen_worker = 1;
    next;
  }
  /^SNA_RELEASE_SHA=/ {
    print "SNA_RELEASE_SHA=" sha;
    seen_sha = 1;
    next;
  }
  { print }
  END {
    if (!seen_web) print "SNA_WEB_IMAGE_DIGEST=" web;
    if (!seen_worker) print "SNA_WORKER_IMAGE_DIGEST=" worker;
    if (!seen_sha) print "SNA_RELEASE_SHA=" sha;
  }
' "$compose_env_file" > "$tmp_env_file"

chmod 600 "$tmp_env_file"
chown root:root "$tmp_env_file"
mv "$tmp_env_file" "$compose_env_file"
trap - EXIT

docker compose --env-file "$compose_env_file" -f "$compose_file" pull --no-parallel sna-web
docker compose --env-file "$compose_env_file" -f "$compose_file" up -d --no-deps --force-recreate sna-web

web_container_id="$(
  docker compose --env-file "$compose_env_file" -f "$compose_file" ps -q sna-web
)"
if [ -z "$web_container_id" ]; then
  echo "web container was not created" >&2
  exit 1
fi

web_health_deadline=$((SECONDS + 300))
web_health_status=""
while :; do
  web_health_status="$(docker inspect -f '{{.State.Health.Status}}' "$web_container_id" 2>/dev/null || true)"
  if [ "$web_health_status" = "healthy" ]; then
    break
  fi
  if [ "$web_health_status" = "unhealthy" ]; then
    echo "web rollback became unhealthy" >&2
    exit 1
  fi
  if [ "$SECONDS" -ge "$web_health_deadline" ]; then
    echo "timed out waiting for web rollback health" >&2
    exit 1
  fi
  sleep 5
done

echo "Rollback completed for release SHA: $previous_release_sha"
