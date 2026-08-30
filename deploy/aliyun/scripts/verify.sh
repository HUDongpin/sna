#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-${SNA_BASE_URL:-}}"
worker_url="${2:-${SNA_WORKER_URL:-}}"

if [ -z "$base_url" ] || [ -z "$worker_url" ]; then
  echo "usage: verify.sh https://www.sna.hk https://worker.sna.hk" >&2
  exit 2
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

web_health_headers="$tmp_dir/web-health.headers"
web_health_body="$tmp_dir/web-health.json"
worker_headers="$tmp_dir/worker.headers"
worker_body="$tmp_dir/worker.json"
root_headers="$tmp_dir/root.headers"
root_body="$tmp_dir/root.html"

curl -fsS -D "$web_health_headers" "$base_url/api/health" -o "$web_health_body"
curl -sS -D "$worker_headers" -o "$worker_body" -X POST "$worker_url/api/open-sna/analyze" || true
curl -sS -D "$root_headers" "$base_url/" -o "$root_body" || true

grep -qi 'cache-control: no-store' "$web_health_headers"
grep -q '"status":"ok"' "$web_health_body"
grep -q '"rAnalysis":"configured"' "$web_health_body"
grep -q '"deploymentRole":"aliyun-primary"' "$web_health_body"
grep -q '"releaseSha":"' "$web_health_body"
grep -q ' 401 ' "$worker_headers"
grep -qi '^location: https://' "$root_headers"
grep -qi 'strict-transport-security' "$root_headers" || true
