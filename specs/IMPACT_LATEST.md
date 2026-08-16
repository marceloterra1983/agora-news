## Target
Runtime de produção do Agora News: processo que escuta **3080** atrás do nginx `news.automatizems.com`. Hoje: PM2 `news` = `npx vite dev --host 0.0.0.0 --port 3080` em `/home/marce/news`. Destino: Docker Compose serviço `news` (Nitro `node-server`) no mesmo bind.

## Dependents (6)
- `/etc/nginx/sites-enabled/news.automatizems.com`: `proxy_pass http://127.0.0.1:3080` (Host forçado `127.0.0.1:3080`)
- Cloudflare → origem HTTPS do host → nginx :80
- crontab `*/15` → `scripts/ingest-cron.sh` → `POST http://127.0.0.1:3080/api/ingest` + Bearer `CRON_SECRET`
- PM2 processo `news` (cwd `/home/marce/news`)
- Clientes públicos: `/` (307→`/?secao=ai`), `/fontes?secao=ai`, `/api/health`
- `scripts/ingest-cron.sh` e testes `scripts/fontes-last-post.test.mjs` (contrato 3080 + Bearer)

## Affected Stories
- e03s01: contrato Docker (Dockerfile/compose/start/testes)
- e03s02: cutover PM2 → compose + rollback
- e01 (harden): ingest Bearer + CRON_SECRET deve continuar igual
- e02: sem impacto de código de domínio

## Test Coverage
- `scripts/harden-contract.test.mjs`: ingest/health/gitignore — não cobre Docker
- `scripts/fontes-last-post.test.mjs`: cron aponta 3080
- Gap: nenhum teste de Dockerfile/compose/porta/segredo até e03s01
- Gap: smoke vivo não está na suite (barra do gauntlet = curl no host)

## Risk: High
Troca o processo que segura o site público; bind 3080 é exclusão mútua com PM2; health `/api/health` pode 503 se o feed ficar stale (não usar 200-only como healthcheck do Compose).

## Recommended action
Proceed. Contrato TDD primeiro. Imagem validada em porta temporária **3081** antes de soltar 3080. Cutover atômico. Rollback: `docker compose down && pm2 start news`.
