# Gates: Player YouTube no popup do feed

Scope: Ao abrir um post YouTube no popup/modal do feed, o vídeo precisa aparecer para assistir (iframe ou facade clicável). RSS/X no mesmo popup não regressam.

- [x] G1: Causa raiz confirmada com evidência (código + reprodução), não chute
  CHECK: test -f /tmp/agora-yt-popup-root-cause.txt && grep -E 'ROOT_CAUSE|PATH' /tmp/agora-yt-popup-root-cause.txt
  EXPECT: /ROOT_CAUSE/
  EVIDENCE: PATH: FeedStoryPopup → ArticleView(embedded) → StoryAssetBlock(autoPlay) → YouTubeEmbed iframe youtube-nocookie.com/embed/{id} | ROOT_CAUSE: Document Referrer-Policy is same-origin (header + meta in s

- [x] G2: Teste automatizado falha no estado quebrado e passa no fix — popup/ArticleView hidrata assets YouTube e o player monta
  CHECK: node --experimental-strip-types --test scripts/youtube-popup-player.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 53.688631

- [x] G3: Suite, typecheck e lint verdes após o fix
  CHECK: npm test && npm run typecheck && npm run lint
  EXPECT: /eslint \. --max-warnings=0/
  EVIDENCE: > lint | > eslint . --max-warnings=0

- [ ] G4: Browser: feed → card YouTube → popup → vídeo assistível (iframe youtube ou facade que vira player)
  EVIDENCE: pending

- [ ] G5: Browser: RSS e X no mesmo popup continuam com mídia/conteúdo (sem regressão)
  EVIDENCE: pending

- [ ] G6: PR mergeado na main + deploy prod; relatório com URL, tag news-news:<head> e rollback
  EVIDENCE: pending
