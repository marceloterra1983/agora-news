# AGENTS.md — agora-news

PWA de notícias (TanStack Start/Nitro, ingestão, Better Auth, Supabase, Web Push).
Checkout canônico: `/home/marce/news`.

## Commands

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Smokes Playwright exigem `NEWS_SMOKE_URL` (CI usa `:3180`). Sem a variável, pulam.
Não apontar para `:3080` sem `NEWS_SMOKE_ALLOW_PROD=1`.

`npm run db:migrate` aplica só o schema Better Auth em `DATABASE_URL`.

## Boundaries

- **Always:** rodar `npm test` (e typecheck/lint se o diff tocar TS/JS) antes de declarar pronto. Depois do auto-land na `main`, publicar com `bash scripts/deploy-prod.sh` — não perguntar.
- **Ask first:** dependência nova, migration, secrets, mudança de `compose.yml`/Dockerfile.
- **Never:** commit/colar `.env` ou tokens; `push --force` em `main`; apagar teste que falhou; apontar smoke para prod sem allowlist.

## Honest tests

Não mockar auth, push ou ingestão só para ficar verde. Pacote novo: `npm ls <pkg>` no lockfile antes de importar.
