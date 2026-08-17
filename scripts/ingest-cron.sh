#!/usr/bin/env bash
# Host cron for the loopback Docker/Nitro service. Requires CRON_SECRET.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi
if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "missing CRON_SECRET" >&2
  exit 1
fi
exec curl -fsS \
  --connect-timeout 5 \
  --max-time 600 \
  --retry 2 \
  --retry-delay 2 \
  --retry-connrefused \
  -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Accept: application/json" \
  "http://127.0.0.1:3080/api/ingest"
