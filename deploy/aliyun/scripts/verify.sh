#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-${SNA_BASE_URL:-}}"
apex_url="${2:-${SNA_APEX_URL:-https://sna.hk}}"
worker_url="${3:-${SNA_WORKER_URL:-}}"

if [ -z "$base_url" ] || [ -z "$worker_url" ]; then
  echo "usage: verify.sh https://www.sna.hk https://sna.hk https://worker.sna.hk" >&2
  exit 2
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

web_health_headers="$tmp_dir/web-health.headers"
web_health_body="$tmp_dir/web-health.json"
worker_headers="$tmp_dir/worker.headers"
worker_body="$tmp_dir/worker.json"
apex_headers="$tmp_dir/apex.headers"
root_headers="$tmp_dir/root.headers"
root_body="$tmp_dir/root.html"

curl -fsS -D "$web_health_headers" "$base_url/api/health" -o "$web_health_body"
worker_status="$(
  curl -sS -o "$worker_body" -D "$worker_headers" -w '%{http_code}' \
    -X POST "$worker_url/api/open-sna/analyze" \
    || { echo "worker request failed" >&2; exit 1; }
)"
curl -sS -D "$apex_headers" -o /dev/null -I "$apex_url/"
curl -fsS -D "$root_headers" "$base_url/" -o "$root_body"

grep -qi 'cache-control: no-store' "$web_health_headers"
grep -q '"status":"ok"' "$web_health_body"
grep -q '"rAnalysis":"configured"' "$web_health_body"
grep -q '"deploymentRole":"aliyun-primary"' "$web_health_body"
grep -q '"releaseSha":"' "$web_health_body"
test "$worker_status" = "401"
grep -q 'WORKER_UNAUTHORIZED' "$worker_body"
grep -q '^HTTP/.* 301 ' "$apex_headers"
grep -qi '^location: https://www\.sna\.hk/' "$apex_headers"
grep -qi '^location:' "$root_headers" && {
  echo "www root must not redirect" >&2
  exit 1
}
grep -qi 'strict-transport-security' "$root_headers" || true
