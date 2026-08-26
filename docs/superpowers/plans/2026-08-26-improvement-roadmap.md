# Improvement roadmap — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar o que o leitor ainda vê mentir (push, mídia, buzz) e começar o idioma visual já especificado — sem reabrir o canvas de 16/08.

**Architecture:** Seis fatias Now, cada uma `npm test` verde. Trilho A (produto) não toca CSS de grupo. Trilho B (DS) segue o spec `2026-08-26-design-system-hardening-design.md` e o plano irmão `2026-08-26-design-system-hardening.md` (T1–T3 só).

**Tech Stack:** TanStack Start, Tailwind v4, `node --test`. Sem dependência nova. Sem pasta extra.

## Global Constraints

- PT-BR; Conventional Commits; branch `fix/improvement-now` (ou uma branch por fatia).
- Sem dependência nova. Sem pasta extra. Sem schema/migration.
- Nunca `.env` / secrets. Sem deploy até OK explícito.
- Chip grupo **32px**. Não fundir `groupStyle`. Cor de grupo = identidade.
- Não reabrir itens **MORTOS** da spec.

Spec: `docs/superpowers/specs/2026-08-26-improvement-plan-design.md`

## Mapa Now

| Task | Id | Altera | Teste |
|---|---|---|---|
| 1 | L1 | `notify-favorites.ts`, `use-notify-favorites.ts`, `configuracoes.tsx` | `agora-now.test.mjs` + `accessibility-contract` se já cobrir push |
| 2 | R5 | `article-view.tsx` | teste de source ou story-media existente |
| 3 | F3 | `fonte-metrics.ts` | teste de `fetchLastBuzz` se houver; senão criar unit |
| 4 | T1 | `critical.css.ts`, `styles.css`, `grok-fontes-restore.test.mjs` | ver plano DS Task 1 |
| 5 | T2 | `styles.css`, `group-style.ts`, `groups.ts` | `group-style.test.mjs` |
| 6 | T3 | `group-tag.tsx` | `group-style.test.mjs` |

---

### Task 1: L1 — toggle de push só liga se o POST passou

**Por quê:** `enableFavoriteNotify` grava `ENABLED_KEY` e dispara `void subscribeWebPush`. Sem sessão o POST é 403 e o UI fica “Avisar favoritos” ligado.

**Files:**
- Modify: `src/lib/news/notify-favorites.ts:70-79`
- Modify: `src/lib/news/use-notify-favorites.ts` (tratar falha)
- Modify: `src/routes/configuracoes.tsx` (copy “entre para gravar o aviso” se 403)

**Interfaces:**
- Consome: `subscribeWebPush()` → `applyPushSubscribeResult(res.ok)`
- Produz: `enableFavoriteNotify` `async` e só persiste `ENABLED_KEY` após ok; se falhar, remove a chave e devolve `"error"` ou `"need-login"`

- [ ] **Step 1: RED** — teste que `enableFavoriteNotify` não deixa `ENABLED_KEY=1` se subscribe falha

Estender `scripts/agora-now.test.mjs` (ou o arquivo de push que já lê o source) para exigir que `ENABLED_KEY` só seja setado depois de subscribe, ou que exista `await subscribeWebPush` antes do set. Se o helper for difícil de mockar, assert de source:

```js
assert.match(notify, /await subscribeWebPush/);
assert.doesNotMatch(notify, /setItem\(ENABLED_KEY[\s\S]{0,80}void subscribeWebPush/);
```

Run: `node --experimental-strip-types --test scripts/agora-now.test.mjs`
Expected: FAIL

- [ ] **Step 2: GREEN** — await + revert

```ts
const saved = await subscribeWebPush(handles);
if (!saved) {
  window.localStorage.removeItem(ENABLED_KEY);
  emit();
  return "error";
}
window.localStorage.setItem(ENABLED_KEY, "1");
```

Ordem: pedir permissão → subscribe → só então `ENABLED_KEY`. Copy em configurações se o caller souber que não há sessão.

- [ ] **Step 3: `npm test` + commit**

```bash
npm test
git add src/lib/news/notify-favorites.ts src/lib/news/use-notify-favorites.ts src/routes/configuracoes.tsx scripts/agora-now.test.mjs
git commit -m "$(cat <<'EOF'
fix(push): only enable favorite alerts after subscribe succeeds

EOF
)"
```

---

