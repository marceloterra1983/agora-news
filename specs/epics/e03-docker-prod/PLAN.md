# e03 Docker prod — plano executável

> writing-plans + plan-work. Cada passo tem `verify:`. TDD nos contratos. Cutover só após land.

**Goal:** o mesmo `news.automatizems.com` atrás do nginx, servido por Compose/Nitro na 3080, sem `vite dev`.

**Architecture:** Cloudflare → nginx host → `127.0.0.1:3080` → container `news` (`node .output/server/index.mjs`, `NITRO_PORT=3080`). `.env` montado, não bakeado.

**Tech:** Docker Compose, Node 22, TanStack Start + Nitro `node-server`. Sem pacote npm novo. `[OK]` imagens oficiais.

## Global constraints

- Porta 3080 só. Nunca 8080.
- Não overwrite `.env`. Não commitar secret.
- PM2 e container nunca juntos na 3080.
- Rollback: `docker compose down && pm2 start news`
- Auto-land: `feat/docker-prod-news` → PR → job `check` verde → merge --merge.

## Como o process start realmente sobe (não inventado)

1. `vite.config.ts` no `build` liga `nitro({ preset: "node-server" })`.
2. TanStack hosting: `"start": "node .output/server/index.mjs"`.
3. Nitro node-server: `NITRO_PORT`, `NITRO_HOST` (docs nitro.build/deploy/runtimes/node). Também setar `PORT=3080`.
4. `npm run build` no host = `vite build && db:migrate`. Na **imagem** rodar só `npx vite build` (migrate sem `DATABASE_URL` só loga skip; não precisa no build).
5. `startup.sh` / `npm run dev` / porta 8080 = preview Grok — **fora** do container.

## Story e03s01 — contrato

1. Kickoff branch `feat/docker-prod-news` em main limpa → verify: `git branch --show-current | grep -x feat/docker-prod-news`
2. Escrever `scripts/docker-prod.test.mjs` (RED) → verify: `node --experimental-strip-types --test scripts/docker-prod.test.mjs` falha por arquivo ausente
3. Implementar Dockerfile + compose + dockerignore + `start` → verify: mesmo teste exit 0
4. Gates → verify: `npm test && npm run typecheck`
5. Commit (sem `.env`) + push + `gh pr create` → verify: `gh pr view --json url -q .url`
6. Esperar job `check` → verify: `gh pr checks --watch`
7. `gh pr merge --merge --delete-branch` + main limpa → verify: `git checkout main && git pull --ff-only && git status --porcelain | grep -v '^?? specs/' || true`

## Story e03s02 — cutover

1. `docker compose build` → verify: exit 0
2. Preflight 3081 (override ports) → verify: Fontes 200 em 3081; derrubar o override
3. `pm2 stop news` → verify: `ss -ltn | grep -q ':3080' && exit 1 || exit 0` (3080 livre)
4. `docker compose up -d` → verify: `docker compose ps` healthy/up
5. Smoke local + vivo vs `specs/verifications/2026-08-16-docker-prod-baseline.md` → verify: curls da barra
6. Se piorar → rollback imediato
7. `pm2 delete news && pm2 save` só se a barra ganhar

## Critic (cego)

Comparar vivo **depois** com a tabela do baseline. Se `/` deixar de 307, Fontes perder handles, health sumir, ou 5xx — falhou, mesmo com suite verde.
