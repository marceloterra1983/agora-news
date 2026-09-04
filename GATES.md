# Gates: fix existingIds for YouTube post IDs

Scope: `existingIds` deve aceitar `yt_*` para a ingestão YouTube não engolir canais em silêncio.

- [ ] G1: existingIds aceita yt_ IDs sem throw
  CHECK: node --test scripts/youtube-existing-ids.test.mjs
  EXPECT: accepts yt_
  EVIDENCE: pending

- [ ] G2: npm test, typecheck e lint passam
  CHECK: npm test && npm run typecheck && npm run lint
  EXPECT: fail 0
  EVIDENCE: pending

- [ ] G3: Ingest only=youtube escreve posts dos novos canais
  EVIDENCE: pending
