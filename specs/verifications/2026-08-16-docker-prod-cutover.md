# Cutover — 2026-08-16T12:21Z

Processo na 3080: container `news-news-1` (Compose `news`), **healthy**, bind `127.0.0.1:3080`.
PM2 `news`: **stopped** (dump salvo). Nginx inalterado.

## Smoke vs baseline

| URL | Antes | Depois |
|---|---|---|
| `https://news.automatizems.com/` | 307 → `/?secao=ai` | 307; follow **200** |
| `https://news.automatizems.com/fontes?secao=ai` | 200 ~184 KB, ≥60 handles | **200** 186777 B, 63 handles (`AnthropicAI`, `GoogleDeepMind`, `MistralAI`) |
| `https://news.automatizems.com/api/health` | 200 `ok:true` | **200** `ok:true stale:false postsOk:true` |
| `http://127.0.0.1:3080/` | 307 | **307** |
| `http://127.0.0.1:3080/fontes?secao=ai` | 200 | **200** |
| `http://127.0.0.1:3080/api/health` | 200 | **200** |
| `POST /api/ingest` sem Bearer | — | **401** |

Suite: `npm test && npm run typecheck` — 100 pass.

## Rollback

```bash
cd /home/marce/news && docker compose down && pm2 start news
```

## Restart

`docker compose up -d` relê o `.env` do host (hoje só `CRON_SECRET`).
