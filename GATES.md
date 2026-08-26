<<<<<<< HEAD
# Gates: improvement Now (L1 R5 F3 T1 T2 T3)

Scope: Seis fatias do plano 2026-08-26-improvement-roadmap.md em fix/improvement-now.

L1 original (await subscribe + revert ENABLED_KEY) entra em conflito com
`scripts/fontes-profile-buttons.test.mjs` (<1500ms, persist on grant).
Adaptado: copy honesta em Configurações.

- [x] G1: copy de avisos admite que nuvem exige login
  CHECK: rg -n "Entre para gravar o aviso na nuvem" src/routes/configuracoes.tsx
  EXPECT: Entre para gravar o aviso na nuvem
  EVIDENCE: 195:                  : "Contas com o sino ligado em Fontes. Entre para gravar o aviso na nuvem."
  ABANDON: G1-await-subscribe contratos fontes-profile-buttons <1500ms e persist-on-grant proíbem await+revert de ENABLED_KEY

- [x] G2: article-view não busca embed se o row já tem mídia
  CHECK: rg -n "enabled:" src/components/news/article-view.tsx
  EXPECT: enabled:
  EVIDENCE: 46:    enabled: !packed,

- [x] G3: buzz com tweetId ausente nos 12 não usa rows[0]
  CHECK: node --experimental-strip-types --test scripts/fonte-metrics.test.mjs
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 152.766704

- [x] G4: header token 64px e critical sem hex drift e8e2d6
  CHECK: rg -n -- '--agora-header:' src/styles.css && (rg -n e8e2d6 src/lib/news/critical.css.ts || echo NO_DRIFT)
  EXPECT: 64px
  EVIDENCE: 31:  --agora-header: 64px; | NO_DRIFT

- [x] G5: hues no @theme e GroupTag sem 9px
  CHECK: rg -n -- '--agora-hue-labs' src/styles.css && (rg -n "text-\[9px\]" src/components/news/group-tag.tsx || echo NO_NINE)
  EXPECT: --agora-hue-labs
  EVIDENCE: 66:  --agora-hue-labs: #c4b87a; | NO_NINE

- [x] G6: suite do repo verde
  CHECK: npm test
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 7140.265614
=======
# Gates: RSS source byline

Scope: Contas RSS `r_<hex>` aparecem no feed/matéria/perfil pelo título editorial (TecMundo), nunca como `@r_…`.

- [x] G1: Helper de byline do seed TecMundo
  CHECK: node --experimental-strip-types --test scripts/rss-source-display.test.mjs
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 149.608222

- [x] G2: Card reader e matéria usam o helper
  CHECK: rg -n "displaySourceByline" src/components/news/story-card.tsx src/components/news/article-view.tsx
  EXPECT: displaySourceByline
  EVIDENCE: src/components/news/story-card.tsx:7:import { displaySourceByline, displaySourceInitial } from "@/lib/news/rss-catalog.mjs"; | src/components/news/story-card.tsx:70:    const byline = displaySourceByl

- [x] G3: Reader não imprime mais `@{handle}` cru
  CHECK: rg -n "lowercase\">@\{handle\}" src/components/news/story-card.tsx || echo GONE
  EXPECT: GONE
  EVIDENCE: GONE

- [x] G4: Suíte do repo
  CHECK: npm test
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 16479.516479

- [x] G5: Typecheck
  CHECK: npm run typecheck && echo TYPECHECK_OK
  EXPECT: TYPECHECK_OK
  EVIDENCE: > tsc --noEmit | TYPECHECK_OK

- [x] G6: Lint dos arquivos do fix
  CHECK: npx eslint src/lib/news/rss-catalog.mjs src/lib/news/supabase.ts src/lib/news/csv.ts src/components/news/story-card.tsx src/components/news/article-view.tsx src/components/news/feed-profile-popup.tsx src/components/news/fonte-profile-card.tsx scripts/rss-source-display.test.mjs --max-warnings=0 && echo LINT_OK
  EXPECT: LINT_OK
  EVIDENCE: LINT_OK
>>>>>>> origin/main
