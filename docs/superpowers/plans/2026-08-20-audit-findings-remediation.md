# Audit 2026-08-20 remediation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar **todos** os achados *aceitos* da auditoria de 2026-08-20 (P1–P3). Nada da lista rejeitada pela cruzada.

**Architecture:** Seis fatias verticais na ordem de risco. S1 protege o host na hora. S2 muda mídia (precisa de imagem nova para valer em 3080). S3 é docs. S4 é 4 linhas mortas. S5 é alvo de toque 44px nos controles citados. S6 é sync de Buscar + foco de erro no login. Nenhuma fatia toca auth, ingest, Supabase, chaves, cache, last-post ou `groupStyle`. Chips de grupo do feed continuam 32px.

**Tech Stack:** TanStack Start/Nitro, React 19, `node --test`, Playwright já no CI, Docker `news-news:<commit>` em `127.0.0.1:3080`.

**Baseline verificado:** `7f78c84`; 390 pass / 0 fail / 9 skip com `NEWS_SMOKE_URL=http://127.0.0.1:9`; typecheck; lint; audit 0.

## Global Constraints

- PT-BR; Conventional Commits; branch `fix/audit-2026-08-20-remediation`.
- TDD: teste vermelho antes do código, salvo docs-only.
- Nunca ler, imprimir, commitar ou rotacionar `.env` / chaves.
- Não `POST`/`PUT`/`PATCH`/`DELETE` em produção. Não `db:migrate`.
- `npx vite build` é permitido (não migra). Não rodar `ci-release-smoke.sh` contra 3080.
- Não unificar extras/`user_watches`, não fundir `groupStyle`, não redesenhar `posts`/`x-last`.
- Não “melhorar” hover, Title Case, virtualização ou empty do feed.
- Chips de grupo do feed (`[data-group-chip]` / `[data-h-scroll]`) **permanecem 32px** — contrato em `fixed-chrome.test.mjs`. S5 só mexe nos quatro controles citados.
- Auto-land GitHub depois dos gates da fatia; **deploy Docker só com OK explícito**.

## Fora de escopo (rejeitados na cruzada)

Vulns ≥8 (não há). `persistHydratedBody`, takeover de push, prefs-sync→admin, unificar cache/last-post, apagar `/api/feed`|`/api/profile`, senha de 6, rotação de chaves. Menu Escape, manifest theme estático, chevrons sem `aria-hidden`, cache-bust do SW. `agora-feed-sync.gs` / `agora_queue.py`. **Não** unificar `extra-fontes` com `user_watches` — S6 só troca o call site de Buscar pelo hook já existente.

## Decisões assumidas (confirmar antes de executar)

1. **Escopo = todos os aceitos** (P1 + P2 + os oito P3 da tabela de cobertura).
2. **Smoke:** helper único; **sem default 3080**; recusar `:3080` salvo `NEWS_SMOKE_ALLOW_PROD=1`.
3. **Docs** entram nesta entrega (S3).
4. **Sem deploy** até o usuário pedir, mesmo depois do merge.
5. Avatar Fontes `no-referrer` (P3-05) entra em S2.

---

## Mapa de arquivos

| Fatia | Cria | Altera | Teste |
|---|---|---|---|
| S1 smoke | `scripts/required-smoke.test.mjs` | `scripts/required-smoke.mjs` + 6 smokes + README | o novo arquivo + `NEWS_SMOKE_URL=http://127.0.0.1:9 npm test` |
| S2 vídeo | — | `src/components/news/story-media.tsx`, `fontes-profile-row.tsx`, `fontes.tsx` | `scripts/story-video.test.mjs` (+ assert de avatar) |
| S3 docs | — | `specs/state.yaml`, `execution-status.yaml`, `IMPACT_LATEST.md`, `specs/security/REVIEW.md`, closeout e04s08 se ainda citar `2ab7717` | `simplification-contract` doc test |
| S4 morto | — | `src/lib/news/fontes-prefs.ts`, `src/lib/news/groups.ts` | `simplification-contract` zero-consumer / grep |
| S5 toque | — | `story-card.tsx`, `buscar-interests.tsx`, `fontes-batch-bar.tsx`, `feed.tsx` | `scripts/theme-boot.test.mjs` (estender) |
| S6 buscar+login | — | `src/routes/buscar.tsx`, `src/routes/login.tsx` | `scripts/split-pages.test.mjs` + assert pontual no mesmo theme-boot / accessibility |

