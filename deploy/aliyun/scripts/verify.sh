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

fetch_or_fail() {
  local label="$1"
  shift
  if ! "$@"; then
    echo "$label request failed" >&2
    exit 1
  fi
}

fetch_or_fail "web health" curl -fsS -D "$web_health_headers" "$base_url/api/health" -o "$web_health_body"

if ! curl -sS -D "$worker_headers" -o "$worker_body" -w '%{http_code}' \
  -X POST "$worker_url/api/open-sna/analyze" > "$tmp_dir/worker.status"; then
  echo "worker network request failed" >&2
  exit 1
fi
worker_status="$(cat "$tmp_dir/worker.status")"

if ! curl -sS -D "$apex_headers" -o /dev/null -w '%{http_code}' -I "$apex_url/" > "$tmp_dir/apex.status"; then
  echo "apex network request failed" >&2
  exit 1
fi
apex_status="$(cat "$tmp_dir/apex.status")"

if ! curl -sS -D "$root_headers" -w '%{http_code}' "$base_url/" -o "$root_body" > "$tmp_dir/root.status"; then
  echo "www root network request failed" >&2
  exit 1
fi
root_status="$(cat "$tmp_dir/root.status")"

grep -qi 'cache-control: no-store' "$web_health_headers"
grep -q '"status":"ok"' "$web_health_body"
grep -q '"rAnalysis":"configured"' "$web_health_body"
grep -q '"deploymentRole":"aliyun-primary"' "$web_health_body"
grep -q '"releaseSha":"' "$web_health_body"

if [[ "$worker_status" != "401" ]]; then
  echo "worker status error: expected 401, got $worker_status" >&2
  exit 1
fi
grep -q 'WORKER_UNAUTHORIZED' "$worker_body"

if [[ ! "$apex_status" =~ ^(301|308)$ ]]; then
  echo "apex status error: expected 301 or 308, got $apex_status" >&2
  exit 1
fi
grep -Eiq '^location: https://www\.sna\.hk(/|/.*)$' "$apex_headers"

if [[ ! "$root_status" =~ ^(200|301|308)$ ]]; then
  echo "www root status error: expected 200, 301, or 308; got $root_status" >&2
  exit 1
fi
if [[ "$root_status" = "200" ]]; then
  grep -Eiq '<!doctype html|<html' "$root_body"
else
  if ! grep -Eqi '^location: (/?en/?|https://www\.sna\.hk/en/?)(\?.*)?$' "$root_headers"; then
    echo "www root redirect must stay on /en when it redirects" >&2
    exit 1
  fi
fi
grep -Eqi '^strict-transport-security:' "$root_headers"
