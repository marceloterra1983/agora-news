# Audit findings closeout — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar todos os achados *aceitos* da auditoria de 2026-08-17: CI verde, produção alinhada ao HEAD, P2 de UI, docs honestas e código morto removido.

**Architecture:** Cinco fatias verticais na ordem de risco. S1 desbloqueia a `main`. S2 é o único passo que mexe em produção. S3–S5 não mudam auth, ingest, Supabase nem chaves. Nenhuma fatia unifica extras, last-post ou `groupStyle` — a cruzada rejeitou isso como rewrite.

**Tech Stack:** TanStack Start/Nitro, React 19, `node --test`, Playwright já no CI, Docker Compose em `127.0.0.1:3080`.

## Global Constraints

- Responder em PT-BR; commits Conventional Commits; branch `codex/…`.
- TDD: teste vermelho antes do código, salvo docs-only.
- Nunca ler, imprimir, commitar ou rotacionar `.env` / chaves.
- Não `POST`/`PUT`/`PATCH`/`DELETE` em produção, exceto o deploy explícito da S2.
- Não `npm run db:migrate` sem pedido. `npx vite build` é permitido (não migra).
- Não unificar `extra-fontes` + `user_watches`, não fundir `groupStyle`, não redesenhar `posts`/`x-last`.
- Não “melhorar” hover, Title Case, virtualização ou empty do feed.
- Auto-land GitHub (PR merge) só depois dos gates da fatia; **deploy Docker só com OK do usuário**.

## Fora de escopo (rejeitados na cruzada)

Vulns ≥8 (não há). Takeover de push, `persistHydratedBody`, `/api/cache`, argv do cron, grafo `prefs-sync`→`admin`. Apagar `/api/feed` e `/api/profile`. Cortar zod/bridge/`cn`. Senha de 6 caracteres.

---

## Mapa de arquivos

| Fatia | Cria | Altera | Teste |
|---|---|---|---|
| S1 CI | — | `scripts/simplification-contract.test.mjs` | o próprio arquivo + `CI_ARTIFACT_GATES=1` |
| S2 deploy | — | host Docker / `specs/state.yaml` depois do smoke | GET health + Fontes/matéria |
| S3 UI | — | `theme.ts`, `__root.tsx`, `login.tsx`, `salvos.tsx`, `instalar.tsx`, `referencias.tsx`, `app-menu.tsx`, testes a11y/viewport | `mobile-viewport`, `accessibility-contract`, teste novo de theme-color |
| S4 docs | — | `state.yaml` (se S2 não cobriu), closeout e04s08, `REVIEW.md`, e03 PLAN/e03s01, `execution-status.yaml` | `simplification-contract` doc test se existir; senão grep pontual |
| S5 morto | — | `settings.ts`, `format.ts`, `profiles.ts`, `section-catalog.mjs` + `.d.mts`, `group-style.test.mjs`, callers de teste | `group-style`, `theme-catalog`, `font-scale`, `catalog-feed-scope` |

---

### Task 1: S1 — CI deixa de mentir (F-P1-01)

**Por quê:** o chunk `icon-btn-*.js` no Vite **não é** o módulo de 67 linhas. É um pacote compartilhado (~33 KB). O teto de 25 KB quebra a `main` e bloqueia o deploy do fix de watch/x-last. O contrato real é “sem Radix/tooltip/CVA”, já coberto pelo resto do teste.

**Files:**
- Modify: `scripts/simplification-contract.test.mjs:158-176`
- Test: o mesmo arquivo

**Interfaces:**
- Consome: `CI_ARTIFACT_GATES=1`, `.output/public/assets`, `.output/server/_libs`
- Produz: gate que passa no artefato atual sem reintroduzir Radix

- [ ] **Step 1: Provar o vermelho com o artefato existente (não precisa rebuild se `.output` já tem o chunk)**

```bash
CI_ARTIFACT_GATES=1 node --experimental-strip-types --test \
  --test-name-pattern="Tip and Button" \
  scripts/simplification-contract.test.mjs
```

Expected: FAIL `icon-btn-C_mcALvh.js exceeds 25 KB` (32910 > 25000).

- [ ] **Step 2: Trocar o gate de tamanho por contratos que medem o que importa**

No bloco `if (process.env.CI_ARTIFACT_GATES === "1")`, **apagar** o loop que mede `byteLength` / gzip de `icon-btn-*.js`. **Manter** existência de `.output/public/assets` e o assert `legacyUi === []`.

Acrescentar assert de source (já parcialmente lá) para o módulo continuar magro:

```js
const iconBytes = Buffer.byteLength(icon, "utf8");
assert.ok(iconBytes <= 3_000, `icon-btn.tsx is ${iconBytes} B`);
```

