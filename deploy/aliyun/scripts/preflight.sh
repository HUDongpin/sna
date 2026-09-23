#!/usr/bin/env bash
set -euo pipefail

result_reported=0

report_failure() {
  if [[ "$result_reported" -eq 0 ]]; then
    printf 'FAIL\n' >&2
  fi
}

trap 'if [[ $? -ne 0 ]]; then report_failure; fi' EXIT

fail() {
  result_reported=1
  printf 'FAIL\n' >&2
  exit 2
}

script_path="${BASH_SOURCE[0]}"
if [[ "$script_path" == */* ]]; then
  script_dir="${script_path%/*}"
else
  script_dir="."
fi
validator_script="$script_dir/deployment-validator.py"

web_env_file="${OPEN_SNA_WEB_ENV_FILE:-/opt/sna/secrets/web.env}"
worker_env_file="${OPEN_SNA_WORKER_ENV_FILE:-/opt/sna/secrets/worker.env}"
compose_file="${OPEN_SNA_COMPOSE_FILE:-$script_dir/../compose.yaml}"
compose_env_file="${OPEN_SNA_COMPOSE_ENV_FILE:-/opt/sna/.env}"

command -v stat >/dev/null 2>&1 || fail
command -v awk >/dev/null 2>&1 || fail
command -v python3 >/dev/null 2>&1 || fail
command -v docker >/dev/null 2>&1 || fail
[[ -r "$validator_script" ]] || fail

check_secret_env_file() {
  local env_file="$1"
  local owner mode

  [[ -e "$env_file" && -r "$env_file" ]] || fail

  owner="$(stat -c '%U' "$env_file" 2>/dev/null)" || fail
  mode="$(stat -c '%a' "$env_file" 2>/dev/null)" || fail
  [[ "$owner" == "root" && "$mode" == "600" ]] || fail
}

env_assignment_count() {
  local key="$1"
  local env_file="$2"
  awk -v key="$key" '
    /^[[:space:]]*#/ { next }
    {
      line = $0
      sub(/^[[:space:]]*/, "", line)
      if (index(line, key "=") == 1) count += 1
    }
    END { print count + 0 }
  ' "$env_file"
}

env_assignment_value() {
  local key="$1"
  local env_file="$2"
  awk -v key="$key" '
    /^[[:space:]]*#/ { next }
    {
      line = $0
      sub(/^[[:space:]]*/, "", line)
      if (index(line, key "=") == 1) {
        sub(/\r$/, "", line)
        print substr(line, length(key) + 2)
        exit
      }
    }
  ' "$env_file"
}

validate_matching_web_worker_tokens() {
  local web_url_count="$1"
  local web_token_count="$2"
  local worker_token_count="$3"
  local web_url

  [[ "$web_url_count" -eq 1 && "$web_token_count" -eq 1 && "$worker_token_count" -eq 1 ]] || fail
  web_url="$(env_assignment_value OPEN_SNA_R_API_URL "$web_env_file")"

  if ! printf '%s' "$web_url" |
    python3 "$validator_script" worker-url >/dev/null 2>&1; then
    fail
  fi
}

check_secret_env_file "$web_env_file"
check_secret_env_file "$worker_env_file"
python3 "$validator_script" token-files "$web_env_file" "$worker_env_file" >/dev/null 2>&1 || fail

[[ -e "$compose_env_file" && -r "$compose_env_file" ]] || fail
compose_env_owner="$(stat -c '%U' "$compose_env_file" 2>/dev/null)" || fail
compose_env_mode="$(stat -c '%a' "$compose_env_file" 2>/dev/null)" || fail
[[ "$compose_env_owner" == "root" && "$compose_env_mode" == "600" ]] || fail

read_compose_value() {
  local key="$1"
  awk -F= -v key="$key" '$1 == key { sub(/^[^=]*=/, ""); print; exit }' "$compose_env_file"
}

web_digest="${SNA_WEB_IMAGE_DIGEST:-${OPEN_SNA_WEB_IMAGE_DIGEST:-$(read_compose_value SNA_WEB_IMAGE_DIGEST)}}"
worker_digest="${SNA_WORKER_IMAGE_DIGEST:-${OPEN_SNA_WORKER_IMAGE_DIGEST:-$(read_compose_value SNA_WORKER_IMAGE_DIGEST)}}"

[[ ${#web_digest} -eq 64 && $web_digest =~ ^[0-9a-f]{64}$ ]] || fail
[[ ${#worker_digest} -eq 64 && $worker_digest =~ ^[0-9a-f]{64}$ ]] || fail

r_disabled_count="$(env_assignment_count OPEN_SNA_R_DISABLED "$web_env_file")"
web_url_count="$(env_assignment_count OPEN_SNA_R_API_URL "$web_env_file")"
web_token_count="$(env_assignment_count OPEN_SNA_R_API_TOKEN "$web_env_file")"
worker_token_count="$(env_assignment_count OPEN_SNA_R_WORKER_TOKEN "$worker_env_file")"

[[ "$r_disabled_count" -eq 1 ]] || fail
r_disabled="$(env_assignment_value OPEN_SNA_R_DISABLED "$web_env_file")"
[[ "$r_disabled" == "0" || "$r_disabled" == "1" ]] || fail

[[ "$worker_token_count" -eq 1 ]] || fail

if [[ "$r_disabled" == "1" ]]; then
  [[ "$web_url_count" -eq 0 && "$web_token_count" -eq 0 ]] || fail
else
  validate_matching_web_worker_tokens "$web_url_count" "$web_token_count" "$worker_token_count"
fi

# Read-only validation: expanded compose output is never retained.
docker compose version >/dev/null 2>&1 || fail
docker compose --env-file "$compose_env_file" -f "$compose_file" config >/dev/null 2>&1 || fail

if command -v ss >/dev/null; then
  socket_output="$(ss -ltnH 2>/dev/null)" || fail
  while read -r local_address _; do
    if [[ "$local_address" == *:3100 || "$local_address" == *:3101 ]]; then
      if [[ "$local_address" != 127.0.0.1:3100 && "$local_address" != 127.0.0.1:3101 ]]; then
        # FAIL: a container port must bind on 127.0.0.1 only.
        fail
      fi
    fi
  done < <(printf '%s\n' "$socket_output" | awk '$4 ~ /:3100$/ || $4 ~ /:3101$/ {print $4, $1}')
fi

result_reported=1
printf 'PASS\n'