---

### Task 1: S1 — `npm test` não escreve em 3080 (F-2026-08-20-P1-01)

**Por quê:** o default `NEWS_SMOKE_URL \|\| http://127.0.0.1:3080` faz Playwright clicar star/power/notify no container de produção. CI já passa URL isolada (`:3180`/`:3181`); o buraco é só o host.

**Files:**
- Create: `scripts/required-smoke.test.mjs`
- Modify: `scripts/required-smoke.mjs`
- Modify: `scripts/fontes-open-card.test.mjs`, `fontes-profile-buttons.test.mjs`, `fontes-smoke.test.mjs`, `accessibility-contract.test.mjs`, `simplification-contract.test.mjs`, `mobile-ssr-viewport.test.mjs`
- Modify: `README.md` (uma linha na seção Verificação)

**Interfaces:**
- Consome: `process.env.NEWS_SMOKE_URL`, `NEWS_SMOKE_ALLOW_PROD`, `CI_REQUIRED_SMOKES`
- Produz: `resolveSmokeUrl(raw?)` e `liveSmokeUrl(t)` — string vazia = skip via `unavailable`

- [ ] **Step 1: RED — helper rejeita produção e ausência**

Criar `scripts/required-smoke.test.mjs`:

```js
import assert from "node:assert/strict";
import test from "node:test";
import { resolveSmokeUrl } from "./required-smoke.mjs";

test("sem NEWS_SMOKE_URL o smoke vivo não tem base", () => {
  const got = resolveSmokeUrl("");
  assert.equal(got.base, "");
  assert.match(got.reason, /ausente/i);
});

test("127.0.0.1:3080 é produção e exige override", () => {
  const prev = process.env.NEWS_SMOKE_ALLOW_PROD;
  delete process.env.NEWS_SMOKE_ALLOW_PROD;
  try {
    const got = resolveSmokeUrl("http://127.0.0.1:3080");
    assert.equal(got.base, "");
    assert.match(got.reason, /3080/);
  } finally {
    if (prev === undefined) delete process.env.NEWS_SMOKE_ALLOW_PROD;
    else process.env.NEWS_SMOKE_ALLOW_PROD = prev;
  }
});

test("CI em :3180 passa sem override", () => {
  const got = resolveSmokeUrl("http://127.0.0.1:3180");
  assert.equal(got.base, "http://127.0.0.1:3180");
});

test("ALLOW_PROD=1 libera 3080", () => {
  process.env.NEWS_SMOKE_ALLOW_PROD = "1";
  try {
    const got = resolveSmokeUrl("http://127.0.0.1:3080/");
    assert.equal(got.base, "http://127.0.0.1:3080");
  } finally {
    delete process.env.NEWS_SMOKE_ALLOW_PROD;
  }
});
```

Rodar:

```bash
node --experimental-strip-types --test scripts/required-smoke.test.mjs
```

Expected: FAIL — `resolveSmokeUrl` não existe.

- [ ] **Step 2: GREEN — implementar o helper**

Em `scripts/required-smoke.mjs`, acrescentar (manter `unavailable` como está):

```js
function hostnameIsLoopback(hostname) {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]";
}

export function resolveSmokeUrl(raw = process.env.NEWS_SMOKE_URL) {
  const trimmed = String(raw || "").trim().replace(/\/$/, "");
  if (!trimmed) return { base: "", reason: "NEWS_SMOKE_URL ausente" };
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return { base: "", reason: "NEWS_SMOKE_URL inválida" };
  }
  const prodLoopback = hostnameIsLoopback(url.hostname) && url.port === "3080";
  if (prodLoopback && process.env.NEWS_SMOKE_ALLOW_PROD !== "1") {
    return { base: "", reason: "NEWS_SMOKE_URL aponta para produção :3080" };
  }
  return { base: trimmed, reason: "" };
}

export function liveSmokeUrl(t) {
  const { base, reason } = resolveSmokeUrl();
  if (!base) {
    unavailable(t, reason);
    return "";
  }
  return base;
}
```

