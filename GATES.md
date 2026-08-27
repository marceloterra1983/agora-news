# Gates: traduções dos posts

Scope: Pipeline de tradução PT dos posts (ingest X/RSS + hidratação + persistência) volta a gravar e exibir português, sem fail-open de inglês.

- [x] G1: fail-open do GTX não persiste inglês em translation_pt
  CHECK: node --experimental-strip-types --test scripts/translate-pt.test.mjs scripts/story-pt.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 1088.344104

- [x] G2: ingest X e RSS só upsertam translation_pt quando o texto parece português
  CHECK: node --experimental-strip-types --test scripts/ingest-correctness.behavior.test.mjs scripts/rss-ingest.behavior.test.mjs scripts/ingest-translate.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 787.649293

- [x] G3: hydrateStory retraduz corpo inglês persistido
  CHECK: node --experimental-strip-types --test scripts/story-hydrate.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 70.071529

- [x] G4: testes do repo passam
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 8775.387925

- [x] G5: typecheck/lint do diff TS/JS passam
  CHECK: npm run typecheck && npm run lint && echo TYPECHECK_LINT_OK
  EXPECT: TYPECHECK_LINT_OK
  EVIDENCE: > eslint . --max-warnings=0 | TYPECHECK_LINT_OK
