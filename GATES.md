# Gates: feed não marca RSS como Outros

Scope: Posts RSS no feed usam o mesmo grupo do cadastro de Fontes; Outros só existe se houver fonte sem grupo.

- [x] G1: groupOf resolve o grupo do seed RSS
  CHECK: node --experimental-strip-types --test scripts/rss-source-display.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 63.166309

- [x] G2: GroupTag consulta groupOf, não só o catálogo X
  CHECK: node --input-type=module -e "import { readFileSync } from 'node:fs'; const tag=readFileSync('src/components/news/group-tag.tsx','utf8'); const prefs=readFileSync('src/lib/news/fontes-prefs.ts','utf8'); if (!tag.includes('groupOf(handle)')) throw new Error('tag'); if (!prefs.includes('rssGroupOf')) throw new Error('prefs'); console.log('wired');"
  EXPECT: wired
  EVIDENCE: wired

- [x] G3: npm test passa
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 6744.164277