Re-rodar o teste do Step 1. Expected: PASS.

- [ ] **Step 3: RED — nenhum smoke carrega default 3080**

Acrescentar no mesmo arquivo de teste:

```js
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("smokes vivos não defaultam para :3080", () => {
  for (const rel of [
    "scripts/fontes-open-card.test.mjs",
    "scripts/fontes-profile-buttons.test.mjs",
    "scripts/fontes-smoke.test.mjs",
    "scripts/accessibility-contract.test.mjs",
    "scripts/simplification-contract.test.mjs",
    "scripts/mobile-ssr-viewport.test.mjs",
  ]) {
    const src = readFileSync(join(root, rel), "utf8");
    assert.doesNotMatch(src, /NEWS_SMOKE_URL \|\| ["']http:\/\/127\.0\.0\.1:3080["']/);
    assert.match(src, /liveSmokeUrl|resolveSmokeUrl/);
  }
});
```

Expected: FAIL nos 6 arquivos.

- [ ] **Step 4: GREEN — trocar os 6 smokes**

Padrão (adaptar `live()` de cada arquivo):

```js
import { liveSmokeUrl, unavailable } from "./required-smoke.mjs";

// dentro do teste async, ou no helper live(t):
const base = liveSmokeUrl(t);
if (!base) return;
```

Não resolver `base` no topo do módulo — senão o skip não tem `t`. Cada teste Playwright que hoje faz `if (!(await live())) unavailable(...)` passa a:

```js
const base = liveSmokeUrl(t);
if (!base) return;
```

GET `/api/health/live` no `base` continua válido (CI :3180). Cron `ingest-cron.sh` **não muda** — aquele 3080 é o alvo do job, não smoke.

README, seção Verificação, uma linha:

```text
Smokes Playwright exigem NEWS_SMOKE_URL (CI usa :3180). Sem a variável, pulam.
Não apontar para :3080 sem NEWS_SMOKE_ALLOW_PROD=1.
```

- [ ] **Step 5: verificar suíte cega + contrato**

```bash
NEWS_SMOKE_URL=http://127.0.0.1:9 npm test
node --experimental-strip-types --test scripts/required-smoke.test.mjs
```

Expected: 0 fail. Skips de smoke vivo permanecem. Sem `NEWS_SMOKE_URL`, `npm test` **não** fala com 3080.

- [ ] **Step 6: Commit**

```bash
git add scripts/required-smoke.mjs scripts/required-smoke.test.mjs \
  scripts/fontes-open-card.test.mjs scripts/fontes-profile-buttons.test.mjs \
  scripts/fontes-smoke.test.mjs scripts/accessibility-contract.test.mjs \
  scripts/simplification-contract.test.mjs scripts/mobile-ssr-viewport.test.mjs \
  README.md
git commit -m "$(cat <<'EOF'
fix(test): keep local npm test off production :3080

EOF
)"
```

---

### Task 2: S2 — vídeo respeita reduced-motion + avatar no-referrer (F-P2-03, F-P3-05)

**Por quê:** `StoryAssetBlock` chama `play()` e declara `autoPlay` sempre. `controls` cobre WCAG 2.2.2; a diretriz de loop decorativo/autoplay e o toggle `reduceMotion` do app não. Avatares de Fontes pedem CDN do X sem Referer, como o resto do app.

**Files:**
- Modify: `src/components/news/story-media.tsx:58-91`
- Modify: `src/components/news/fontes-profile-row.tsx:62-68`
- Modify: `src/routes/fontes.tsx:198-206`
- Test: `scripts/story-video.test.mjs`

