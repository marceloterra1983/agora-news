# Gates: incluir fontes RSS no seed editorial

Scope: RSS_SEED passa a 19 feeds (5 atuais + 14 incluir); OpenAI/HF em labs; account = rssAccountId(url).

- [x] G1: Seed tem 19 URLs, as 14 novas e as 5 atuais
  CHECK: node --experimental-strip-types --test scripts/rss-seed.test.mjs
  EXPECT: pass 3
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 127.952599

- [x] G2: OpenAI e Hugging Face estão no grupo labs
  CHECK: node --input-type=module -e "import { RSS_SEED } from './src/lib/news/rss-catalog.mjs'; const g=Object.fromEntries(RSS_SEED.map(r=>[r.title,r.group])); if(g.OpenAI!=='labs'||g['Hugging Face']!=='labs') throw new Error(JSON.stringify(g)); console.log('LABS_OK');"
  EXPECT: LABS_OK
  EVIDENCE: LABS_OK

- [x] G3: Cada account do seed é rssAccountId(url)
  CHECK: node --input-type=module -e "import { RSS_SEED } from './src/lib/news/rss-catalog.mjs'; import { rssAccountId } from './src/lib/news/rss-id.mjs'; const bad=RSS_SEED.filter(r=>r.account!==rssAccountId(r.url)); if(bad.length) throw new Error(JSON.stringify(bad.map(r=>r.title))); console.log('IDS_OK '+RSS_SEED.length);"
  EXPECT: IDS_OK 19
  EVIDENCE: IDS_OK 19

- [x] G4: npm test passa
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 9328.650995

- [x] G5: typecheck e lint no catálogo e no teste
  CHECK: npx tsc --noEmit && npx eslint src/lib/news/rss-catalog.mjs scripts/rss-seed.test.mjs --max-warnings=0 && echo TYPE_LINT_OK
  EXPECT: TYPE_LINT_OK
  EVIDENCE: TYPE_LINT_OK
