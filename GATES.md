# Gates: tempo do grupo à esquerda

Scope: Na vista Grupos das Fontes, o relativeTime do último post fica ao lado do nome, não à direita.

- [x] G1: o `<time>` do grupo não tem ml-auto
  CHECK: node --experimental-strip-types --test scripts/fontes-group-time.test.mjs
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 300.625822

- [x] G2: fontes.tsx continua ≤ 300 linhas
  CHECK: node --experimental-strip-types --test scripts/split-pages.test.mjs
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 268.651065

- [ ] G3: browser em /fontes?sort=groups mostra o tempo junto do título
  EVIDENCE: pending
