#!/usr/bin/env bash
set -euo pipefail

web_env_file="${OPEN_SNA_WEB_ENV_FILE:-/opt/sna/secrets/web.env}"
worker_env_file="${OPEN_SNA_WORKER_ENV_FILE:-/opt/sna/secrets/worker.env}"
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

[[ -r "$web_env_file" ]] || { echo "missing web env file: $web_env_file" >&2; exit 2; }
[[ -r "$worker_env_file" ]] || { echo "missing worker env file: $worker_env_file" >&2; exit 2; }

echo "Preflight is read-only."
command -v docker >/dev/null
docker compose version >/dev/null

if [ -e /opt/sna/secrets/web.env ]; then
  stat -c '%U %a %n' /opt/sna/secrets/web.env
fi
if [ -e /opt/sna/secrets/worker.env ]; then
  stat -c '%U %a %n' /opt/sna/secrets/worker.env
fi

df -h / /opt /tmp || true
free -h || true
ss -ltnp | awk '$4 ~ /:3100$/ || $4 ~ /:3101$/'
docker ps --format '{{.Names}} {{.Image}} {{.Status}}'
docker compose -f "$(dirname "$0")/../compose.yaml" config >/dev/null
