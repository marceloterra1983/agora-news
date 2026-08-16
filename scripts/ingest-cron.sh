#!/usr/bin/env bash
# Local PM2 ingest. Requires CRON_SECRET in the environment or repo .env.
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
exec curl -fsS -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Accept: application/json" \
  "http://127.0.0.1:3080/api/ingest"
