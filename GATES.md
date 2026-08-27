# Gates: Fontes respeita o recorte X/RSS

Scope: Os botões X/RSS do chrome também recortam a lista de Fontes e o bloco Sites.

- [x] G1: filterFontesByOrigin recorta contas X vs r_*
  CHECK: node --experimental-strip-types --test scripts/origin-filter.test.mjs
  EXPECT: pass
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 670.948519

- [x] G2: fontes.tsx e fontes-sites.tsx leem showX/showRss
  CHECK: node --experimental-strip-types --test scripts/origin-filter.test.mjs
  EXPECT: Fontes
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 300.038497

- [x] G3: fontes.tsx permanece ≤ 300 linhas
  CHECK: node --experimental-strip-types --test scripts/split-pages.test.mjs
  EXPECT: buscar and fontes routes stay under 300 lines
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 70.185353

- [x] G4: npm test passa
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 11724.886484

- [x] G5: typecheck e lint nos arquivos tocados
  CHECK: npx tsc --noEmit && npx eslint src/lib/news/fontes-sort.ts src/lib/news/rss-catalog.mjs src/routes/fontes.tsx src/components/news/fontes-sites.tsx scripts/origin-filter.test.mjs --max-warnings=0 && echo TYPE_LINT_OK
  EXPECT: TYPE_LINT_OK
  EVIDENCE: TYPE_LINT_OK
