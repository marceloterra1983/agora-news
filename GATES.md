# Gates: YouTube AI long-form seed

Scope: Filtrar só vídeos long-form (`watch?v=`, sem `/shorts/`) do Takeout, identificar canais de IA realmente assistidos e atualizar a seção `ai` de `YOUTUBE_SEED`.

- [x] G1: Parser separa long-form de Shorts e conta ambos
  CHECK: test -f /tmp/yt-subs/ai-longform-report.json && node -e "const r=require('/tmp/yt-subs/ai-longform-report.json'); if(!(r.totals.longform>0&&r.totals.shorts>0&&r.totals.longform+r.totals.shorts===r.totals.videos)) process.exit(1); console.log('SPLIT',r.totals.longform,r.totals.shorts,r.totals.videos)"
  EXPECT: SPLIT
  EVIDENCE: SPLIT 6133 2212 8345

- [x] G2: Relatório lista vídeos long-form de IA com título + canal + ranking
  CHECK: node -e "const r=require('/tmp/yt-subs/ai-longform-report.json'); if(!r.aiLongformVideos?.length||!r.aiChannelRanking?.length) process.exit(1); console.log('AI_VIDEOS',r.aiLongformVideos.length,'AI_CHANNELS',r.aiChannelRanking.length,'TOP',r.aiChannelRanking[0].title,r.aiChannelRanking[0].longformAi)"
  EXPECT: AI_VIDEOS
  EVIDENCE: AI_VIDEOS 360 AI_CHANNELS 49 TOP Maestros da IA 40

- [x] G3: Seção ai do YOUTUBE_SEED reflete canais long-form de IA do histórico (sem watch=0 inventado)
  CHECK: node -e "import('./src/lib/news/youtube-catalog.mjs').then(({YOUTUBE_SEED:s})=>{const ai=s.filter(c=>c.section==='ai'); const r=require('/tmp/yt-subs/ai-longform-report.json'); const top=new Set((r.proposedSeed||[]).slice(0,8).map(c=>c.channelId).filter(Boolean)); const ids=new Set(ai.map(c=>c.channelId)); let hit=0; for(const id of top) if(ids.has(id)) hit++; if(ai.length<8||hit<Math.min(6,top.size)) {console.error('ai',ai.map(c=>c.title),'hit',hit); process.exit(1);} if(ids.has('UCXZCJLdBC09xxGZ6gcdrc6A')||ids.has('UCC-lyoTfSrcJzA1ab3APAgw')||ids.has('UCinWX11DB6RVJTSrI99R58w')) {console.error('ghost labs/coopertech'); process.exit(1);} console.log('AI_SEED_OK',ai.length,'overlap',hit);})"
  EXPECT: AI_SEED_OK
  EVIDENCE: AI_SEED_OK 12 overlap 8

- [x] G4: Cada canal ai tem channelId, url Atom, title, section ai, group válido, account y_*, blurb, avatar yt3
  CHECK: node -e "import('./src/lib/news/youtube-catalog.mjs').then(({YOUTUBE_SEED:s})=>{const ok=new Set(['labs','lideres','pesquisa','imprensa','builders','novos']); for(const c of s.filter(x=>x.section==='ai')){ if(!c.channelId||!c.url?.includes('feeds/videos.xml')||c.section!=='ai'||!ok.has(c.group)||!/^y_[a-f0-9]{12}$/.test(c.account)||!c.blurb||!String(c.avatar||'').includes('yt3.googleusercontent.com')) {console.error(c); process.exit(1);} } console.log('AI_FIELDS_OK');})"
  EXPECT: AI_FIELDS_OK
  EVIDENCE: AI_FIELDS_OK

- [x] G5: Avatares HTTP 200
  CHECK: node -e "import('./src/lib/news/youtube-catalog.mjs').then(async ({YOUTUBE_SEED:s})=>{const ai=s.filter(c=>c.section==='ai'); let bad=0; for(const c of ai){ const res=await fetch(c.avatar,{method:'HEAD',redirect:'follow'}); if(res.status!==200){console.error(c.title,res.status); bad++;} } if(bad) process.exit(1); console.log('AVATARS_200',ai.length);})"
  EXPECT: AVATARS_200
  EVIDENCE: AVATARS_200 12

- [x] G6: Testes unitários YouTube + suite + typecheck + lint
  CHECK: node --test scripts/youtube-avatar.test.mjs scripts/youtube-fontes.test.mjs scripts/youtube-group.test.mjs scripts/youtube-id.test.mjs && npm test && npm run typecheck && npm run lint
  EXPECT: fail 0
  EVIDENCE: > lint | > eslint . --max-warnings=0