**Interfaces:**
- Consome: `document.documentElement.dataset.motion`, `matchMedia('(prefers-reduced-motion: reduce)')` — já escritos por `applySettings` / `SETTINGS_BOOT_SCRIPT`
- Produz: play só quando movimento é permitido; `<video>` **sem** `autoPlay` no JSX (evita corrida antes do effect)

- [ ] **Step 1: RED — contrato do player**

Substituir o primeiro teste de `scripts/story-video.test.mjs` por:

```js
test("article video is muted looping and does not autoplay when motion is reduced", () => {
  const src = read("src/components/news/story-media.tsx");
  const block = src.slice(src.indexOf("export function StoryAssetBlock"));
  const video = block.match(/<video\b[\s\S]*?<\/video>/)?.[0];
  assert.ok(video, "StoryAssetBlock precisa renderizar <video>");
  assert.doesNotMatch(video, /\bautoPlay\b/);
  assert.match(video, /\bmuted\b/);
  assert.match(video, /\bloop\b/);
  assert.match(video, /\bplaysInline\b/);
  assert.match(video, /referrerPolicy=["']no-referrer["']/);
  assert.match(block, /prefers-reduced-motion/);
  assert.match(block, /dataset\.motion/);
  assert.match(block, /\.play\(/);
  assert.match(block, /\.pause\(/);
});

test("Fontes avatars omit the page referrer", () => {
  const row = read("src/components/news/fontes-profile-row.tsx");
  const page = read("src/routes/fontes.tsx");
  assert.match(row, /<img[\s\S]*?referrerPolicy=["']no-referrer["']/);
  assert.match(page, /<img[\s\S]*?referrerPolicy=["']no-referrer["']/);
});
```

Manter o teste do `Referrer-Policy` do documento.

```bash
node --experimental-strip-types --test scripts/story-video.test.mjs
```

Expected: FAIL (`autoPlay` ainda presente; avatares sem policy).

- [ ] **Step 2: GREEN — player e avatares**

Em `StoryAssetBlock`:

```tsx
function motionReduced() {
  if (typeof document !== "undefined" && document.documentElement.dataset.motion === "reduce") {
    return true;
  }
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

useEffect(() => {
  const node = videoRef.current;
  if (!node || asset.type !== "video") return;
  node.muted = true;
  if (motionReduced()) {
    node.pause();
    return;
  }
  const play = node.play();
  if (play) void play.catch(() => {});
}, [asset.type, asset.url]);
```

No JSX do `<video>`: **remover** `autoPlay`. Manter `controls muted loop playsInline referrerPolicy`.

Nos `<img>` de [`fontes-profile-row.tsx:62`](src/components/news/fontes-profile-row.tsx) e [`fontes.tsx:198`](src/routes/fontes.tsx): `referrerPolicy="no-referrer"`.

- [ ] **Step 3: re-rodar**

```bash
node --experimental-strip-types --test scripts/story-video.test.mjs
npm run typecheck
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix(media): pause article video when motion is reduced

EOF
)"
```

---

### Task 3: S3 — documentação viva (F-P2-01, F-P2-02)

**Por quê:** `state.yaml` ainda aponta `60261c8` / `fix_bug` / vídeo pendente. IMPACT lista gaps de catálogo já cobertos por `public-catalog-privacy.behavior.test.mjs`. REVIEW/closeout citam `news-news:2ab7717`.

**Files:**
- Modify: `specs/state.yaml`
- Modify: `specs/execution-status.yaml`
- Modify: `specs/IMPACT_LATEST.md` (riscar gaps P0/P1/P2 fechados; não reescrever o impacto histórico inteiro)
- Modify: `specs/security/REVIEW.md` (bloco “produção atual” + data 2026-08-20)
- Modify: `specs/epics/e04-full-hardening/e04s08-audit-remediation-closeout.md` só nas linhas de imagem `2ab7717` → nota “histórico; runtime atual é o HEAD”

Não inventar contagem de testes: no commit, colar a saída real de `npm test` (cego). Hash = `git rev-parse HEAD` **depois** dos commits S1+S2, ou o HEAD no momento do commit S3.

Campos `state.yaml`:

