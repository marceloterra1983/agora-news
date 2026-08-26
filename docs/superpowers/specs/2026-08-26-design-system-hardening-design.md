# Design: endurecer o design system (agora-news)

Data: 2026-08-26  
Tipo: spec de hardening visual — sem feature nova  
Origem: `/design-system` audit + cruzada de 4 especialistas

## Problema

O app já tem idioma (papel/tinta, tap 44px, chip de grupo 32px, dark). O que falta é **fonte única**: tokens parciais, two paletes de grupo, first paint com hex drift, tipo de meta solto, e contraste de UI no escuro.

Audit 2026-08-26: **64/100**, 10 componentes, 14 issues. Sem Figma.

## Decisão travada (recomendação da cruzada)

**A cor continua identidade do grupo.** Dock e tags não viram só ligado/desligado `ink`/`paper-2`.

- Uma **matiz** por grupo (`--agora-hue-*`).
- Dois **tratamentos**: joia no dock; wash no card/lista/custom/pip.
- No **dark**, joia vs paper precisa **≥ 3:1** (WCAG 1.4.11). Hoje 1,45–2,58:1.
- Não fundir `groupStyle()` de `group-style.ts` com o de `groups.ts` (contrato 2026-08-20 + testes de source).
- Chips de grupo do feed **permanecem 32px**.

Se o dono quiser “cor deixa de identificar o grupo”, isso é redesign de produto — outro ciclo.

## Especialista: Design director

Veredito: não precisa de DS completo. Unificar matiz, preservar joia no dock e wash no resto. First paint = tokens. Meta em poucos degraus. Tag 9px some.

Não fazer: Button, Toast, CVA, Storybook, pasta `tokens/`, `DESIGN.md` obrigatório, chip 44px.

## Especialista: Implementação frontend

Veredito: Tailwind v4 já gera `bg-paper` a partir de `@theme`. `--agora-*` é variável crua (`h-[var(--agora-header)]`), não utilitário. Critical CSS **2615 B** / teto **3000**. Testes de source quebram se apagar `chip:`/`chipOn:`/`h-[32px]`/`3.75rem`.

Armadilhas: FOUC (critical + `THEME_BOOT_SCRIPT` + `@theme`); `!important` em `phone-layout.css`; `scripts/grok-fontes-restore.test.mjs` exige `--agora-header: 3.75rem`.

## Especialista: Acessibilidade

Veredito: texto ink/mute passa 1.4.3. Joia no dark falha **1.4.11**. `GroupTag` 9px é ilegível no desktop (phone já força 0.875rem). `Input` sem `aria-invalid`; borda `line`/`card` ~1,2–1,5:1. Toggle off some no paper. Chip 32px **não** viola WCAG 2.1 AA (2.5.5 é AAA).

## Especialista: Produto / YAGNI

Veredito: o leitor sente o dock e a tag, não a higiene de tokens. Vale um ciclo estreito no idioma de grupo. Não vale Button/Toast/DESIGN.md, fundir módulos, chip 44px, varrer `text-[11px]` do chrome.

Discordância com os outros: produto sugeriu achatar o dock a ligado/desligado. **Rejeitado neste ciclo** — ver decisão travada. First paint entra mesmo assim: drift medido (`#e8e2d6` ≠ `--color-paper-2` `#e7e1d3`; `#6e695d` ≠ `--color-mute` `#686257`).

## Fora de escopo

- Dependência nova, pasta extra, Storybook, CVA, `DESIGN.md` obrigatório
- Button / Toast / Dialog genéricos
- Fundir `groupStyle` / apagar `GROUP_STYLE`
- Chip de grupo 44px; mexer em IA/menu/tab 44px
- Ingest, auth, deploy, compose, secrets
- Hover, Title Case, empty do feed, virtualização, typefaces
- Varrer todos os `text-[11px]` (meta de chrome em px é o que segura o header quando `data-font=lg`)
- `lg`/`xl` de leitura: já são um degrau (`normalizeFontSize("xl")` → `lg`) — não reabrir

## Sucesso

1. Um hex de matiz por grupo no `@theme`; joia e wash derivam dele.
2. Dark: chip/tag UI ≥ 3:1 contra paper/card (medir no browser na fatia de grupo).
3. `GroupTag` ≥ 11px em rem; sem `text-[9px]`.
4. Critical CSS e theme-color usam os mesmos paper/ink do `@theme`; `CRITICAL_CSS` ≤ 3000 B.
5. `--agora-header` único: **64px** em `@theme` e `phone-layout`.
6. `Input` tem borda visível + `aria-invalid`. Toggle tem busy/off visível.
7. `npm test` verde. Contratos: `group-style`, `fixed-chrome`, `theme-boot`, `accessibility-contract`, `simplification-contract`, `grok-fontes-restore`.
