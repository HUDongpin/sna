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

compose_file="${OPEN_SNA_COMPOSE_FILE:-$(dirname "$0")/../compose.yaml}"
compose_env_file="${OPEN_SNA_COMPOSE_ENV_FILE:-/opt/sna/.env}"
docker compose --env-file "$compose_env_file" -f "$compose_file" config >/dev/null

echo "Rolling back worker first, then web."
docker compose --env-file "$compose_env_file" -f "$compose_file" pull --no-parallel sna-r-worker
docker compose --env-file "$compose_env_file" -f "$compose_file" up -d --no-deps --force-recreate sna-r-worker
echo "Wait for a healthy 401 response from the worker before touching web."
docker compose --env-file "$compose_env_file" -f "$compose_file" exec -T sna-r-worker node -e "fetch('http://127.0.0.1:3000/api/open-sna/analyze',{method:'POST'}).then(r => { if (r.status !== 401) throw new Error('worker rollback unhealthy'); }).catch(err => { console.error(err.message); process.exit(1); })"

docker compose --env-file "$compose_env_file" -f "$compose_file" pull --no-parallel sna-web
docker compose --env-file "$compose_env_file" -f "$compose_file" up -d --no-deps --force-recreate sna-web

echo "Rollback completed for release SHA: $previous_release_sha"
echo "Worker digest: $previous_worker_digest"
echo "Web digest: $previous_web_digest"
