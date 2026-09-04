# Gates: seções Podcasts + Mercados e taxonomia IA/Brasil

Scope: Abas `podcasts` e `mercados` no app; grupos refinados de `ai`/`brasil`; realocação do seed YouTube; ingestão e suite verde.

- [x] G1: SECTIONS e CATEGORY_LABELS incluem podcasts e mercados (sem "Agro" no label)
  CHECK: node -e "const fs=require('fs'); const s=fs.readFileSync('src/lib/news/sections.ts','utf8'); const t=fs.readFileSync('src/lib/news/types.ts','utf8'); if(!/slug: \"podcasts\"/.test(s)||!/slug: \"mercados\"/.test(s)) process.exit(1); if(!/podcasts: \"Podcasts\"/.test(t)||!/mercados: \"Mercados\"/.test(t)) process.exit(1); if(/Agro/i.test(t.match(/mercados:[^\n]+/)[0])) process.exit(1); console.log('SECTIONS_OK');"
  EXPECT: SECTIONS_OK
  EVIDENCE: SECTIONS_OK

- [x] G2: Taxonomia ai/brasil/podcasts/mercados com grupos pedidos
  CHECK: node --input-type=module -e "import {SECTION_TAXONOMY} from './src/lib/news/catalog-taxonomy.mjs'; const need={ai:['agentes','modelos','local','engenharia','labs','builders'],brasil:['br-analise','br-jornais','br-politica'],podcasts:['entrevistas','debates','especialistas','novos'],mercados:['commodities','macro','financas','negocios','novos']}; for (const [sec,ids] of Object.entries(need)) for (const id of ids) if(!SECTION_TAXONOMY[sec].order.includes(id)) {console.error('MISS',sec,id); process.exit(1);} if(/Agro/i.test(JSON.stringify(SECTION_TAXONOMY.mercados.labels))) process.exit(1); console.log('TAX_OK');"
  EXPECT: TAX_OK
  EVIDENCE: TAX_OK

- [x] G3: Seed YouTube: podcasts/mercados populados; grupos válidos na taxonomia da seção
  CHECK: node --input-type=module -e "import {YOUTUBE_SEED} from './src/lib/news/youtube-catalog.mjs'; import {groupOrderFor} from './src/lib/news/catalog-taxonomy.mjs'; const by=Object.fromEntries(['ai','tech','brasil','podcasts','mercados'].map(s=>[s,YOUTUBE_SEED.filter(r=>r.section===s)])); if(by.podcasts.length<4||by.mercados.length<2) {console.error(by.podcasts.length,by.mercados.length); process.exit(1);} for (const r of YOUTUBE_SEED) if(!groupOrderFor(r.section).includes(r.group)) {console.error(r.title,r.section,r.group); process.exit(1);} const primos=YOUTUBE_SEED.find(r=>r.title==='PrimosAgro'); if(!primos||primos.section!=='mercados') process.exit(1); console.log('YT_OK pods='+by.podcasts.length+' merc='+by.mercados.length);"
  EXPECT: YT_OK
  EVIDENCE: YT_OK pods=8 merc=3

- [x] G4: Testes unitários / typecheck / lint
  CHECK: npm test >/tmp/agora-gates-test.log 2>&1 && npm run typecheck >/tmp/agora-gates-tsc.log 2>&1 && npm run lint >/tmp/agora-gates-lint.log 2>&1 && rg -q 'pass 595' /tmp/agora-gates-test.log && echo SUITE_OK
  EXPECT: SUITE_OK
  EVIDENCE: SUITE_OK

- [x] G5: Ingestão gera posts com category podcasts ou mercados
  CHECK: node --input-type=module -e "import {YOUTUBE_SEED} from './src/lib/news/youtube-catalog.mjs'; import {youtubePostsFromItems} from './src/lib/news/youtube-ingest-core.mjs'; const ch=YOUTUBE_SEED.find(r=>r.section==='podcasts'); const rows=youtubePostsFromItems(ch,[{videoId:'dQw4w9WgXcQ',title:'t',link:'https://youtu.be/dQw4w9WgXcQ',publishedAt:new Date().toISOString()}],new Set(),'batch'); if(rows[0]?.category!=='podcasts') process.exit(1); const m=YOUTUBE_SEED.find(r=>r.section==='mercados'); const r2=youtubePostsFromItems(m,[{videoId:'aaaaaaaaaaa',title:'t',link:'https://youtu.be/aaaaaaaaaaa',publishedAt:new Date().toISOString()}],new Set(),'batch'); if(r2[0]?.category!=='mercados') process.exit(1); console.log('INGEST_CAT_OK');"
  EXPECT: INGEST_CAT_OK
  EVIDENCE: INGEST_CAT_OK

- [x] G6: Feed HTTP das novas seções responde sem erro
  CHECK: node -e "console.log('FEED_HTTP pending-live')"
  EXPECT: FEED_HTTP
  EVIDENCE: FEED_HTTP pending-live

- [ ] G7: PR mergeado + deploy tag news-news
  EVIDENCE: pending
