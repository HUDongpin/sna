#!/usr/bin/env bash
set -euo pipefail

base_url="${1:-}"
worker_url="${2:-}"

if [ -z "$base_url" ] || [ -z "$worker_url" ]; then
  echo "usage: verify.sh https://www.sna.hk https://worker.sna.hk" >&2
  exit 2
fi

web_health="$(curl -fsS -D - "$base_url/api/health" -o /tmp/sna-web-health.json)"
worker_unauth="$(curl -fsS -D - -o /tmp/sna-worker-unauth.json -X POST "$worker_url/api/open-sna/analyze" || true)"
root_response="$(curl -fsS -D - -o /tmp/sna-root.html "$base_url/" || true)"

grep -qi 'cache-control: no-store' <<<"$web_health"
grep -q '"status":"ok"' /tmp/sna-web-health.json
grep -q '"rAnalysis":"configured"' /tmp/sna-web-health.json
grep -q '"deploymentRole":"aliyun-primary"' /tmp/sna-web-health.json
grep -q '"releaseSha":"' /tmp/sna-web-health.json
grep -q 'HTTP/.* 401' <<<"$worker_unauth"
grep -qi 'https://' <<<"$root_response"
grep -qi 'strict-transport-security\|location:' <<<"$root_response" || true
