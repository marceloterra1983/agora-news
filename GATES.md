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
