#!/usr/bin/env bash
set -euo pipefail

result_reported=0
tmp_dir=""

report_failure() {
  if [[ "$result_reported" -eq 0 ]]; then
    printf 'FAIL\n' >&2
  fi
}

cleanup_and_report() {
  local exit_status="$1"
  if [[ -n "$tmp_dir" && -d "$tmp_dir" ]]; then
    rm -rf -- "$tmp_dir" >/dev/null 2>&1 || true
  fi
  if [[ "$exit_status" -ne 0 ]]; then
    report_failure
  fi
}

trap 'cleanup_and_report "$?"' EXIT

fail() {
  result_reported=1
  printf 'FAIL\n' >&2
  exit 1
}

script_path="${BASH_SOURCE[0]}"
if [[ "$script_path" == */* ]]; then
  script_dir="${script_path%/*}"
else
  script_dir="."
fi
validator_script="$script_dir/deployment-validator.py"

command -v curl >/dev/null 2>&1 || fail
command -v python3 >/dev/null 2>&1 || fail
command -v mktemp >/dev/null 2>&1 || fail
command -v rm >/dev/null 2>&1 || fail
[[ -r "$validator_script" ]] || fail

origin_url="${1:-${SNA_ORIGIN_URL:-https://origin.sna.hk}}"
expected_release_sha="${SNA_RELEASE_SHA:-}"
release_sha_pattern='^[0-9a-f]{40}$'
[[ "$expected_release_sha" =~ $release_sha_pattern ]] || fail

if ! printf '%s' "$origin_url" |
  python3 "$validator_script" origin-url >/dev/null 2>&1; then
  fail
fi
origin_url="${origin_url%/}"

if [[ -n "${TMPDIR:-}" ]]; then
  [[ -d "$TMPDIR" && -w "$TMPDIR" ]] || fail
  tmp_dir="$(mktemp -d "${TMPDIR%/}/sna-origin-verify.XXXXXX" 2>/dev/null)" || fail
else
  tmp_dir="$(mktemp -d 2>/dev/null)" || fail
fi
health_headers="$tmp_dir/health.headers"
health_body="$tmp_dir/health.json"
health_status_file="$tmp_dir/health.status"
root_headers="$tmp_dir/root.headers"
root_status_file="$tmp_dir/root.status"
upload_headers="$tmp_dir/upload.headers"
upload_body="$tmp_dir/upload.json"
upload_metrics="$tmp_dir/upload.metrics"

curl_timeout_args=(
  --connect-timeout 2
  --max-time 5
)

if ! curl --silent "${curl_timeout_args[@]}" --dump-header "$health_headers" --output "$health_body" --write-out '%{http_code}' "$origin_url/api/health" >"$health_status_file" 2>/dev/null; then
  fail
fi
health_status="$(<"$health_status_file")"
[[ "$health_status" == "200" ]] || fail
python3 "$validator_script" health-json "$health_body" "$expected_release_sha" >/dev/null 2>&1 || fail
python3 "$validator_script" no-store-headers "$health_headers" >/dev/null 2>&1 || fail

if ! curl --silent "${curl_timeout_args[@]}" --dump-header "$root_headers" --output /dev/null --write-out '%{http_code}' "$origin_url/" >"$root_status_file" 2>/dev/null; then
  fail
fi
root_status="$(<"$root_status_file")"
[[ "$root_status" == "307" ]] || fail
python3 "$validator_script" root-headers "$root_headers" >/dev/null 2>&1 || fail

if ! curl --silent "${curl_timeout_args[@]}" --dump-header "$upload_headers" --output "$upload_body" --write-out '%{http_code}\n%{time_total}\n' --request POST "$origin_url/api/open-sna/analyze" >"$upload_metrics" 2>/dev/null; then
  fail
fi
python3 "$validator_script" upload-metrics "$upload_metrics" >/dev/null 2>&1 || fail
python3 "$validator_script" upload-json "$upload_body" >/dev/null 2>&1 || fail
python3 "$validator_script" no-store-headers "$upload_headers" >/dev/null 2>&1 || fail

result_reported=1
printf 'PASS\n'