```yaml
active_flow: sustain
active_epic_id: e04
active_story_id: ""
active_bug_id: ""
release:
  target_version: "<short HEAD>"
  last_tag: "news-news:<short HEAD>"
git:
  branch: main
  hash: "<full HEAD>"
handoff:
  last_step_completed: "audit 2026-08-20 remediation S1–S3"
  required_reading: []
  next_skill: ""
```

`execution-status.yaml` `last_verified_baseline`: commit + “N passed, 0 failed, 9 skipped (smoke cego)” + typecheck/lint/audit.

IMPACT: substituir os três bullets de gap por uma linha “fechado em e04s08 / public-catalog-privacy / theme-boot; ver auditoria 2026-08-20”.

- [ ] **Step 1:** editar os arquivos (docs-only; sem RED de comportamento).
- [ ] **Step 2:**

```bash
node --experimental-strip-types --test --test-name-pattern="documentation" scripts/simplification-contract.test.mjs
NEWS_SMOKE_URL=http://127.0.0.1:9 npm test
```

Expected: PASS (o doc test atual não exige hash; não quebre `doesNotMatch` do tech-stack).

- [ ] **Step 3: Commit**

```bash
git commit -m "$(cat <<'EOF'
docs: align live state with HEAD after 2026-08-20 audit

EOF
)"
```

---

### Task 4: S4 — constantes mortas (F-P3-06)

**Por quê:** `void GROUP_KEY` / `void CUSTOM_KEY` não são lidas; as chaves canônicas estão em `section-prefs.mjs`.

**Files:**
- Modify: `src/lib/news/fontes-prefs.ts:8-9` — apagar `const GROUP_KEY` e `void GROUP_KEY`
- Modify: `src/lib/news/groups.ts:9-11` — apagar só `const CUSTOM_KEY` e `void CUSTOM_KEY`; **manter** `EVENT`

- [ ] **Step 1: RED**

```bash
node --experimental-strip-types --test --test-name-pattern="zero-consumer|documentation" scripts/simplification-contract.test.mjs
```

Acrescentar no teste de zero-consumer (ou no `required-smoke` não — melhor um assert pontual em `simplification-contract`):

```js
assert.doesNotMatch(read("src/lib/news/fontes-prefs.ts"), /void GROUP_KEY/);
assert.doesNotMatch(read("src/lib/news/groups.ts"), /void CUSTOM_KEY/);
```

Expected: FAIL.

- [ ] **Step 2: GREEN** — remover as quatro linhas.
- [ ] **Step 3:**

```bash
NEWS_SMOKE_URL=http://127.0.0.1:9 npm test && npm run typecheck && npm run lint
```

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
chore: drop unused group storage key placeholders