Não subir o teto para 40 KB — isso valida o proxy errado.

- [ ] **Step 3: Re-rodar o teste focado**

```bash
CI_ARTIFACT_GATES=1 node --experimental-strip-types --test \
  --test-name-pattern="Tip and Button" \
  scripts/simplification-contract.test.mjs
```

Expected: PASS.

- [ ] **Step 4: Gates locais**

```bash
npm test && npm run typecheck && npm run lint
```

Expected: 285+ pass (pode ficar 285 se só mudou o assert), typecheck/lint 0.

- [ ] **Step 5: Branch, commit, PR, esperar CI verde**

```bash
git checkout -b codex/audit-ci-chunk-gate
git add scripts/simplification-contract.test.mjs
git commit -m "$(cat <<'EOF'
fix(ci): stop sizing the shared icon-btn Vite chunk

The 25 KB cap targeted a rollup name, not icon-btn.tsx, and failed main.

EOF
)"
git push -u origin HEAD
gh pr create --title "fix(ci): stop sizing the shared icon-btn Vite chunk" --body "$(cat <<'EOF'
## Summary
- Remove the false `icon-btn-*.js` 25 KB artifact gate.
- Keep the no-Radix / no-tooltip contracts and a source-size cap on `icon-btn.tsx`.

## Test plan
- [ ] `CI_ARTIFACT_GATES=1` focused test passes
- [ ] `npm test` / typecheck / lint
- [ ] GitHub Actions check job green

EOF
)"
```

Não mergear se o job `check` falhar. Depois: `gh pr merge --merge --delete-branch`, checkout `main`, pull.

**Verify da fatia:** CI de `main` verde no commit mergeado.

---

### Task 2: S2 — Produção recebe o HEAD (F-P1-02 + F-P2-04 parcial)

**Por quê:** `48985d3` ainda apaga watch em todas as seções e pode promover `x-last`/`last_*` a matéria. O Git já tem `2075a0d`.

**Files:**
- Host: imagem Docker / compose (não commitar `.env`)
- Modify after smoke: `specs/state.yaml`, `specs/execution-status.yaml`

**Pré-condição:** Task 1 mergeada e CI verde. **Não executar sem OK explícito de deploy.**

- [ ] **Step 1: Tag e build no host (sem bakear `.env`)**

```bash
cd /home/marce/news
git pull --ff-only
HEAD=$(git rev-parse --short HEAD)
docker compose build news
docker image tag news-news:latest "news-news:${HEAD}"
# rollback preservado
docker image inspect news-news:48985d3 >/dev/null
```

- [ ] **Step 2: Subir só o runtime**

```bash
NEWS_IMAGE_TAG=${HEAD} docker compose up -d --no-build news
docker inspect news-news-1 --format '{{.Config.Image}} {{.State.Health.Status}}'
```

Expected: `news-news:<HEAD> healthy`. Sem `db:migrate` (schema Better Auth já está). Sem tocar Supabase.

- [ ] **Step 3: Smoke GET (permitido)**

```bash
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3080/api/health/live
curl -sS http://127.0.0.1:3080/api/health | python3 -c "import sys,json; d=json.load(sys.stdin); assert d['ok'] and not d['stale']"
curl -sS -o /dev/null -w '%{http_code}\n' 'http://127.0.0.1:3080/fontes?secao=ai'
curl -sS -o /dev/null -w '%{http_code}\n' https://news.automatizems.com/api/health
```

Expected: 200 / ok / 200 / 200.

- [ ] **Step 4: Smoke funcional (dono, no browser — não automatizar POST daqui)**

1. Fontes: extra numa seção → remover → a outra seção **mantém** o handle.
2. Abrir uma matéria real. Não deve abrir `last_*` nem category `x-last` como matéria.
3. Login da conta allowlisted ainda funciona.

- [ ] **Step 5: Rollback se qualquer passo falhar**

```bash
NEWS_IMAGE_TAG=48985d3 docker compose up -d --no-build news
```

- [ ] **Step 6: Alinhar specs ao que está no ar**

Em `specs/state.yaml`:

```yaml
git:
  branch: main
  baseline: "<full HEAD sha>"
  hash: "<full HEAD sha>"
release:
  target_version: "<short HEAD>"
  last_tag: "news-news:<short HEAD>"
  last_publish: "<ISO local>"
```

`execution-status.yaml`: `last_verified_baseline.commit` e `tests: "285 passed…"` (ou a conta real).

Commit: `docs(state): record deployed <short> after audit closeout`.

**Verify da fatia:** container = HEAD; health 200; watch scoped; x-last fora do feed.

---

### Task 3: S3 — UI P2 (F-P2-01, F-P2-02, F-P2-03)

