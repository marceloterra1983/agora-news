# Gates: ordenação por decisão do dono

Scope: (a) feed sem Recente/Seguindo/Importante — toda fonte já é "seguida",
o feed fica sempre em ordem recente; (b) Fontes volta a ordenar por chips com
rótulo (Recente/Seguidores/Grupos/Favoritos), numa linha abaixo do header,
no lugar do select no toolbar.

- [x] G1: nenhum vestígio de ordem no código de produto
  CHECK: grep -rc "FEED_ORDENS\|normalizeOrdem\|feed-ordem\|Ordenar feed\|seguindo\|importante" src/components/news/feed.tsx src/routes/index.tsx src/lib/news/feed-rank.mjs | grep -v ":0" | wc -l
  EXPECT: 0
  EVIDENCE: 0

- [x] G2: feed continua ordenado por data desc com desempate estável
  CHECK: node --experimental-strip-types --test scripts/feed-rank.test.mjs
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 62.658661

- [x] G3: Fontes ordena por chips rotulados numa linha abaixo do header; select extinto
  CHECK: grep -c "FontesSortSelect\|<select" src/routes/fontes.tsx src/components/news/fontes-chip.tsx | grep -v ":0" | wc -l
  EXPECT: 0
  EVIDENCE: 0

- [x] G4: suíte, typecheck, lint e build verdes
  CHECK: npm test && npm run typecheck && npm run lint && npm run build
  EXPECT: eslint
  EVIDENCE: ℹ Generated .output/nitro.json | [nitro] ✔ You can preview this build using npx vite preview
