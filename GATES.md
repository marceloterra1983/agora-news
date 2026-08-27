# Gates: RSS no mesmo card das contas X

Scope: Fontes mistura RSS e X na mesma lista, com foto, grupo, descrição e últimos posts.

- [x] G1: seedFontes e mergeRssFontes incluem r_* com avatar e grupo
  CHECK: node --experimental-strip-types --test scripts/fontes-rss-mix.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 62.005109

- [x] G2: lastPostHref de r_* aponta para /materia, nunca x.com
  CHECK: node --experimental-strip-types --test scripts/last-post-behavior.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 52.297774

- [x] G3: fontes.tsx lista RSS na ol principal; Sites não duplica o seed editorial
  CHECK: node --experimental-strip-types --test scripts/fontes-rss-mix.test.mjs
  EXPECT: Fontes
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 77.251447

- [x] G4: fontes.tsx ≤ 300 e fontes-sort.ts ≤ 200
  CHECK: node --experimental-strip-types --test scripts/split-pages.test.mjs
  EXPECT: buscar and fontes routes stay under 300 lines
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 73.507601

- [x] G5: npm test passa
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 7449.453502

- [x] G6: typecheck e lint nos arquivos tocados
  CHECK: npx tsc --noEmit && npx eslint src/lib/news/rss-catalog.mjs src/lib/news/fontes-sort.ts src/lib/news/influence.ts src/lib/news/last-post-core.mjs src/routes/fontes.tsx src/components/news/fontes-sites.tsx src/components/news/fonte-profile-card.tsx src/components/news/fontes-profile-row.tsx scripts/fontes-rss-mix.test.mjs --max-warnings=0 && echo TYPE_LINT_OK
  EXPECT: TYPE_LINT_OK
  EVIDENCE: TYPE_LINT_OK
