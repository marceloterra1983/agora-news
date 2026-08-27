# Gates: novos grupos editoriais + RSS

Scope: Criar grupos que a taxonomia atual não cobre e preenchê-los com feeds HTTPS oficiais comprovados.

- [x] G1: taxonomia reserva os 7 grupos novos com rótulo curto
  CHECK: node --input-type=module -e "import { SECTION_TAXONOMY, isReservedGroup } from './src/lib/news/catalog-taxonomy.mjs'; const want = [['ai','regulacao','Regulação'],['ai','ai-riscos','Riscos'],['tech','tech-opensource','Open source'],['tech','tech-ciencia','Ciência'],['brasil','br-ciencia','Ciência'],['brasil','br-mundo','Mundo'],['brasil','br-cultura','Cultura']]; for (const [sec,id,label] of want) { if (!isReservedGroup(id)) throw new Error(id); if (SECTION_TAXONOMY[sec].labels[id] !== label) throw new Error(label); if (!SECTION_TAXONOMY[sec].order.includes(id)) throw new Error('order '+id); } console.log('groups ok', want.length);"
  EXPECT: groups ok 7
  EVIDENCE: groups ok 7

- [x] G2: seed RSS dos grupos novos tem id estável e grupo reservado
  CHECK: node --experimental-strip-types --test scripts/rss-seed.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 69.266112

- [x] G3: npm test passa
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 7903.492681