**Files:**
- Modify: `src/lib/news/theme.ts` (`THEME_BOOT_SCRIPT`)
- Modify: `src/routes/__root.tsx` (ordem head — só se o script criar o meta)
- Modify: `src/routes/login.tsx:54`, `salvos.tsx:54`, `instalar.tsx:97`, `referencias.tsx:102`
- Modify: `src/components/news/app-menu.tsx:50-63`
- Test: `scripts/mobile-viewport.test.mjs` e/ou teste novo `scripts/theme-boot.test.mjs`; `scripts/accessibility-contract.test.mjs` se cobrir menu

**Interfaces:**
- `THEME_BOOT_SCRIPT` continua string IIFE, sem user input
- Voltar: mesma classe do artigo `size-[44px] … rounded-full border…`
- Menu: fecha se `focusout` e `relatedTarget` fora de `box`

- [ ] **Step 1: Teste RED — boot cria/atualiza theme-color mesmo sem meta prévio**

Criar `scripts/theme-boot.test.mjs`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("THEME_BOOT_SCRIPT creates theme-color when the meta is missing", () => {
  const src = readFileSync(join(root, "src/lib/news/theme.ts"), "utf8");
  assert.match(src, /THEME_BOOT_SCRIPT/);
  assert.match(src, /createElement\(["']meta["']\)|document\.head\.appendChild/);
  assert.match(src, /#12100e/);
  assert.match(src, /#f2eee4/);
});

test("secondary back links use the 44px tap target", () => {
  for (const rel of [
    "src/routes/login.tsx",
    "src/routes/salvos.tsx",
    "src/routes/instalar.tsx",
    "src/routes/referencias.tsx",
  ]) {
    const src = readFileSync(join(root, rel), "utf8");
    assert.match(src, /size-\[44px\]/, rel);
    assert.doesNotMatch(src, /size-8 place-items-center rounded-full border/, rel);
  }
});

test("app menu closes when focus leaves the box", () => {
  const src = readFileSync(join(root, "src/components/news/app-menu.tsx"), "utf8");
  assert.match(src, /focusout|onBlur/);
  assert.match(src, /relatedTarget/);
  assert.match(src, /setOpen\(false\)/);
});
```

```bash
node --experimental-strip-types --test scripts/theme-boot.test.mjs
```

Expected: FAIL (script ainda só faz `querySelector`).

- [ ] **Step 2: Implementar theme-color fail-safe**

Em `THEME_BOOT_SCRIPT`, se não houver meta, criar e anexar no `head`:

```js
// dentro do IIFE, no lugar do querySelector-only:
var m=document.querySelector('meta[name="theme-color"]');
if(!m){m=document.createElement("meta");m.setAttribute("name","theme-color");(document.head||el).appendChild(m);}
m.setAttribute("content",c);
```

Manter `applyTheme` no mesmo espírito (criar meta se faltar). Não precisa mover o script para depois de `HeadContent` se o boot for autossuficiente — menos risco de FOUC de classe `dark`.

- [ ] **Step 3: Trocar `size-8` dos Voltar por `size-[44px]`**

Padrão canônico (já em `article-view.tsx:70`):

```tsx
className="mt-8 grid size-[44px] place-items-center rounded-full border border-line text-ink hover:bg-paper-2"
```

(`mt-6` em salvos permanece se já era.) Chips 32px **não** mexer.

- [ ] **Step 4: Menu fecha no Tab**

No `useEffect` que já escuta pointer/Escape, adicionar:

```ts
const onFocusOut = (e: FocusEvent) => {
  const next = e.relatedTarget as Node | null;
  if (next && box.current?.contains(next)) return;
  setOpen(false);
};
box.current?.addEventListener("focusout", onFocusOut);
```

Remover no cleanup. Não fechar se o foco for para o próprio trigger dentro de `box` (o trigger está dentro — Tab para fora do `div` fecha; Tab entre itens do menu não).

- [ ] **Step 5: Verde**

```bash
node --experimental-strip-types --test scripts/theme-boot.test.mjs
npm test && npm run typecheck && npm run lint
```

- [ ] **Step 6: Commit + PR na branch `codex/audit-ui-p2`**

```
fix(a11y): boot theme-color, 44px back, menu focusout
```

Merge só com CI verde.

**Verify da fatia:** testes novos verdes; viewport/zoom tests ainda passam (`user-scalable` ausente).

---

### Task 4: S4 — Docs deixam de contradizer o código (F-P2-05, F-P3-01, F-P3-02)

**Files:**
- Modify: `specs/epics/e04-full-hardening/e04s08-audit-remediation-closeout.md` (§2 Status, §6 Problem)
- Modify: `specs/security/REVIEW.md` (marcar histórico + HEAD atual)
- Modify: `specs/epics/e03-docker-prod/PLAN.md:24`, `e03s01-docker-contract.md:53`
- Modify: `specs/state.yaml` / `execution-status.yaml` se S2 ainda não o fez

Não reescrever épicos inteiros. Só as frases falsas.

- [ ] **Step 1: Closeout e04s08**

**Before:** “public feed still reads the union of private watches” / `listAllWatchAccounts()` no path público.

**After:** feed anônimo = `catalogFor` + seed; autenticado = seed + `listUserWatchAccounts(userId)` em `server-catalog.ts`. `listAllWatchAccounts` só no ingest/cron.

- [ ] **Step 2: REVIEW.md**

Cabeçalho: “histórico do range `db73cfb..a50aac3` (270 testes). Auditoria 2026-08-17 em `7c53d1f`: 285 testes, 0 achados ≥8.” Não apagar a evidência antiga — datar.

- [ ] **Step 3: e03**

`npm run build` = `vite build`. Migrate é `npm run db:migrate` explícito. Dockerfile já faz `npx vite build`.

- [ ] **Step 4: Commit `docs: align audit closeout with current main`**

Sem teste de comportamento. Se `simplification-contract` ou `docker-prod.test` pinarem o texto velho, atualizar o match.

```bash
npm test && npm run lint
```

---

### Task 5: S5 — Código morto (F-P3-03)

**Files:**
- Modify: `src/lib/news/settings.ts` (remover `FONT_STEPS`)
- Modify: `src/lib/news/format.ts` (remover `readerDate`, `WEEKDAYS`, `MONTHS` se só eles usam)
- Modify: `src/lib/news/profiles.ts` (remover `GROUP_LABELS`, `GROUP_ORDER`)
- Modify: `src/lib/news/section-catalog.mjs` + `section-catalog.d.mts` (remover `scopeCachedStories`, `chipGroupIds`)
- Modify: `scripts/group-style.test.mjs` — apontar `novos → Outros` para `catalog-taxonomy.mjs`
- Modify: `scripts/catalog-feed-scope.test.mjs` / `section-catalog.test.mjs` se o regex-OR quebrar

- [ ] **Step 1: RED — teste de taxonomia no lugar de GROUP_LABELS**

Em `group-style.test.mjs`, trocar o primeiro teste para ler `catalog-taxonomy.mjs`:

```js
test("taxonomy maps novos → Outros", () => {
  const src = readFileSync(join(root, "src/lib/news/catalog-taxonomy.mjs"), "utf8");
  assert.match(src, /novos:\s*"Outros"/);
  assert.doesNotMatch(src, /novos:\s*"Novos"/);
});
```

Rodar: deve PASSAR já (taxonomia já tem Outros). Depois apagar `GROUP_LABELS` — o teste velho quebraria; o novo não.

- [ ] **Step 2: Apagar os símbolos e os types mortos**

Confirmar zero callers:

```bash
rg -n "GROUP_LABELS|GROUP_ORDER|readerDate|scopeCachedStories|chipGroupIds" src scripts
rg -n "FONT_STEPS" src
```

`FONT_STEPS` vivo só em `font-scale.ts` + UI. O de `settings.ts` some.

- [ ] **Step 3:**

```bash
npm test && npm run typecheck && npm run lint
```

- [ ] **Step 4: Commit `chore: drop unused font/group/catalog leftovers`**

---

## Ordem e risco

```text
S1 CI          P1  ~30 min   desbloqueia main
S2 deploy      P1  ~20 min   só com OK; rollback = 48985d3
S3 UI          P2  ~1 h      branch própria
S4 docs        P2  ~30 min   pode ir no mesmo PR da S3
S5 morto       P3  ~30 min   PR próprio ou cauda da S3
```

S3+S4 no mesmo PR é aceitável. S1 **sozinha**. S2 **nunca** no mesmo commit que UI.

## Rollback

| Fatia | Rollback |
|---|---|
| S1 | revert do PR; CI volta a vermelho (aceitável só se S2 ainda não saiu) |
| S2 | `NEWS_IMAGE_TAG=48985d3 docker compose up -d --no-build news` |
| S3–S5 | revert do PR |

## Coverage vs auditoria

| ID | Task |
|---|---|
| F-P1-01 | S1 |
| F-P1-02 | S2 |
| F-P2-01/02/03 | S3 |
| F-P2-04 | S2 step 6 |
| F-P2-05 | S4 |
| F-P3-01/02 | S4 |
| F-P3-03 | S5 |
| Rejeitados | nenhuma |

## Self-review

- Sem TBD. Sem pacote novo (`[OK]` zero deps).
- Sem abstração nova.
- Verify de cada fatia é comando ou smoke GET + 3 passos manuais na S2.
