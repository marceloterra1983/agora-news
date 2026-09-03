# Gates: Canal de Captura e Exibição de Vídeos do YouTube

Scope: Implementar captura de vídeos do YouTube via Atom/RSS com extração de media:group, suporte a IDs e contas YouTube, switch de preferências, componente Facade Player ultraleve, sanitização Web Push, catálogo seed curado e integração resiliente na ingestão.

- [x] G1: rss-parse extrai media:description, media:thumbnail e yt:videoId para Atom/YouTube
  CHECK: node --experimental-strip-types --test scripts/youtube-parse.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 59.230913

- [x] G2: suporte a contas y_* e posts yt_* com storyIsYouTube e storySourceFromAccount sem @
  CHECK: node --experimental-strip-types --test scripts/youtube-id.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 97.006202

- [x] G3: settings e origin-filter suportam showYouTube e OriginMark exibe ícone do YouTube
  CHECK: node --experimental-strip-types --test scripts/youtube-origin.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 87.186057

- [x] G4: push-server aceita handles de canais do YouTube na sanitização de subscriptions
  CHECK: node --experimental-strip-types --test scripts/youtube-push.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 51.675688

- [x] G5: YouTubeEmbed implementa facade player com youtube-nocookie e StoryAssetBlock integra vídeos do YouTube
  CHECK: node --experimental-strip-types --test scripts/youtube-embed.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 75.878414

- [x] G6: youtube-ingest orquestra canais seed e feeds com cache ETag e integra em runIngestWithRss
  CHECK: node --experimental-strip-types --test scripts/youtube-ingest.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 58.089101

- [x] G7: suite completa de testes, typecheck e lint passam 100% verdes sem regressões
  CHECK: npm test && npm run typecheck && npm run lint
  EXPECT: /eslint \. --max-warnings=0/
  EVIDENCE: > lint | > eslint . --max-warnings=0
