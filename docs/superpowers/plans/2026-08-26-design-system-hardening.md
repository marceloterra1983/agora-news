# Design system hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Uma fonte de verdade visual (tokens + matiz de grupo + first paint + a11y de UI) sem redesenhar o jornal e sem inventar primitivos que o app não usa.

**Architecture:** Quatro fatias verticais. Cada uma deixa `npm test` verde. Tokens novos só em `src/styles.css` `@theme` (`--agora-hue-*`, chrome em px). `group-style.ts` continua a joia do dock; `groups.ts` continua o wash. Sem fundir as duas funções `groupStyle`.

**Tech Stack:** TanStack Start, Tailwind v4 `@theme`, React 19, `node --test` em `scripts/**/*.test.mjs`. Sem dependência nova. Sem pasta extra.

## Global Constraints

- PT-BR; Conventional Commits; branch `fix/design-system-hardening`.
- TDD: teste vermelho (ou regex de contrato) antes do CSS/TS, salvo ajuste mecânico de assert que o próprio passo documenta.
- Sem dependência nova. Sem pasta extra (`tokens/`, `design-system/`, Storybook, CVA).
- Nunca ler/colar `.env` ou secrets. Sem `db:migrate`, compose, deploy.
- Chips `[data-group-chip]` **32px**. Tap IA/menu/nav **44px**.
- Não fundir `groupStyle` de `group-style.ts` com o de `groups.ts`.
- Cor de grupo **continua identidade** (joia no dock, wash no card). Não achar o dock a só ink/paper-2.
- Auto-land GitHub depois dos gates da fatia; **deploy só com OK explícito**.

## Cruzada (2026-08-26)

| Especialista | Entra neste ciclo | Rejeitado |
|---|---|---|
| Design director | matiz única; joia/wash; first paint; tag ≥11px | Button/Toast/DESIGN.md |
| Implementação frontend | `@theme` v4; critical ≤3000; testes de source | pasta tokens; apagar `chip:` |
| Acessibilidade | dark 1.4.11; Input; toggle | chip 44px (2.5.5 é AAA) |
| Produto / YAGNI | ciclo estreito no idioma de grupo | fundir módulos; varrer type do chrome |

Spec: `docs/superpowers/specs/2026-08-26-design-system-hardening-design.md`

## Mapa de arquivos

| Fatia | Cria | Altera | Teste |
|---|---|---|---|
| T1 first paint + header | — | `critical.css.ts`, `styles.css`, `theme.ts` se hex divergir | `simplification-contract`, `theme-boot`, `accessibility-contract`, `grok-fontes-restore` |
| T2 matiz + dark 1.4.11 | — | `styles.css`, `group-style.ts`, `groups.ts` | `group-style` + asserts de hue; medir chip dark |
| T3 GroupTag | — | `group-tag.tsx`, `phone-layout.css` se preciso | `group-style` (tag sem 9px) |
| T4 Input + toggle | — | `input.tsx`, `settings-ui.tsx` | `accessibility-contract` |

---

### Task 1: First paint alinhado + header 64px

**Por quê:** `critical.css.ts` pinta `#e8e2d6` e `#6e695d`, que não são `--color-paper-2` / `--color-mute`. `@theme` tem `--agora-header: 3.75rem` (60px @ 16px); `phone-layout.css` e o fixture de `fixed-chrome` usam **64px**.

**Files:**
- Modify: `src/lib/news/critical.css.ts`
- Modify: `src/styles.css` (só `--agora-header`)
- Modify: `scripts/grok-fontes-restore.test.mjs` (assert do header)
- Test: `scripts/simplification-contract.test.mjs`, `scripts/theme-boot.test.mjs`, `scripts/accessibility-contract.test.mjs`

**Interfaces:**
- Consome: `--color-paper`, `--color-paper-2`, `--color-ink`, `--color-mute`, `--color-line`, `--color-card` (valores atuais light/dark em `styles.css`)
- Produz: `CRITICAL_CSS` ainda string única; `Buffer.byteLength(CRITICAL_CSS) <= 3000` (hoje **2615**)

- [ ] **Step 1: RED — header 64px quebra o contrato antigo**

Em `scripts/grok-fontes-restore.test.mjs`, trocar:

```js
assert.match(css, /--agora-header:\s*3\.75rem/);
```

por:

```js
assert.match(css, /--agora-header:\s*64px/);
```

Run: `node --experimental-strip-types --test scripts/grok-fontes-restore.test.mjs`
Expected: FAIL no match `3.75rem`

- [ ] **Step 2: GREEN — `@theme` e critical usam a mesma superfície**

`src/styles.css`:

```css
--agora-header: 64px;
```

Em `critical.css.ts`, declarar `:root`/`.dark` com os **mesmos** hex do `@theme` e pintar chrome/story com `var(--color-paper)` etc. Substituir `#e8e2d6` por `var(--color-paper-2)` (ou o hex `#e7e1d3` se `var()` estourar o orçamento — os dois sítios têm de coincidir). Substituir `#6e695d` por `var(--color-mute)` / `#686257`.

