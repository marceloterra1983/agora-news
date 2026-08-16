# e03s02 — Cutover PM2 → Compose na 3080

**type:** feat  
**risk:** P0  
**context:** infra  
**maturity:** 3 (Countable)  
**bcps:** 5

## 1. Business narrative

Com o contrato na `main`, trocar o processo vivo sem piorar o snapshot do site.

## 2. Actor

Operador neste host.

## 3. Value

Produção = container `news` healthy; PM2 `news` stopped; cron e nginx iguais.

## 4. Context / zoom-out

Mesmos callers/contracts de e03s01. Cutover é exclusão mútua no bind 3080.

## 5. Main flow

1. `docker compose build` (PM2 ainda no ar).
2. Preflight: `docker compose run` / up temporário em `127.0.0.1:3081:3080` → curl 307/200/health.
3. Parar PM2 `news` (não delete ainda).
4. Subir compose na 3080; esperar healthy.
5. Smoke local + `https://news.automatizems.com` vs baseline.
6. `pm2 stop news` permanente / `pm2 delete news` + `pm2 save` só se o vivo ganhar da barra.
7. Avisar: container leu `.env` — restart de compose recarrega env.

## 6. Alternative / error flows

Qualquer falha após soltar 3080:

```bash
cd /home/marce/news && docker compose down && pm2 start news
```

Não deixar os dois bindando 3080.

## 7. Scope

**In:** build da imagem no host, preflight 3081, cutover, smoke, disable PM2, evidência.  
**Out:** mudar nginx, cron, `.env`, outros projetos Docker.

## 8. Dependencies

e03s01 merged. Imagem builda. Disco/rede para `npm ci` no build.

## 9. Requirements

#### ADDED: Preflight da imagem fora da 3080
Container responde em 3081 com os mesmos status do baseline (307 `/`, 200 Fontes, health 200 ou 503 com JSON).

#### MODIFIED: Processo na 3080
**Before:** PM2 `vite dev` online.  
**After:** Compose `news` Up; PM2 `news` stopped; nginx inalterado.

#### ADDED: Rollback de uma linha
`docker compose down && pm2 start news`

## 10. Constraints

Não apagar outros containers. Não rotacionar keys. Restart do compose avisa (`.env`).

## 11. Architecture

Cutover atômico no bind. Healthcheck Compose ≠ “feed fresco”.

## 12. Data

Sem mudança de schema. Ingest continua no mesmo endpoint.

## 13. Risks

Downtime curto entre `pm2 stop` e `compose up` (segundos). Rollback se >30s sem 200 em Fontes.

## 14. Test plan

SC-e03s02-P0-01: curl local 3080.  
SC-e03s02-P0-02: curl vivo vs baseline.  
SC-e03s02-P0-03: `pm2 show news` status stopped.  
SC-e03s02-P0-04: Fontes contém handles conhecidos.

## 15. Rollout

Depois do auto-land. Avisar restart: `docker compose up -d --build` relê `.env`.

## 16. Rollback

`cd /home/marce/news && docker compose down && pm2 start news`

## 17. Acceptance criteria (Gherkin)

```gherkin
Given o container news healthy na 3080
When curl -sS -o /dev/null -w "%{http_code}" http://127.0.0.1:3080/fontes?secao=ai
Then status is 200
And https://news.automatizems.com/fontes?secao=ai is 200 and lists profiles
And https://news.automatizems.com/api/health is 200 or 503 with JSON postsOk
And pm2 show news is not online
```

## 18. Out of scope

Mudar Cloudflare, nginx, Evolution :8080.

## 19. Notes

Baseline obrigatório: `specs/verifications/2026-08-16-docker-prod-baseline.md`.

## 20. Traceability

Barra: vivo não pior que o snapshot; suite verde.
