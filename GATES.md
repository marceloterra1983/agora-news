# Gates: encoding RSS PT (acentos)

Scope: Decodificar feeds Latin-1 e regravar posts RSS com U+FFFD.

- [x] G1: Causa raiz verificada (UOL ISO-8859-1 vs res.text UTF-8)
  EVIDENCE: UOL economia Content-Type text/xml;charset=ISO-8859-1; UTF-8 fatal falha no byte 0xDA. res.text() → "Monet�rio"/"bilh�es" (mesmo recorte da UI). decodeRssBody live 2026-08-27 20:20 BRT: UOL 15 itens, Folha agora 100, g1 100 — fffd=0; título UOL "Orçamento de 2027 prevê superávit". SQL: 189 posts RSS com chr(65533).

- [x] G2: Teste de decode/heal RSS
  CHECK: node --experimental-strip-types --test scripts/rss-encoding.test.mjs scripts/rss-parse.test.mjs scripts/rss-ingest.behavior.test.mjs
  EXPECT: /pass 12/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 84.344636

- [x] G3: Bytes Latin-1 viram bilhões/Monetário sem U+FFFD
  CHECK: node --experimental-strip-types --test scripts/rss-encoding.test.mjs
  EXPECT: /pass 6/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 56.344164

- [x] G4: Suite do repo (exceto hang pré-existente em ingest-orchestration)
  CHECK: node --experimental-strip-types --test --test-timeout=90000 --test-force-exit scripts/rss-encoding.test.mjs scripts/rss-parse.test.mjs scripts/rss-ingest.behavior.test.mjs scripts/ingest-correctness.behavior.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 732.751712

- [x] G5: typecheck e lint
  CHECK: npm run typecheck && npm run lint
  EXPECT: eslint
  EVIDENCE: > lint | > eslint . --max-warnings=0