EOF
)"
```

---

### Task 5: S5 — alvos 44px nos quatro controles (F-P3-01…04)

**Por quê:** a cruzada rebaixou para P3, mas o pedido agora é fechar todos os aceitos. O padrão do app já é `tapIcon` = `size-[44px]` em [`icon-btn.tsx:8-9`](src/components/news/icon-btn.tsx). Chips de grupo do feed **não** mudam.

**Files:**
- Modify: `src/components/news/story-card.tsx:176`
- Modify: `src/components/news/buscar-interests.tsx:67`
- Modify: `src/components/news/fontes-batch-bar.tsx:22`
- Modify: `src/components/news/feed.tsx:222`
- Test: `scripts/theme-boot.test.mjs` (estender; já cobre back 44px)

**Interfaces:**
- Consome: `tapIcon` de `@/components/news/icon-btn` nos três botões-ícone; lote usa `min-h-[44px]` (texto, não ícone).
- Produz: nenhum export novo.

- [ ] **Step 1: RED — contrato dos quatro alvos**

Acrescentar em `scripts/theme-boot.test.mjs`:

```js
test("save, remove-interest, load-more and batch-move use 44px targets", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const read = (rel) => readFileSync(join(root, rel), "utf8");
  const card = read("src/components/news/story-card.tsx");
  const save = card.slice(card.indexOf("Salvar matéria"));
  assert.match(save, /tapIcon|size-\[44px\]/);
  assert.doesNotMatch(save.slice(0, 400), /size-8 /);

  const interests = read("src/components/news/buscar-interests.tsx");
  const remove = interests.slice(interests.indexOf("Remover @"));
  assert.match(remove, /tapIcon|size-\[44px\]/);
  assert.doesNotMatch(remove.slice(0, 350), /size-8 /);

  const feed = read("src/components/news/feed.tsx");
  const more = feed.slice(feed.indexOf("Carregar mais"));
  assert.match(more, /tapIcon|size-\[44px\]/);
  assert.doesNotMatch(more.slice(0, 350), /size-10 /);

  const batch = read("src/components/news/fontes-batch-bar.tsx");
  assert.match(batch, /min-h-\[44px\]/);
  assert.doesNotMatch(batch, /className="h-7 /);
});
```

```bash
node --experimental-strip-types --test --test-name-pattern="save, remove-interest" scripts/theme-boot.test.mjs
```

Expected: FAIL.

- [ ] **Step 2: GREEN — trocar classes**

`story-card.tsx` — importar `tapIcon` e no botão Salvar:

```tsx
className={cn("mt-2 text-mute hover:bg-paper-2 hover:text-ink", tapIcon)}
```

(`cn` já existe no arquivo.)

`buscar-interests.tsx` — importar `tapIcon`:

```tsx
className={`${tapIcon} text-mute hover:bg-paper-2 hover:text-ink`}
```

`feed.tsx` — importar `tapIcon` se ainda não:

```tsx
className={cn(tapIcon, "bg-paper-2 text-ink disabled:opacity-40")}
```

`fontes-batch-bar.tsx` — só a pílula de lote:

```tsx
className="min-h-[44px] rounded-full px-3 text-[11px] font-semibold"
```

Não alterar `group-style.ts`, `app-chrome.tsx` nem `[data-group-chip]`.

- [ ] **Step 3: verificar sem quebrar o dock 32px**

```bash
node --experimental-strip-types --test \
  scripts/theme-boot.test.mjs \
  scripts/fixed-chrome.test.mjs \
  scripts/mobile-viewport.test.mjs
NEWS_SMOKE_URL=http://127.0.0.1:9 npm test -- --test-name-pattern="group chips are 32px"
```

Expected: PASS. O teste `phone chrome keeps IA/menu/nav at 44px; group chips are 32px pills` continua verde.

- [ ] **Step 4: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix(a11y): use 44px targets on save, remove, batch and load-more

EOF
)"
```

---

### Task 6: S6 — sync de Buscar + foco no erro do login (F-P3-07, F-P3-08)

**Por quê:** `buscar.tsx` duplica `syncExtraFontes` + listener que `useExtraFontes()` já faz, e ainda usa `fontesTick` morto (`void fontesTick`). Login anuncia erro com `role="alert"` mas não move o foco — guideline de formulário.

**Files:**
- Modify: `src/routes/buscar.tsx:5,44-60,83-86`
- Modify: `src/routes/login.tsx` (`SignInPanel` e `SignUpPanel`)
- Test: `scripts/theme-boot.test.mjs` + `scripts/split-pages.test.mjs` (orçamento ≤300 linhas)

**Interfaces:**
- Consome: `useExtraFontes(): ExtraFonte[]` — já exportado
- Produz: `catalogFor(secao, { extras })` no effect de busca, deps `[query, secao, searchAttempt, extras]`
- Login: `useRef<HTMLInputElement>` no e-mail; `emailRef.current?.focus()` depois de `setError`

Não unificar `extra-fontes` com `user_watches`. Não apagar `syncExtraFontes` do módulo — o hook continua sendo o único caller de página.

- [ ] **Step 1: RED**

Acrescentar em `scripts/theme-boot.test.mjs`:

