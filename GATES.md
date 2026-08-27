# Gates: ícone de origem X/RSS

Scope: Fonte e feed mostram um ícone pequeno de X ou RSS ao lado do nome.

- [x] G1: OriginMark marca r_* como rss e o resto como x
  CHECK: node --experimental-strip-types --test scripts/origin-mark.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 126.098301

- [x] G2: lista Fontes, card do feed, matéria e popup usam OriginMark
  CHECK: node --experimental-strip-types --test scripts/origin-mark.test.mjs
  EXPECT: OriginMark
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 95.945825

- [x] G3: npm test passa
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 17138.800375
