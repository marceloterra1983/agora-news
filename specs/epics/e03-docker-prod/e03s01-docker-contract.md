# e03s01 — Contrato Docker de produção (Nitro)

**type:** feat  
**risk:** P0  
**context:** infra  
**maturity:** 3 (Countable)  
**bcps:** 5

## 1. Business narrative

Hoje o site público roda `vite dev` via PM2 na 3080. Isso é frágil (HMR, glob de migrations, restarts). Precisamos do mesmo host atrás do nginx, mas com `vite build` + servidor Node Nitro (`node-server`), empacotado em Compose, sem mudar URL pública nem o cron.

## 2. Actor

Operador do host (este agente neste computador) e o cron local de ingest.

## 3. Value

Processo de produção reproduzível, restart automático, sem `vite dev` no ar.

## 4. Context / zoom-out

- **Purpose do runtime:** servir SSR/API TanStack Start na 3080 para o nginx.
- **Callers:** nginx, cron `ingest-cron.sh`, Cloudflare.
- **Contracts:** 3080 local; `/` 307→`/?secao=ai`; Fontes lista perfis; `/api/health`; ingest Bearer+CRON_SECRET; `.env` fora do git.

## 5. Main flow

1. Testes de contrato RED (arquivos ainda não existem).
2. Dockerfile multi-stage + `.dockerignore` + `compose.yml` + `npm start`.
3. Suite verde. Land na `main` via PR.

## 6. Alternative / error flows

- Build da imagem falha → não cutover (e03s02).
- Teste de contrato vermelho → não land.

## 7. Scope

**In:** `Dockerfile`, `.dockerignore`, `compose.yml` (ou `docker-compose.yml`), `package.json` script `start`, `scripts/docker-prod.test.mjs`, docs da cápsula.

**Out:** nginx, rotação de keys, apagar outros containers, porta 8080, orquestração nova, overwrite de `.env`.

## 8. Dependencies

- Node 22 na imagem (CI já usa 22). Host tem Node 24 e Docker 29 / Compose 2.40.
- Docs: TanStack Start hosting → `node .output/server/index.mjs`. Nitro node-server → `NITRO_PORT`, `NITRO_HOST`.
- `.env` existente no host (só `CRON_SECRET` hoje).

## 9. Requirements

#### ADDED: Imagem de produção multi-stage
Build: `npm ci` + `npx vite build` (`npm run build` no host também é só `vite build`; migrate é `npm run db:migrate` e precisa `DATABASE_URL` no `.env` montado). Runtime: `node .output/server/index.mjs`, user `node`, `EXPOSE 3080`, `ENV PORT=3080 NITRO_PORT=3080 NITRO_HOST=0.0.0.0 NODE_ENV=production`. Sem `vite dev` / `npm run dev`.

#### ADDED: Compose serviço `news`
`restart: unless-stopped`, `env_file: .env`, `ports: ["127.0.0.1:3080:3080"]`, healthcheck HTTP em `/api/health` aceitando 200 **ou** 503 (processo up; 503 = feed stale). Sem publicar 8080.

#### ADDED: Script `start`
`"start": "node .output/server/index.mjs"` em `package.json` (comando documentado, não inventado).

#### ADDED: Contrato automatizado
`scripts/docker-prod.test.mjs` prova existência, porta 3080, bind loopback, ausência de `vite dev` no container, `.env` no gitignore/dockerignore, nenhum secret no Dockerfile/compose.

#### MODIFIED: Como a produção sobe
**Before:** PM2 `npx vite dev --host 0.0.0.0 --port 3080`.  
**After:** Compose `news` → Nitro node-server na 3080. Nginx e cron inalterados.

## 10. Constraints

- Não commitar `.env`. Não sobrescrever `.env`.
- Não usar 8080. Não `vite dev` no container.
- Sem force-push em main. Sem `--no-verify`.
- Sem dependência npm nova. Slopcheck: Docker/Compose/Node oficiais `[OK]`.

## 11. Architecture

```
Cloudflare → nginx host :80 → 127.0.0.1:3080 → container news (NITRO_HOST=0.0.0.0:3080)
cron host → 127.0.0.1:3080/api/ingest
.env host ──env_file──► container (não entra na imagem)
```

Dockerfile: stage `build` (node:22-bookworm, `npm ci`, `npx vite build`) → stage `runner` (node:22-bookworm-slim, copia `.output`, `package.json`, lockfile, `node_modules` de produção se o bundle Nitro não for 100% standalone — preferir copiar `.output` + deps nativas necessárias). User `node`.

Se o Nitro gerar servidor standalone em `.output/server`, o runner não precisa de `node_modules` completo; se o start falhar por módulo nativo (`lightningcss`, `pg`, `@electric-sql/pglite`), copiar `node_modules` de produção do stage build. Critic valida o start real, não a hipótese.

## 12. Data

Nenhuma migration nova. Feed = Supabase `public.posts`. Auth = Neon se `DATABASE_URL` no `.env` (hoje ausente) senão PGLite no processo.

## 13. Risks

- Bundle Nitro incompleto no slim → start crash. Mitigação: smoke em 3081 antes do cutover.
- Health 503 por stale → Compose marca unhealthy. Mitigação: aceitar 200/503.
- Expor 0.0.0.0:3080 → desnecessário; bind 127.0.0.1.

## 14. Test plan

SC-e03s01-P0-01: contrato de arquivos e comandos (`npm test -- scripts/docker-prod.test.mjs`).  
SC-e03s01-P0-02: `npm test && npm run typecheck`.

## 15. Rollout

Land e03s01 na `main` **antes** do cutover (e03s02). Imagem ainda não substitui PM2 neste story.

## 16. Rollback

`git revert` do merge. PM2 continua no ar até e03s02.

## 17. Acceptance criteria (Gherkin)

```gherkin
Given o repo em feat/docker-prod-news
When npm test -- scripts/docker-prod.test.mjs
Then o Dockerfile existe e não contém "vite dev" nem "npm run dev"
And o start é node .output/server/index.mjs
And compose publica 127.0.0.1:3080:3080 e não 8080
And .env não está no contexto da imagem

Given npm test && npm run typecheck
Then exit 0
```

## 18. Out of scope

Cutover PM2, mudança de nginx, Evolution, Vercel, rotação de secrets.

## 19. Notes

Baseline: `specs/verifications/2026-08-16-docker-prod-baseline.md`.  
Impacto: `specs/IMPACT_LATEST.md`.

## 20. Traceability

Barra gauntlet: site vivo + suite. Este story só entrega o artefato; e03s02 entrega o ar.
