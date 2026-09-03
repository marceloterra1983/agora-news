# Gates: Foto de Perfil, Vídeo no Popup e Thumbnail no Feed para YouTube

Scope: Adicionar avatares reais aos 26 canais do YouTube, carregar o player de vídeo dentro do popup FeedStoryPopup e exibir thumbnail com play badge na frente do texto no feed.

- [x] G1: youtubeAvatarFor retorna avatar real do canal e resolveFace exibe a foto do perfil sem fallback M
  CHECK: node --experimental-strip-types --test scripts/youtube-avatar.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 57.269271

- [x] G2: YouTubeEmbed suporta autoPlay/autoLoad no FeedStoryPopup para reproduzir vídeo direto no popup
  CHECK: node --experimental-strip-types --test scripts/youtube-popup.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 64.075492

- [x] G3: StoryCard renderiza thumbnail de vídeo na frente do texto para posts do YouTube no feed
  CHECK: node --experimental-strip-types --test scripts/youtube-card-layout.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 92.89189

- [x] G4: suite completa de testes, typecheck e lint passam 100% verdes sem regressões
  CHECK: npm test && npm run typecheck && npm run lint
  EXPECT: /eslint \. --max-warnings=0/
  EVIDENCE: > lint | > eslint . --max-warnings=0
