# Gates: mais RSS nos 3 temas

Scope: Expandir o seed editorial com feeds oficiais verificados em IA, Tech e Brasil.

- [x] G1: seed cresce nos 3 temas e ids batem com o URL
  CHECK: node --experimental-strip-types --test scripts/rss-seed.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 65.951507

- [x] G2: cada tema tem mais RSS do que o baseline 6/6/7
  CHECK: node --experimental-strip-types --test scripts/rss-seed.test.mjs
  EXPECT: rssExtrasFor
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 90.067504

- [x] G3: npm test passa
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 5831.319568
