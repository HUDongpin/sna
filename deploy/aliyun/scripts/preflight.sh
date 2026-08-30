#!/usr/bin/env bash
set -euo pipefail

web_env_file="${OPEN_SNA_WEB_ENV_FILE:-/opt/sna/secrets/web.env}"
worker_env_file="${OPEN_SNA_WORKER_ENV_FILE:-/opt/sna/secrets/worker.env}"
compose_file="${OPEN_SNA_COMPOSE_FILE:-$(dirname "$0")/../compose.yaml}"
compose_env_file="${OPEN_SNA_COMPOSE_ENV_FILE:-/opt/sna/.env}"
web_digest="${SNA_WEB_IMAGE_DIGEST:-${OPEN_SNA_WEB_IMAGE_DIGEST:-}}"
worker_digest="${SNA_WORKER_IMAGE_DIGEST:-${OPEN_SNA_WORKER_IMAGE_DIGEST:-}}"

[[ ${#web_digest} -eq 64 && $web_digest =~ ^[0-9a-f]{64}$ ]] || {
  echo "web digest must be a 64-character lowercase hex value" >&2
  exit 2
}
[[ ${#worker_digest} -eq 64 && $worker_digest =~ ^[0-9a-f]{64}$ ]] || {
  echo "worker digest must be a 64-character lowercase hex value" >&2
  exit 2
}

check_secret_env_file() {
  local env_file="$1"
  local label="$2"
  local owner mode

  [[ -e "$env_file" ]] || { echo "missing $label env file: $env_file" >&2; exit 2; }
  [[ -r "$env_file" ]] || { echo "$label env file must be readable: $env_file" >&2; exit 2; }

  owner="$(stat -c '%U' "$env_file")"
  mode="$(stat -c '%a' "$env_file")"
  [[ "$owner" == "root" ]] || { echo "$label env file must be owned by root: $env_file" >&2; exit 2; }
  [[ "$mode" == "600" ]] || { echo "$label env file must have mode 0600: $env_file" >&2; exit 2; }
}

check_secret_env_file "$web_env_file" "web"
check_secret_env_file "$worker_env_file" "worker"

if [[ ! -e "$compose_env_file" ]]; then
  echo "missing compose env file: $compose_env_file" >&2
  exit 2
fi

echo "Preflight is read-only."
command -v docker >/dev/null
docker compose version >/dev/null
docker compose --env-file "$compose_env_file" -f "$compose_file" config >/dev/null

df -h / /opt /tmp || true
free -h || true

if command -v ss >/dev/null; then
  while read -r local_address _; do
    if [[ "$local_address" == *:3100 || "$local_address" == *:3101 ]]; then
      if [[ "$local_address" != 127.0.0.1:3100 && "$local_address" != 127.0.0.1:3101 ]]; then
        echo "port must bind on 127.0.0.1 only: $local_address" >&2
        exit 2
      fi
    fi
  done < <(ss -ltnH | awk '$4 ~ /:3100$/ || $4 ~ /:3101$/ {print $4, $1}')
fi
