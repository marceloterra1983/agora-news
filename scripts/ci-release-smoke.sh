#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

FIXTURE_URL="http://127.0.0.1:3901"
NITRO_URL="http://127.0.0.1:3180"
DOCKER_URL="http://127.0.0.1:3181"
IMAGE_TAG="agora-news:ci"
CONTAINER_NAME="agora-news-ci-smoke-${GITHUB_RUN_ID:-$$}"
LOG_ROOT="${RUNNER_TEMP:-/tmp}"
FIXTURE_LOG="$LOG_ROOT/agora-supabase-fixture-$$.log"
NITRO_LOG="$LOG_ROOT/agora-nitro-smoke-$$.log"
fixture_pid=""
nitro_pid=""
container_id=""

stop_child() {
  local pid="$1"
  if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    wait "$pid" 2>/dev/null || true
  fi
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if [[ "$status" -ne 0 ]]; then
    [[ -f "$FIXTURE_LOG" ]] && tail -n 100 "$FIXTURE_LOG" >&2
    [[ -f "$NITRO_LOG" ]] && tail -n 200 "$NITRO_LOG" >&2
    if [[ "$container_id" =~ ^[a-f0-9]{12,64}$ ]]; then
      docker logs "$container_id" >&2 2>/dev/null || true
    fi
  fi
  if [[ "$container_id" =~ ^[a-f0-9]{12,64}$ ]]; then
    docker stop --time 5 "$container_id" >/dev/null 2>&1 || true
    docker rm "$container_id" >/dev/null 2>&1 || true
  fi
  stop_child "$nitro_pid"
  stop_child "$fixture_pid"
  exit "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

http_200() {
  local url="$1"
  node -e 'fetch(process.argv[1], {signal: AbortSignal.timeout(1000)}).then(r => process.exit(r.status === 200 ? 0 : 1)).catch(() => process.exit(1))' "$url"
}

assert_port_free() {
  node -e '
    const { createServer } = require("node:net");
    const server = createServer();
    server.once("error", () => process.exit(1));
    server.listen(Number(process.argv[1]), "127.0.0.1", () => server.close());
  ' "$1"
}

wait_for_process_200() {
  local url="$1"
  local pid="$2"
  for _ in $(seq 1 60); do
    kill -0 "$pid" 2>/dev/null || return 1
    if http_200 "$url"; then
      kill -0 "$pid" 2>/dev/null
      return 0
    fi
    sleep 1
  done
  return 1
}

wait_for_container_200() {
  local url="$1"
  local id="$2"
  for _ in $(seq 1 60); do
    [[ "$(docker inspect --format '{{.State.Running}}' "$id" 2>/dev/null)" == "true" ]] || return 1
    if http_200 "$url"; then
      [[ "$(docker inspect --format '{{.State.Running}}' "$id" 2>/dev/null)" == "true" ]]
      return
    fi
    sleep 1
  done
  return 1
}

assert_empty_health() {
  node -e '
    const response = await fetch(`${process.argv[1]}/api/health`, { signal: AbortSignal.timeout(3000) });
    const body = await response.json();
    const states = Object.values(body.sections || {}).map(section => section.state);
    if (response.status !== 503 || body.ok !== false || states.length !== 3 || states.some(state => state !== "empty")) process.exit(1);
  ' "$1"
}

runtime_env=(
  AGORA_RUNTIME_MODE=production
  DATABASE_URL=postgres://ci:ci@127.0.0.1:9/ci
  BETTER_AUTH_SECRET=ci-better-auth-secret-longer-than-thirty-two-characters
  AUTH_ALLOWED_EMAIL=owner@example.com
  AUTH_BOOTSTRAP_SIGNUP=false
  SUPABASE_URL="$FIXTURE_URL"
  SUPABASE_SECRET_KEY=sb_secret_ci_only
  SUPABASE_PUBLISHABLE_KEY=sb_publishable_ci_only
  VAPID_PUBLIC_KEY=ci-vapid-public
  VAPID_PRIVATE_KEY=ci-vapid-private
  CRON_SECRET=ci-cron-secret
  VITE_AUTH_ENABLED=true
)

assert_port_free 3901
node scripts/supabase-smoke-fixture.mjs >"$FIXTURE_LOG" 2>&1 &
fixture_pid=$!
wait_for_process_200 "$FIXTURE_URL/health" "$fixture_pid"

test -f .output/server/index.mjs
assert_port_free 3180
env "${runtime_env[@]}" \
  BETTER_AUTH_URL="$NITRO_URL" \
  PORT=3180 NITRO_PORT=3180 NITRO_HOST=127.0.0.1 \
  node .output/server/index.mjs >"$NITRO_LOG" 2>&1 &
nitro_pid=$!
wait_for_process_200 "$NITRO_URL/api/health/live" "$nitro_pid"
assert_empty_health "$NITRO_URL"
CI_ARTIFACT_GATES=1 CI_REQUIRED_SMOKES=1 NEWS_SMOKE_URL="$NITRO_URL" npm test
stop_child "$nitro_pid"
nitro_pid=""

docker build -t "$IMAGE_TAG" .
assert_port_free 3181
container_id="$(docker run -d \
  --name "$CONTAINER_NAME" \
  --network host \
  -e AGORA_RUNTIME_MODE=production \
  -e DATABASE_URL=postgres://ci:ci@127.0.0.1:9/ci \
  -e BETTER_AUTH_URL="$DOCKER_URL" \
  -e BETTER_AUTH_SECRET=ci-better-auth-secret-longer-than-thirty-two-characters \
  -e AUTH_ALLOWED_EMAIL=owner@example.com \
  -e AUTH_BOOTSTRAP_SIGNUP=false \
  -e SUPABASE_URL="$FIXTURE_URL" \
  -e SUPABASE_SECRET_KEY=sb_secret_ci_only \
  -e SUPABASE_PUBLISHABLE_KEY=sb_publishable_ci_only \
  -e VAPID_PUBLIC_KEY=ci-vapid-public \
  -e VAPID_PRIVATE_KEY=ci-vapid-private \
  -e CRON_SECRET=ci-cron-secret \
  -e VITE_AUTH_ENABLED=true \
  -e PORT=3181 -e NITRO_PORT=3181 -e NITRO_HOST=127.0.0.1 \
  "$IMAGE_TAG")"
[[ "$container_id" =~ ^[a-f0-9]{12,64}$ ]]
wait_for_container_200 "$DOCKER_URL/api/health/live" "$container_id"
assert_empty_health "$DOCKER_URL"
CI_REQUIRED_SMOKES=1 NEWS_SMOKE_URL="$DOCKER_URL" node --experimental-strip-types --test \
  scripts/fontes-smoke.test.mjs scripts/mobile-ssr-viewport.test.mjs
