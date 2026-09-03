# Gates: Ingestão de Último Vídeo por Canal com Fallback HTML

Scope: Implementar extração de vídeos via página do canal como fallback resiliente a 404/500 do feed XML do YouTube, alimentar o feed com o último vídeo de cada canal cadastrado e verificar ingestão.

- [x] G1: extractChannelVideosFromHtml extrai itens de lockupViewModel e videoRenderer a partir de HTML do YouTube
  CHECK: node --experimental-strip-types --test scripts/youtube-core.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 141.211489

- [x] G2: runYouTubeIngest utiliza fallback de página de canal quando feed XML retorna erro ou vazio e limita a 1 vídeo por canal
  CHECK: node --experimental-strip-types --test scripts/youtube-fallback-ingest.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 117.912913

- [x] G3: suite completa de testes, typecheck e lint passam 100% verdes sem regressões
  CHECK: npm test && npm run typecheck && npm run lint
  EXPECT: /eslint \. --max-warnings=0/
  EVIDENCE: > lint | > eslint . --max-warnings=0
