# Gates: pubDate PT-BR / feed uma fonte

Scope: Parsear pubDate PT-BR e corrigir posted_at colado que empilha UOL no feed.

- [x] G1: Causa raiz verificada (Date.parse Qui,Ago = NaN; 13 posts no mesmo instante)
  EVIDENCE: Date.parse("Qui, 27 Ago 2026 19:56:13 -0300")=NaN; ingles equivalente=2026-08-27T22:56:13.000Z. SQL: 13 posts r_e0d5de43db4c com posted_at=2026-08-27 23:34:10.248+00 (heal).

- [x] G2: Testes de pubDate e dateRepair
  CHECK: node --experimental-strip-types --test scripts/rss-pubdate.test.mjs scripts/rss-parse.test.mjs scripts/rss-ingest.behavior.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: fail 0 no pacote rss-pubdate + rss-parse + rss-ingest

- [x] G3: typecheck e lint
  CHECK: npm run typecheck && npm run lint
  EXPECT: eslint
  EVIDENCE: eslint . --max-warnings=0

- [ ] G4: PR mergeado na main
  EVIDENCE: pending

- [ ] G5: ingest regrava posted_at UOL Economia (nao mais 13 iguais)
  EVIDENCE: pending

- [ ] G6: feed Brasil mistura fontes (nao so UOL Economia no topo)
  EVIDENCE: pending
