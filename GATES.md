# Gates: cluster + RSS + ranking

Scope: Feed agrupa cobertura duplicada, ingere RSS como fallback e ordena com chips explícitos.

- [x] G1: Cluster puro (janela, jaccard, URL, seção, id estável)
  CHECK: node --experimental-strip-types --test scripts/story-cluster.test.mjs
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 50.981905

- [x] G2: Catálogo filtra before cluster; alsoFrom não vaza allowlist
  CHECK: node --experimental-strip-types --test scripts/catalog-feed-scope.test.mjs scripts/public-catalog-privacy.behavior.test.mjs
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 609.847745

- [x] G3: Cluster-seen e copy do card
  CHECK: node --experimental-strip-types --test scripts/cluster-seen.test.mjs
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 55.058724

- [x] G4: Parser RSS2/Atom + ids no charset X
  CHECK: node --experimental-strip-types --test scripts/rss-parse.test.mjs
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 39.63868

- [x] G5: Ingest RSS fail-closed, skip r_*, X throw + RSS write ok
  CHECK: node --experimental-strip-types --test scripts/rss-ingest.behavior.test.mjs
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 40.631663

- [x] G6: Prefs rssFeeds não morre no snapshot
  CHECK: node --experimental-strip-types --test scripts/rss-prefs.test.mjs
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 57.618761

- [x] G7: Ranking recente/seguindo/importante
  CHECK: node --experimental-strip-types --test scripts/feed-rank.test.mjs
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 40.021386

- [x] G8: avatarInFilter não alargou; PAGE_SIZE 40
  CHECK: node --experimental-strip-types --test scripts/agora-now.test.mjs scripts/account-in-filter.test.mjs
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 42.616066

- [x] G9: suíte do repo
  CHECK: npm test
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 4016.306614

- [x] G10: typecheck e lint
  CHECK: npm run typecheck && npm run lint
  EXPECT: eslint
  EVIDENCE: > lint | > eslint . --max-warnings=0
