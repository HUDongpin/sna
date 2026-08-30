#!/usr/bin/env bash
set -euo pipefail

origin_url="${1:-${SNA_ORIGIN_URL:-https://origin.sna.hk}}"
apex_url="${2:-${SNA_APEX_URL:-https://sna.hk}}"
worker_url="${3:-${SNA_WORKER_URL:-}}"

if [ -z "$worker_url" ]; then
  echo "usage: verify.sh [https://origin.sna.hk] [https://sna.hk] https://worker.sna.hk" >&2
  exit 2
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

web_health_headers="$tmp_dir/web-health.headers"
web_health_body="$tmp_dir/web-health.json"
origin_headers="$tmp_dir/origin.headers"
origin_body="$tmp_dir/origin.html"
worker_headers="$tmp_dir/worker.headers"
worker_body="$tmp_dir/worker.json"
worker_root_headers="$tmp_dir/worker-root.headers"
worker_root_body="$tmp_dir/worker-root.html"
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

check_header() {
  local label="$1"
  local headers_file="$2"
  local pattern="$3"
  if ! grep -Eqi "$pattern" "$headers_file"; then
    echo "$label header check failed" >&2
    exit 1
  fi
}

fetch_or_fail "web health" curl -fsS -D "$web_health_headers" "$origin_url/api/health" -o "$web_health_body"

if ! curl -fsS -D "$origin_headers" "$origin_url/" -o "$origin_body"; then
  echo "origin request failed" >&2
  exit 1
fi

if ! curl -sS -D "$worker_headers" -o "$worker_body" -w '%{http_code}' \
  -X POST "$worker_url/api/open-sna/analyze" > "$tmp_dir/worker.status"; then
  echo "worker network request failed" >&2
  exit 1
fi
worker_status="$(cat "$tmp_dir/worker.status")"

if ! curl -sS -D "$worker_root_headers" -o "$worker_root_body" -w '%{http_code}' \
  "$worker_url/" > "$tmp_dir/worker-root.status"; then
  echo "worker root network request failed" >&2
  exit 1
fi
worker_root_status="$(cat "$tmp_dir/worker-root.status")"

if ! curl -sS -D "$apex_headers" -o /dev/null -w '%{http_code}' -I "$apex_url/" > "$tmp_dir/apex.status"; then
  echo "apex network request failed" >&2
  exit 1
fi
apex_status="$(cat "$tmp_dir/apex.status")"

if ! curl -sS -D "$root_headers" -w '%{http_code}' "$origin_url/" -o "$root_body" > "$tmp_dir/root.status"; then
  echo "www root network request failed" >&2
  exit 1
fi
root_status="$(cat "$tmp_dir/root.status")"

grep -qi 'cache-control: no-store' "$web_health_headers"
grep -q '"status":"ok"' "$web_health_body"
grep -q '"rAnalysis":"configured"' "$web_health_body"
grep -q '"deploymentRole":"aliyun-primary"' "$web_health_body"
grep -q '"releaseSha":"' "$web_health_body"
check_header "origin" "$origin_headers" '^x-robots-tag:\s*noindex,nofollow\s*$'

if [[ "$worker_status" != "401" ]]; then
  echo "worker status error: expected 401, got $worker_status" >&2
  exit 1
fi
grep -q 'WORKER_UNAUTHORIZED' "$worker_body"

if [[ "$worker_root_status" != "404" ]]; then
  echo "worker root status error: expected 404, got $worker_root_status" >&2
  exit 1
fi

if [[ ! "$apex_status" =~ ^(301|308)$ ]]; then
  echo "apex status error: expected 301 or 308, got $apex_status" >&2
  exit 1
fi
grep -Eiq '^location: https://www\.sna\.hk(/|/.*)$' "$apex_headers"

if [[ "$root_status" != "307" ]]; then
  echo "www root status error: expected 307, got $root_status" >&2
  exit 1
fi
if ! grep -Eqi '^location: (/?en/?|https://www\.sna\.hk/en/?)(\?.*)?$' "$root_headers"; then
  echo "www root redirect must point to /en" >&2
  exit 1
fi
grep -Eqi '^strict-transport-security:' "$root_headers"
