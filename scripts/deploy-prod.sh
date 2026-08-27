#!/usr/bin/env bash
# Publica a main atual em 127.0.0.1:3080. Sem migrate, sem rotacionar chave, sem imprimir .env.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

branch="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$branch" != "main" && "${NEWS_DEPLOY_ALLOW_BRANCH:-}" != "$branch" ]]; then
  echo "FAIL: deploy só na main (agora $branch)" >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" && "${NEWS_DEPLOY_ALLOW_DIRTY:-}" != "1" ]]; then
  echo "FAIL: working tree suja" >&2
  exit 1
fi

HEAD="$(git rev-parse --short HEAD)"
PREV="$(docker inspect news-news-1 --format '{{.Config.Image}}' 2>/dev/null || true)"
echo "deploy news-news:${HEAD} rollback=${PREV:-none}"

docker compose build news
docker image tag news-news:latest "news-news:${HEAD}"
NEWS_IMAGE_TAG="${HEAD}" docker compose up -d --no-build news

ok=0
for i in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24; do
  status="$(docker inspect news-news-1 --format '{{.Config.Image}} {{.State.Health.Status}}' 2>/dev/null || echo missing)"
  echo "health ${i} ${status}"
  if [[ "$status" == "news-news:${HEAD} healthy" ]]; then
    ok=1
    break
  fi
  if [[ "$status" == *unhealthy* ]]; then
    echo "FAIL: container unhealthy" >&2
    exit 1
  fi
  sleep 5
done
if [[ "$ok" != "1" ]]; then
  echo "FAIL: timeout esperando healthy" >&2
  exit 1
fi

live="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 http://127.0.0.1:3080/api/health/live)"
[[ "$live" == "200" ]] || { echo "FAIL: /api/health/live $live" >&2; exit 1; }
fontes="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 'http://127.0.0.1:3080/fontes?secao=ai')"
[[ "$fontes" == "200" ]] || { echo "FAIL: /fontes $fontes" >&2; exit 1; }
public="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 'https://news.automatizems.com/fontes?secao=ai')"
[[ "$public" == "200" ]] || { echo "FAIL: público $public" >&2; exit 1; }

echo "DEPLOY_OK news-news:${HEAD} rollback=${PREV:-none}"
