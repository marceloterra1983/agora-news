#!/bin/sh
set -eu
cd /workspace
PATH="/workspace/.local/bin:$PATH"
export PATH

mkdir -p /tmp/redis-data
if ! redis-cli -h 127.0.0.1 -p 6379 ping >/dev/null 2>&1; then
  redis-server \
    --port 6379 \
    --bind 127.0.0.1 \
    --daemonize yes \
    --dir /tmp/redis-data \
    --save "" \
    --appendonly no \
    --logfile /tmp/redis-server.log
fi

if ! curl -sf -o /dev/null --max-time 1 http://127.0.0.1:6380/ping; then
  node /workspace/scripts/redis-rest.mjs >>/tmp/redis-rest.log 2>&1 &
  sleep 0.2
fi

if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi
npm run dev >>/tmp/app-startup.log 2>&1 &
