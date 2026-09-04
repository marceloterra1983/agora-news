# Gates: YouTube seed from watch history

Scope: Recalibrar `YOUTUBE_SEED` pelos canais mais assistidos no Takeout (`histórico-de-visualização.html`), não só pelas 856 inscrições.

- [x] G1: Análise do Takeout documenta zip + watch-history + top canais
  CHECK: test -f /tmp/yt-subs/watch-top150.json && node -e "const a=require('/tmp/yt-subs/watch-top150.json'); if(a.length<50||!a[0].views) process.exit(1); console.log('TOP1',a[0].title,a[0].views,'N',a.length)"
  EXPECT: TOP1
  EVIDENCE: TOP1 WAR GESSO 141 N 150

- [x] G2: Catálogo inclui canais de alto consumo (Maestros da IA, PrimosAgro, Deltan, Flow)
  CHECK: node -e "import('./src/lib/news/youtube-catalog.mjs').then(({YOUTUBE_SEED:s})=>{const t=new Set(s.map(c=>c.title)); for (const n of ['Maestros da IA','PrimosAgro','Deltan Dallagnol','Flow Podcast','Inteligência Ltda','CazéTV','Waldemar Neto - Dev Lab']) { if(!t.has(n)) { console.error('MISSING',n); process.exit(1);} } console.log('WATCH_SEED_OK',s.length);})"
  EXPECT: WATCH_SEED_OK
  EVIDENCE: WATCH_SEED_OK 36

- [x] G3: Canais do seed têm avatar googleusercontent e account y_*
  CHECK: node -e "import('./src/lib/news/youtube-catalog.mjs').then(({YOUTUBE_SEED:s})=>{for(const c of s){if(!/^y_[a-f0-9]{12}$/.test(c.account)) process.exit(1); if(!String(c.avatar||'').includes('yt3.googleusercontent.com')) {console.error(c.title); process.exit(1);} const tok=c.avatar.replace(/^https:\\/\\/yt3\\.googleusercontent\\.com\\//,'').split('=')[0]; if(tok.length<40){console.error('short',c.title); process.exit(1);} } console.log('AVATARS_OK',s.length);})"
  EXPECT: AVATARS_OK
  EVIDENCE: AVATARS_OK 36

- [x] G4: Testes unitários do catálogo YouTube passam
  CHECK: node --test scripts/youtube-avatar.test.mjs scripts/youtube-fontes.test.mjs scripts/youtube-group.test.mjs scripts/youtube-id.test.mjs
  EXPECT: fail 0
  EVIDENCE: pass 19 fail 0

- [x] G4b: Suite completa, typecheck e lint passam
  CHECK: npm test && npm run typecheck && npm run lint
  EXPECT: fail 0
  EVIDENCE: > lint | > eslint . --max-warnings=0

- [x] G5: Feeds Atom/HTML dos canais de watch-history respondem
  CHECK: node scripts/youtube-watch-seed-feeds-check.mjs
  EXPECT: FEEDS_OK
  EVIDENCE: OK	CazéTV	atom	15 | FEEDS_OK 12/12
