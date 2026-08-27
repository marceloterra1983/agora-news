# Gates: segunda leva de RSS

Scope: Acrescentar mais feeds oficiais verificados em IA, Tech e Brasil.

- [x] G1: seed cresce nos 3 temas e ids batem com o URL
  CHECK: node --experimental-strip-types --test scripts/rss-seed.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 100.407011

- [x] G2: cada tema tem mais RSS do que o baseline 14/14/15
  CHECK: node --experimental-strip-types --test scripts/rss-seed.test.mjs
  EXPECT: rssExtrasFor
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 63.098607

- [x] G3: npm test passa
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 5593.918486
