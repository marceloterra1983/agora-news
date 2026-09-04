# Gates: fix existingIds for YouTube post IDs

Scope: `existingIds` deve aceitar `yt_*` para a ingestão YouTube não engolir canais em silêncio.

- [x] G1: existingIds aceita yt_ IDs sem throw
  CHECK: node --test scripts/youtube-existing-ids.test.mjs
  EXPECT: accepts yt_
  EVIDENCE: accepts yt_ | pass 2

- [x] G2: npm test, typecheck e lint passam
  CHECK: npm test && npm run typecheck && npm run lint
  EXPECT: fail 0
  EVIDENCE: pass 594 fail 0 skipped 11; tsc ok; eslint ok

- [ ] G3: Ingest only=youtube escreve posts dos novos canais
  EVIDENCE: pending
