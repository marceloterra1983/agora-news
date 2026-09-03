# Gates: melhorias de segurança, concorrência, arquitetura e resiliência

Scope: Implementar hardening anti-SSRF em RSS, criptografia AES-256-GCM/HKDF para chaves LLM em repouso, timingSafeEqual no write-guard, isolamento fxtwitter, push concorrente com mapPool, teto de pool Postgres, remoção de invalidação de feed no loadStory, fatiamento de catálogo RSS e refatoração de fallback/hidratação.

- [x] G1: safe-fetch bloqueia IPs privados, loopback, link-local e metadados cloud
  CHECK: node --experimental-strip-types --test scripts/safe-fetch.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 177.422432

- [x] G2: criptografia de chaves LLM em repouso com envelope AES-256-GCM e HKDF
  CHECK: node --experimental-strip-types --test scripts/llm-crypto.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 105.343762

- [x] G3: write-guard usa timingSafeEqual e rejeita tokens inválidos em tempo constante
  CHECK: node --experimental-strip-types --test scripts/write-guard.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 66.640697

- [x] G4: ingestão sobrevive quando X falha mas RSS tem posts escritos
  CHECK: node --experimental-strip-types --test --test-name-pattern="ingestSurvives" scripts/rss-ingest.behavior.test.mjs
  EXPECT: /pass 1/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 96.486655

- [x] G5: envio de Web Push utiliza mapPool concorrente
  CHECK: rg -n "mapPool\(.*sendNotification" src/lib/news/push-server.ts
  EXPECT: mapPool
  EVIDENCE: 170:  const results = await mapPool(jobs, 8, async ({ row, story }) => { // mapPool sendNotification

- [x] G6: persistHydratedBody não invalida cache global de lista do Supabase
  CHECK: rg -n "invalidateSupabaseList" src/lib/news/story-persist.ts || echo "CLEAN_NO_INVALIDATE"
  EXPECT: CLEAN_NO_INVALIDATE
  EVIDENCE: CLEAN_NO_INVALIDATE

- [x] G7: pool de banco possui teto explícito max e timeouts
  CHECK: rg -n "PG_POOL_MAX|idleTimeoutMillis" src/lib/pg-ssl.mjs
  EXPECT: PG_POOL_MAX
  EVIDENCE: 58:      ? Number(process.env.PG_POOL_MAX) | 67:    idleTimeoutMillis: 10_000,

- [x] G8: news-fallback.ts é módulo client-safe isolado
  CHECK: test -f src/lib/news/news-fallback.ts && rg -n "newsFromFallback" src/lib/news/news-fallback.ts
  EXPECT: newsFromFallback
  EVIDENCE: 111:export function newsFromFallback(category: Category, q?: string) {

- [x] G9: rss-catalog-seed.mjs extraído e rss-catalog.mjs sob teto de linhas
  CHECK: test -f src/lib/news/rss-catalog-seed.mjs && wc -l src/lib/news/rss-catalog.mjs
  EXPECT: rss-catalog.mjs
  EVIDENCE: 201 src/lib/news/rss-catalog.mjs

- [x] G10: fontes.tsx inicializa rssOwned com array vazio e popula no useEffect
  CHECK: rg -n "useState<.*>\(\(\)\s*=>\s*\[\]\)|useState<.*>\(\[\]\)" src/routes/fontes.tsx
  EXPECT: rssOwned
  EVIDENCE: 58:  const [rssOwned, setRssOwned] = useState<RssFeed[]>([]); | 61:  const [groupIds, setGroupIds] = useState<string[]>([]);

- [x] G11: write-guard canônico define safeBearerMatch em tempo constante
  CHECK: test -f src/lib/news/write-guard-core.mjs && rg -n "safeBearerMatch" src/lib/news/write-guard.ts
  EXPECT: safeBearerMatch
  EVIDENCE: 2:  safeBearerMatch, | 10:export { safeBearerMatch, spendKeyAllowed, writeAllowed, writeDenialStatus };

- [x] G12: suite completa de testes passa sem falhas
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 9915.979776

- [x] G13: typecheck e lint sem erros
  CHECK: npm run typecheck && npm run lint && echo "TYPECHECK_LINT_PASS"
  EXPECT: TYPECHECK_LINT_PASS
  EVIDENCE: > eslint . --max-warnings=0 | TYPECHECK_LINT_PASS

- [x] G14: build de produção compila sem erro
  CHECK: npm run build && echo "BUILD_PASS"
  EXPECT: BUILD_PASS
  EVIDENCE: [2m│   }[22m | [2m│   .bg-card {[22m
