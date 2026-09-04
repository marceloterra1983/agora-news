# Gates: integrar inscrições YouTube do Takeout ao YOUTUBE_SEED

Scope: Baixar o Takeout compartilhado, selecionar canais relevantes (IA/Tech/Brasil), adicionar ao `YOUTUBE_SEED` com avatares válidos, validar ingestão, landar e publicar.

- [x] G1: CSV de inscrições do Takeout lido e contabilizado
  CHECK: test -f /tmp/yt-subs/all-channels.json && node -e "const a=require('/tmp/yt-subs/all-channels.json'); console.log('CHANNELS='+a.length)"
  EXPECT: CHANNELS=856
  EVIDENCE: CHANNELS=856

- [x] G2: Novos canais no YOUTUBE_SEED com section/group válidos da taxonomia
  CHECK: node -e "import{YOUTUBE_SEED}from'./src/lib/news/youtube-catalog.mjs';import{groupOrderFor}from'./src/lib/news/catalog-taxonomy.mjs';const n=YOUTUBE_SEED.length;for(const r of YOUTUBE_SEED){const a=groupOrderFor(r.section);if(!a.includes(r.group))throw new Error(r.title+':'+r.group);}console.log('SEED='+n+' TAXONOMY_OK');"
  EXPECT: TAXONOMY_OK
  EVIDENCE: SEED=50 TAXONOMY_OK

- [x] G3: Todos os avatares do YOUTUBE_SEED retornam HTTP 200 + image
  CHECK: node scripts/youtube-avatar-live.mjs
  EXPECT: /OK \d+\/\d+/
  EVIDENCE: OK	Asimov Academy	200	3083 | OK 50/50

- [x] G4: Feeds Atom dos novos canais respondem e têm entries
  CHECK: node scripts/youtube-new-channels-ingest-check.mjs
  EXPECT: FEEDS_OK
  EVIDENCE: OK	Asimov Academy	15 | FEEDS_OK 24/24

- [ ] G5: npm test, typecheck e lint passam
  CHECK: npm test && npm run typecheck && npm run lint
  EXPECT: fail 0
  EVIDENCE: pending

- [ ] G6: PR mergeado na main e deploy prod executado
  EVIDENCE: pending
