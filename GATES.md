# Gates: fix YouTube channel avatar broken images

Scope: Corrigir URLs mortas no YOUTUBE_SEED, fallback onError nos avatares, e garantir que o catálogo prevaleça sobre cache morto — nenhum canal exibe ícone de imagem quebrada.

- [x] G1: Todos os 26 avatares do YOUTUBE_SEED retornam HTTP 200
  CHECK: node scripts/youtube-avatar-live.mjs
  EXPECT: OK 26/26
  EVIDENCE: OK	Canaltech	200	8144 | OK 26/26

- [x] G2: Machine Learning Street Talk e Two Minute Papers têm URLs distintas e válidas no seed
  CHECK: node -e "import{YOUTUBE_SEED}from'./src/lib/news/youtube-catalog.mjs';const a=YOUTUBE_SEED.filter(c=>/Machine Learning Street Talk|Two Minute Papers/.test(c.title));if(a.length!==2)throw0;for(const c of a){if(!c.avatar.includes('yt3.googleusercontent.com'))throw0;console.log(c.title+':'+c.avatar.slice(0,60));}console.log('TARGETS_OK');"
  EXPECT: TARGETS_OK
  EVIDENCE: Machine Learning Street Talk:https://yt3.googleusercontent.com/15Akj76BG8IsM5ctgqVwKXArl6 | TARGETS_OK

- [x] G3: StoryCard, ArticleView e FeedProfilePopup têm onError + referrerPolicy no avatar
  CHECK: node --test scripts/youtube-avatar.test.mjs
  EXPECT: pass 6
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 51.72053

- [x] G4: resolveFace / pipeline YouTube preferem avatar do catálogo sobre URL morta
  CHECK: node --test scripts/youtube-avatar.test.mjs
  EXPECT: catalog preferred
  EVIDENCE: catalog preferred | pass 6

- [x] G5: npm test, typecheck e lint passam
  CHECK: npm test && npm run typecheck && npm run lint
  EXPECT: fail 0
  EVIDENCE: > lint | > eslint . --max-warnings=0
