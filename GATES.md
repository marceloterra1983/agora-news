# Gates: ícone de origem à direita

Scope: No feed o ícone fica ao lado de Salvar; em Fontes, ao lado do V.

- [x] G1: Fontes coloca OriginMark ao lado do ChevronDown
  CHECK: node --experimental-strip-types --test scripts/origin-mark.test.mjs
  EXPECT: ChevronDown
  EVIDENCE: Fontes OriginMark sits next to ChevronDown | ℹ fail 0

- [x] G2: feed reader coloca OriginMark ao lado do botão Salvar
  CHECK: node --experimental-strip-types --test scripts/origin-mark.test.mjs
  EXPECT: Bookmark
  EVIDENCE: feed reader OriginMark sits next to Bookmark save | ℹ fail 0

- [x] G3: npm test passa
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 23126.126563
