# Gates: Player de Vídeo Visível com data-images="off" no Popup

Scope: Quando o usuário ativa "Ocultar fotos" (ícone com barra na barra superior / data-images="off"), o player de vídeo do YouTube no popup do feed NÃO PODE ser ocultado.

- [x] G1: Causa raiz comprovada e documentada com reprodução exata
  CHECK: test -f /tmp/agora-yt-popup-images-off.txt && grep -E 'ROOT_CAUSE|PATH' /tmp/agora-yt-popup-images-off.txt
  EXPECT: /ROOT_CAUSE/
  EVIDENCE: PATH: FeedStoryPopup -> ArticleView -> StoryAssetBlock -> YouTubeEmbed | ROOT_CAUSE: In src/styles.css, 'html[data-images="off"] [data-media]' sets 'display: none !important'. In ArticleView all story assets were wrapped in <div data-media="">. When user toggled 'Ocultar fotos', data-images="off" was active, hiding the video player in the popup!

- [x] G2: Teste automatizado falha no estado quebrado e passa no fix
  CHECK: node --experimental-strip-types --test scripts/youtube-popup-images-off.test.mjs
  EXPECT: /pass 3/
  EVIDENCE: ℹ pass 3 | ℹ fail 0 | ℹ duration_ms 42.375475

- [x] G3: Suite de testes completa, typecheck e lint verdes
  CHECK: npm test && npm run typecheck && npm run lint
  EXPECT: /eslint \. --max-warnings=0/
  EVIDENCE: ℹ pass 589 | ℹ fail 0 | ℹ skipped 11 | eslint . --max-warnings=0 clean

- [x] G4: Validação no browser: com data-images="off", popup do YouTube renderiza player com altura > 0
  CHECK: node --experimental-strip-types --test scripts/youtube-popup-player.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ pass 3 | ℹ fail 0 | browser verified with rect 640x360

- [x] G5: Validação de não-regressão: contratos de fotos e showImages continuam passando
  CHECK: node --experimental-strip-types --test scripts/show-images-settings.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ pass 5 | ℹ fail 0 | ℹ duration_ms 73.437764

- [ ] G6: PR mergeado na main + deploy prod; relatório com URL, tag news-news:<head> e rollback
  EVIDENCE: pending
