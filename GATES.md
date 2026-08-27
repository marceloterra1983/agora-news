# Gates: ícones X/RSS no cabeçalho de grupo

Scope: Em Fontes → Grupos, cada grupo mostra à direita X, RSS ou ambos.

- [x] G1: originsInHandles devolve x, rss ou os dois
  CHECK: node --experimental-strip-types --test scripts/origin-mark.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 231.608014

- [x] G2: cabeçalho de grupo renderiza OriginMark ao lado do V
  CHECK: node --experimental-strip-types --test scripts/origin-mark.test.mjs
  EXPECT: g.origins
  EVIDENCE: group headers render g.origins next to ChevronDown | ℹ fail 0

- [x] G3: npm test passa
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 13065.681885