Não importar `phone-layout`. Não adicionar `?raw`.

- [ ] **Step 3: Verificar contratos**

```bash
node --experimental-strip-types -e "import { CRITICAL_CSS } from './src/lib/news/critical.css.ts'; console.log(Buffer.byteLength(CRITICAL_CSS))"
node --experimental-strip-types --test scripts/grok-fontes-restore.test.mjs scripts/simplification-contract.test.mjs scripts/theme-boot.test.mjs scripts/accessibility-contract.test.mjs
```

Expected: bytes ≤ 3000; testes PASS. `theme-boot` e `accessibility-contract` ainda encontram `#f2eee4` / `#12100e` no source de `theme.ts`.

- [ ] **Step 4: `npm test` + commit**

```bash
npm test
git add src/lib/news/critical.css.ts src/styles.css scripts/grok-fontes-restore.test.mjs
git commit -m "$(cat <<'EOF'
fix(ui): align critical CSS and header token with theme

EOF
)"
```

---

### Task 2: Uma matiz, dois tratamentos, dark 1.4.11

**Por quê:** `labs` no dock é joia `#3d3a2e`; o mesmo `labs` no wash é `#8a7a2e` mixado. No dark a joia vs paper fica **1,45–2,58:1** (falha 1.4.11).

**Files:**
- Modify: `src/styles.css` (`--agora-hue-labs` … `--agora-hue-novos`; overrides `.dark` se a joia precisar clarear)
- Modify: `src/lib/news/group-style.ts` (`chip`/`chipOn`/`tag` passam a `bg-[color-mix(...var(--agora-hue-*)...)]` **mantendo as chaves `chip:` / `chipOn:` / `tag:`**)
- Modify: `src/lib/news/groups.ts` (`TONE`/`SOFT`/`pip` usam a mesma `var(--agora-hue-*)`)
- Modify: `scripts/group-style.test.mjs`

**Interfaces:**
- Consome: `groupStyle(id)` em `app-chrome.tsx` e `group-tag.tsx` (não mudar a assinatura nesta fatia)
- Produz: `--agora-hue-labs|lideres|pesquisa|imprensa|builders|novos` no `@theme`

Não prefixar `--color-hue-*` (Tailwind geraria utilitários mortos). Não apagar `ALIAS` / `TONE_ALIAS` nesta fatia.

- [ ] **Step 1: RED — contrato exige hue no tema**

Acrescentar em `scripts/group-style.test.mjs`:

```js
test("group hues live in @theme and both palettes consume them", () => {
  const theme = readFileSync(join(root, "src/styles.css"), "utf8");
  const jewel = readFileSync(join(root, "src/lib/news/group-style.ts"), "utf8");
  const wash = readFileSync(join(root, "src/lib/news/groups.ts"), "utf8");
  for (const g of ["labs", "lideres", "pesquisa", "imprensa", "builders", "novos"]) {
    assert.match(theme, new RegExp(`--agora-hue-${g}:`));
    assert.match(jewel, new RegExp(`var\\(--agora-hue-${g}\\)`));
    assert.match(wash, new RegExp(`var\\(--agora-hue-${g}\\)`));
  }
});
```

Os asserts atuais (`chip:`, `chipOn:`, `st.chip`, `st.tag`, sem `dot:` / `groupPip` na tag) **permanecem**.

Run: `node --experimental-strip-types --test scripts/group-style.test.mjs`
Expected: FAIL no novo teste

- [ ] **Step 2: GREEN — tokens + consumidores**

Em `@theme` e `.dark`, definir as seis hues. Joia = `color-mix` da hue com `--color-hero` / `--color-ink` (ajuste no `.dark` até o retângulo do chip ≥ 3:1 contra `--color-paper`). Wash = `color-mix` da **mesma** hue com `--color-paper-2`. Pip = `var(--agora-hue-*)`.

`app-chrome.tsx` e `group-tag.tsx` não mudam de API nesta fatia.

- [ ] **Step 3: Medir contraste dark (browser ou CDP)**

Abrir o app em dark. Medir `getComputedStyle` do `[data-group-chip]` (off e on) vs `--color-paper`. Se < 3:1, clarear hue dark ou acrescentar `ring` opaco — não opacity.

- [ ] **Step 4: `npm test` + commit**

```bash
npm test
git add src/styles.css src/lib/news/group-style.ts src/lib/news/groups.ts scripts/group-style.test.mjs
git commit -m "$(cat <<'EOF'
fix(ui): one group hue, jewel dock and wash elsewhere

EOF
)"
```

---

### Task 3: GroupTag legível + wash no card

**Por quê:** `text-[9px]` / `h-4` no desktop; no phone `[data-group]` já força `0.875rem`. A tag usa a joia do dock (`st.tag`) e some no card dark.