```js
test("buscar uses useExtraFontes and login focuses email after error", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const read = (rel) => readFileSync(join(root, rel), "utf8");
  const buscar = read("src/routes/buscar.tsx");
  assert.match(buscar, /useExtraFontes/);
  assert.doesNotMatch(buscar, /syncExtraFontes\s*\(/);
  assert.doesNotMatch(buscar, /fontesTick/);

  const login = read("src/routes/login.tsx");
  assert.match(login, /emailRef\.current\?\.focus\(\)/);
  assert.match(login, /useRef/);
});
```

```bash
node --experimental-strip-types --test --test-name-pattern="buscar uses useExtraFontes" scripts/theme-boot.test.mjs
```

Expected: FAIL.

- [ ] **Step 2: GREEN — Buscar**

```tsx
import { loadExtraFontes } from "@/lib/news/extra-fontes";
import { useExtraFontes } from "@/lib/news/use-extra-fontes";

function BuscarPage() {
  const extras = useExtraFontes();
  // apagar fontesTick, listener agora-extra-fontes e syncExtraFontes()
```

No effect de busca, trocar `loadExtraFontes()` por `extras` e incluir `extras` nas deps. `loadExtraFontes` pode sair do import se não restar caller no arquivo (BuscarInterests ainda chama `loadExtraFontes` por dentro — o route não precisa).

- [ ] **Step 3: GREEN — Login**

Nos dois painéis:

```tsx
const emailRef = useRef<HTMLInputElement>(null);

async function submit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setError(null);
  setBusy(true);
  try {
    await signIn(email, password, "/"); // ou signUp(...)
  } catch {
    setError("E-mail ou senha inválidos."); // cadastro: mensagem atual
    emailRef.current?.focus();
  } finally {
    setBusy(false);
  }
}

<input ref={emailRef} type="email" name="email" autoComplete="email" ... />
```

`SignUpPanel`: o mesmo `emailRef` no input de e-mail (não no nome).

- [ ] **Step 4: verificar**

```bash
node --experimental-strip-types --test \
  --test-name-pattern="buscar uses|secondary back|buscar and fontes" \
  scripts/theme-boot.test.mjs scripts/split-pages.test.mjs
npm run typecheck
NEWS_SMOKE_URL=http://127.0.0.1:9 npm test
```

Expected: `buscar.tsx` ≤ 300 linhas; 0 fail.

- [ ] **Step 5: Commit**

```bash
git commit -m "$(cat <<'EOF'
fix(ui): reuse extra-fontes hook and focus login errors

EOF
)"
```

---

## Verificação final (depois das seis fatias)

```bash
NEWS_SMOKE_URL=http://127.0.0.1:9 npm test
npm run typecheck
npm run lint
npm audit --omit=dev
```

Não apontar smoke para 3080. Não `NEWS_SMOKE_ALLOW_PROD=1` no CI. Deploy: só se o usuário pedir, tag `news-news:<commit>` e smoke GET `/api/health/live` + `/api/health`.

## Rollback

Cada fatia é um commit independente. Imagem anterior: `NEWS_IMAGE_TAG=<commit-anterior> docker compose up -d --no-build news`.

## Cobertura da auditoria

| ID | Fatia | Status no plano |
|----|--------|-----------------|
| F-2026-08-20-P1-01 smoke 3080 | S1 | coberto |
| F-2026-08-20-P2-01 YAML/REVIEW | S3 | coberto |
| F-2026-08-20-P2-02 IMPACT gaps | S3 | coberto |
| F-2026-08-20-P2-03 vídeo motion | S2 | coberto |
| F-2026-08-20-P3-01 Salvar 32px | S5 | coberto |
| F-2026-08-20-P3-02 Remover interesse | S5 | coberto |
| F-2026-08-20-P3-03 Lote `h-7` | S5 | coberto |
| F-2026-08-20-P3-04 Carregar mais 40px | S5 | coberto |
| F-2026-08-20-P3-05 Avatar no-referrer | S2 | coberto |
| F-2026-08-20-P3-06 void keys | S4 | coberto |
| F-2026-08-20-P3-07 sync Buscar | S6 | coberto |
| F-2026-08-20-P3-08 foco login | S6 | coberto |
| Rejeitados (vulns, SW, Escape, chevrons, Title Case, …) | — | fora de propósito |
