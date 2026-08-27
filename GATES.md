# Gates: traduções acontecendo de verdade

Scope: Posts em inglês passam a ter translation_pt em português no banco e no feed, medido depois do fix.

- [x] G1: cliente de tradução devolve PT com os provedores reais (não só mock)
  CHECK: node --experimental-strip-types --test scripts/translate-pt.test.mjs scripts/ingest-translate.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 73.2426

- [x] G2: ingest X/RSS e hidratação cobertos
  CHECK: node --experimental-strip-types --test scripts/rss-ingest.behavior.test.mjs scripts/story-hydrate.test.mjs scripts/story-pt.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 63.276585

- [x] G3: suite do repo
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 5438.757252

- [x] G4: typecheck e lint
  CHECK: npm run typecheck && npm run lint && echo TYPECHECK_LINT_OK
  EXPECT: TYPECHECK_LINT_OK
  EVIDENCE: > eslint . --max-warnings=0 | TYPECHECK_LINT_OK

- [ ] G5: produção tem posts EN recentes com translation_pt em português
  EVIDENCE: pending