**Files:**
- Modify: `src/components/news/group-tag.tsx`
- Modify: `scripts/group-style.test.mjs` (banir `text-[9px]`)

**Interfaces:**
- Consome: `hasGroupStyle` / `groupStyle` (jewel) e `customGroupStyle` (wash) — **inverter**: tag do card usa wash (`customGroupStyle` / `groups.ts`) mesmo para grupos do catálogo; joia fica só no dock
- Produz: tipo `text-[length:var(--agora-kicker,0.6875rem)]` ou `text-[0.6875rem]`; `min-h` ~20px; sem `h-4` de 16px

Cuidado: `scripts/group-style.test.mjs` hoje exige `st.tag` em `group-tag.tsx`. Se a tag deixar de ler `st.tag`, **atualizar o teste no mesmo PR** para exigir wash (`customGroupStyle` / `style=`) e continuar proibindo `groupPip` / `st.dot`.

- [ ] **Step 1: RED — banir 9px**

```js
test("group tag is at least 11px rem and not jewel-on-card", () => {
  const src = readFileSync(join(root, "src/components/news/group-tag.tsx"), "utf8");
  assert.doesNotMatch(src, /text-\[9px\]/);
  assert.match(src, /0\.6875rem|agora-kicker|0\.875rem/);
});
```

Run: `node --experimental-strip-types --test scripts/group-style.test.mjs`
Expected: FAIL

- [ ] **Step 2: GREEN — tag wash + rem**

`group-tag.tsx`: pintar com `customGroupStyle(id)` (wash). Remover `st.tag` joia. Tipo em rem ≥ 11px. Manter `data-group={id}`.

Se `--agora-kicker` ainda não existir, adicionar em `@theme`: `--agora-kicker: 0.6875rem;`

- [ ] **Step 3: `npm test` + commit**

```bash
npm test
git add src/components/news/group-tag.tsx src/styles.css scripts/group-style.test.mjs
git commit -m "$(cat <<'EOF'
fix(ui): readable group tags use wash, not 9px jewel

EOF
)"
```

---

### Task 4: Input e SettingsToggle (a11y de primitivo)

**Por quê:** borda `line`/`card` ~1,2–1,5:1; sem `aria-invalid`. Toggle off `paper-2` em `paper` ~1,1:1; `busy` só em ARIA.

**Files:**
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/news/settings-ui.tsx`
- Modify: `scripts/accessibility-contract.test.mjs`

**Interfaces:**
- Consome: `aria-invalid`, `aria-describedby`, `disabled` já nativos do `<input>` / botão
- Produz: classes `aria-invalid:border-mark aria-invalid:ring-mark/40`; borda default `border-line-strong` (ou `border-ink/30`); toggle `disabled:opacity-60` + trilho off `bg-line-strong`

Não criar Toast. Páginas que já têm `role="alert"` (login, buscar) só passam a setar `aria-invalid` no campo — se o passo ficar grande, faça só o primitivo e um assert de source.

- [ ] **Step 1: RED — contrato lê os primitivos**

Em `scripts/accessibility-contract.test.mjs`, acrescentar leitura de `input.tsx` e `settings-ui.tsx`:

```js
assert.match(inputSrc, /aria-invalid:border-mark/);
assert.match(inputSrc, /border-line-strong|border-ink\/30/);
assert.match(toggleSrc, /disabled:opacity-60|disabled:opacity-50/);
assert.match(toggleSrc, /bg-line-strong|bg-ink\/25/);
```

Run: `node --experimental-strip-types --test scripts/accessibility-contract.test.mjs`
Expected: FAIL

- [ ] **Step 2: GREEN — classes nos primitivos**

`Input`: manter `h-10`, `rounded-sm`, `focus-visible` existente; trocar `border-line` por borda ≥ 3:1; adicionar `aria-invalid:border-mark`.

`SettingsToggle`: trilho off contrastado; `disabled:opacity-60`; manter `role="switch"` e `aria-busy`.

- [ ] **Step 3: `npm test` + commit**

```bash
npm test
git add src/components/ui/input.tsx src/components/news/settings-ui.tsx scripts/accessibility-contract.test.mjs
git commit -m "$(cat <<'EOF'
fix(a11y): input invalid state and visible toggle off/busy

EOF
)"
```

---

## Depois (não neste ciclo)

- DRY de `ALIAS` / `TONE_ALIAS` sem fundir `groupStyle`
- Trocar `h-[32px]` por `h-[var(--agora-chip-h)]` (quebra regex de `fixed-chrome` / `app-chrome` — PR próprio)
- Playwright `getComputedStyle` de chip dark no smoke (hoje o contrato a11y é source)
- `DESIGN.md` só se o dono pedir documentação, não como pré-requisito

## Verificação final

```bash
npm test
npm run typecheck
npm run lint
```

Números do audit (re-medir se citar): hex fora do `@theme`, `text-[9px]`, `CRITICAL_CSS` bytes, `--agora-header`.
