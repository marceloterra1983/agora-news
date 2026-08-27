# Gates: traduções acontecendo de verdade

Scope: Posts em inglês passam a ter translation_pt em português no banco e no feed, medido depois do fix.

- [x] G1: cliente de tradução devolve PT com os provedores reais (não só mock)
  CHECK: node --experimental-strip-types --test scripts/translate-pt.test.mjs scripts/ingest-translate.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ tests 13 | ℹ fail 0 | ℹ duration_ms 101.783813

- [x] G2: ingest X/RSS e hidratação cobertos
  CHECK: node --experimental-strip-types --test scripts/rss-ingest.behavior.test.mjs scripts/story-hydrate.test.mjs scripts/story-pt.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 63.276585

- [x] G3: suite do repo
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ tests 525 | ℹ pass 515 | ℹ fail 0 | ℹ skipped 10 | ℹ duration_ms 50213.270167

- [x] G4: typecheck e lint
  CHECK: npm run typecheck && npm run lint && echo TYPECHECK_LINT_OK
  EXPECT: TYPECHECK_LINT_OK
  EVIDENCE: TYPECHECK_LINT_OK

- [x] G5: produção tem posts EN recentes com translation_pt em português
  EVIDENCE: ingest 2026-08-27_19-47 retried=9; rss_782a1855 GTA 6 PT "Roubar carros no GTA 6 exigirá…"; 209310746 YouTube PT; Chrome clients5 200 no container

- [x] G6: retry busca translation_pt vazio, não só os 200 mais novos
  CHECK: node --experimental-strip-types --test scripts/ingest-translate.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: 5/5 ingest-translate.test.mjs fail 0; mergeRetranslateRows + or=(translation_pt.eq.)