### Task 2: R5 — não refetchar fxtwitter se o row já tem mídia

**Por quê:** `ArticleView` passa `initialData` quando há quote/assets, mas o `useQuery` ainda corre `loadTweetEmbed` em toda abertura.

**Files:**
- Modify: `src/components/news/article-view.tsx:25-41`

**Interfaces:**
- Consome: `story.quoted | replyTo | card | xArticle | assets`
- Produz: `enabled: !(já tem embed no row)`

- [ ] **Step 1: RED**

```js
// no teste de source que já lê article-view (agora-now ou story-video)
assert.match(src, /enabled:\s*!/);
```

Se não houver arquivo, criar assert em `scripts/agora-now.test.mjs` lendo `article-view.tsx`.

- [ ] **Step 2: GREEN**

```ts
const packed =
  Boolean(story.quoted || story.replyTo || story.card || story.xArticle || story.assets?.length);
const { data: embed } = useQuery({
  queryKey: ["tweet-embed", story.id, story.source],
  queryFn: () => loadTweetEmbed({ data: { id: story.id, source: story.source } }),
  initialData: packed ? { /* igual ao bloco atual */ } : undefined,
  enabled: !packed,
  staleTime: 30 * 60_000,
});
```

Não inventar coluna. Rows velhas sem pack continuam a buscar.

- [ ] **Step 3: `npm test` + commit**

```bash
npm test
git add src/components/news/article-view.tsx scripts/agora-now.test.mjs
git commit -m "$(cat <<'EOF'
fix(reader): skip fxtwitter embed when the row already has media

EOF
)"
```

---

### Task 3: F3 — buzz do tweet do card, nunca `rows[0]`

**Por quê:** `fonte-metrics.ts:100-101` faz `find(id) ?? rows[0]`. ER/alcance podem ser de outro status.

**Files:**
- Modify: `src/lib/news/fonte-metrics.ts`
- Test: criar ou estender `scripts/fonte-metrics.test.mjs` (puro, sem rede)

**Interfaces:**
- Consome: `fetchLastBuzz(handle, tweetId)`
- Produz: se `tweetId` e não achou nos 12 → `hit` cache ou `null`, **nunca** `rows[0]`

- [ ] **Step 1: RED** — unit do picker

```js
import assert from "node:assert/strict";
import test from "node:test";
// extrair pickBuzzRow(rows, tweetId) se ainda estiver inline
test("missing tweetId does not fall back to rows[0]", () => {
  const rows = [{ id: "aaa" }, { id: "bbb" }];
  assert.equal(pickBuzzRow(rows, "zzz"), null);
  assert.equal(pickBuzzRow(rows, "bbb")?.id, "bbb");
});
```

Run até FAIL.

- [ ] **Step 2: GREEN**

```ts
const picked = tweetId
  ? rows.find((r) => String(r.id) === String(tweetId)) ?? null
  : rows[0];
if (!picked) return hit ? pickBuzz(hit) : null;
```

- [ ] **Step 3: `npm test` + commit**

```bash
npm test
git add src/lib/news/fonte-metrics.ts scripts/fonte-metrics.test.mjs
git commit -m "$(cat <<'EOF'
fix(fontes): never attribute buzz from a different tweet

EOF
)"
```

---

### Task 4–6: DS T1 T2 T3

Não duplicar os diffs aqui. Executar **na ordem** as Tasks 1–3 de:

`docs/superpowers/plans/2026-08-26-design-system-hardening.md`

- [ ] **Task 4 = DS T1** (critical + header 64px) → `npm test` + commit do plano irmão
- [ ] **Task 5 = DS T2** (hue + dark 1.4.11) → `npm test` + commit
- [ ] **Task 6 = DS T3** (GroupTag wash ≥11px) → `npm test` + commit

T4 do plano DS (Input + SettingsToggle) **não** entra neste Now.

---

## Next

- DS T4 (Input `aria-invalid`, toggle off visível)
- `hasMore` inicial em `use-feed-older.ts` (não mentir “mais 12 horas”)
- Smoke Playwright do contraste dark do chip

## Later

- Backfill `media_label` JSON em rows antigas
- P4 `content` no `LIST_SELECT` (só se a busca na lista doer)
- P5: gtx fail-open não gravar EN como `translation_pt`
- DRY `ALIAS` / tokenizar `h-[32px]`

## Verificação final

```bash
npm test
npm run typecheck
npm run lint
```
