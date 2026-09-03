# Gates: Revisão YouTube no feed (velocidade, +12h, grupo)

Scope: Corrigir lentidão/ausência de posts YouTube no feed, o botão «mais 12 horas» quando há vídeos, e o grupo/categoria errado — com revisão ponta a ponta e evidência.

- [x] G1: Causa raiz da lentidão/ausência de YouTube no feed documentada com evidência (query, filtro, janela temporal ou render)
  CHECK: node --experimental-strip-types --test scripts/youtube-feed-review.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 83.405388

- [x] G2: «mais 12 horas» avança a janela mesmo quando o último post visível é YouTube (id yt_*, posted_at antigo, media_label JSON)
  CHECK: node --experimental-strip-types --test scripts/feed-more.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 97.844407

- [x] G3: Grupo do vídeo coincide com o seed (youtubeGroupFor / row.group / seção), não com fallback errado
  CHECK: node --experimental-strip-types --test scripts/youtube-group.test.mjs
  EXPECT: /pass [1-9]/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 93.659037

- [x] G4: Suite, typecheck e lint verdes
  CHECK: npm test && npm run typecheck && npm run lint
  EXPECT: /eslint \. --max-warnings=0/
  EVIDENCE: > lint | > eslint . --max-warnings=0

- [x] G5: Feed/popup/+12h/grupos verificados no browser ou no substituto mais próximo
  EVIDENCE: prod 2026-09-03 https://news.automatizems.com/?secao=ai — 21 cards, 0 /materia/yt_*, «mais 12 horas» presente. SQL brasil top40 yt=0 (cutoff 2026-09-03 03:01 UTC) vs Canaltech 2026-09-02 21:00. mergeFeedStories pinou yt_hO_OcLTQjsw e moreCursorIso ficou 2026-09-03T02:25:49.000Z (não 2023). youtubeGroupOf Canaltech=br-jornais Akita=br-colunistas OpenAI=labs. Suite 583 pass / 0 fail / 11 skip.

Causas raiz (produção 2026-09-03, SQL + HTML :3080):
- Brasil/tech: 0 `yt_` nos 80 mais novos (Brasil oldest_in_80 = 2026-09-03 02:25 UTC; YT mais novo = 2026-09-02 21:00). Firehose X/RSS afoga o YouTube.
- `groupOf` só consultava X/RSS → todo `y_*` caía em `novos` (AI prod já tinha `data-group="novos"`).
- Cursor de +12h usava o último card; um `yt_*` de 2012/2023 zerava a janela.
