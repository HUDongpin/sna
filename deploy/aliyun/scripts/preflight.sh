#!/usr/bin/env bash
set -euo pipefail

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
