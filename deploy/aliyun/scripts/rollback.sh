#!/usr/bin/env bash
set -euo pipefail

if [ "${CONFIRM_ROLLBACK:-}" != "YES" ]; then
  echo "Set CONFIRM_ROLLBACK=YES to proceed." >&2
  exit 2
fi

previous_digest="${1:-}"
if [ -z "$previous_digest" ]; then
  echo "A previous digest is required." >&2
  exit 2
fi

echo "Verify old worker before switching web to previous digest: $previous_digest"
echo "Then update sna-web after the worker has passed verification."
echo "No reset, no delete, no destructive host changes."
