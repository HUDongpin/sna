#!/usr/bin/env bash
set -euo pipefail

if [ "${CONFIRM_ROLLBACK:-}" != "YES" ]; then
  echo "Set CONFIRM_ROLLBACK=YES to proceed." >&2
  exit 2
fi

previous_web_digest="${1:-}"
previous_worker_digest="${2:-}"
previous_release_sha="${3:-}"

re_hex='^[0-9a-f]{64}$'
re_sha='^[0-9a-f]{40}$'

[[ $previous_web_digest =~ $re_hex ]] || { echo "previous web digest must be a 64-character lowercase hex value" >&2; exit 2; }
[[ $previous_worker_digest =~ $re_hex ]] || { echo "previous worker digest must be a 64-character lowercase hex value" >&2; exit 2; }
[[ $previous_release_sha =~ $re_sha ]] || { echo "previous release SHA must be a 40-character lowercase hex value" >&2; exit 2; }

echo "Pull previous worker image and update worker first: $previous_worker_digest"
echo "Verify old worker before switching web."
echo "Then pull previous web image and update web: $previous_web_digest"
echo "Release SHA: $previous_release_sha"
echo "Avoid reset, delete, or destructive host changes."
