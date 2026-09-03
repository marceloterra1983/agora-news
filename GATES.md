# Gates: Correção da Data de Publicação dos Vídeos do YouTube

Scope: Extrair a data de publicação real e exata (datePublished) da página do vídeo no YouTube em vez do timestamp da coleta, reparar posts no Supabase e garantir precisão na contagem "há...".

- [x] G1: fetchVideoPublishedAt extrai a data ISO real a partir de itemprop datePublished / uploadDate / publishDate
  CHECK: node --experimental-strip-types --test scripts/youtube-date.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 55.560818

- [x] G2: youtube-ingest utiliza a data real de publicação nos vídeos e nunca usa timestamp sintético de coleta
  CHECK: node --experimental-strip-types --test scripts/youtube-fallback-ingest.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 70.112513

- [x] G3: suite completa de testes, typecheck e lint passam 100% verdes sem regressões
  CHECK: npm test && npm run typecheck && npm run lint
  EXPECT: /eslint \. --max-warnings=0/
  EVIDENCE: > lint | > eslint . --max-warnings=0
