# Baseline pré-cutover — 2026-08-16T12:08Z

Host: este computador. App: PM2 `news` online, script `npx vite dev --host 0.0.0.0 --port 3080`, cwd `/home/marce/news`, 12 restarts, pid escuta `0.0.0.0:3080`.

Nginx: `/etc/nginx/sites-enabled/news.automatizems.com` → `proxy_pass http://127.0.0.1:3080` (não alterar).

Cron: `*/15 * * * * /home/marce/news/scripts/ingest-cron.sh`.

`.env` no repo: existe, 77 bytes, **não lido/copiado**; chaves presentes: `CRON_SECRET` apenas.

## Snapshot HTTP (sem inventar)

| URL | Status | Notas |
|---|---|---|
| `https://news.automatizems.com/` | **307** | `Location: /?secao=ai` |
| `https://news.automatizems.com/?secao=ai` | **200** | HTML ~99 KB |
| `https://news.automatizems.com/fontes?secao=ai` | **200** | HTML ~184 KB; ≥60 handles (`@AnthropicAI`, `@GoogleDeepMind`, …) |
| `https://news.automatizems.com/api/health` | **200** | `ok:true stale:false` Supabase posts |
| `http://127.0.0.1:3080/` | **307** | mesmo redirect |
| `http://127.0.0.1:3080/fontes?secao=ai` | **200** | |
| `http://127.0.0.1:3080/api/health` | **200** | |

Critic cego: se o vivo piorar vs esta tabela (5xx, Fontes sem perfis, health sem `postsOk`), rollback.
