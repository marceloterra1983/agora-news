# Gates: foto da fonte X alinhada à conta

Scope: Timeline misto não pinta face alheia no perfil; OpenAI deixa de herdar o Greg.

- [x] G1: helper escolhe o author dono e evicta face roubada
  CHECK: node --experimental-strip-types --test scripts/ingest-profile-core.test.mjs
  EXPECT: fail 0
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 373.273077

- [x] G2: ingest monta perfil pelo author dono do handle
  CHECK: grep -l ownedAuthorFromStatuses src/lib/news/ingest.ts src/lib/news/profile-last-store.ts
  EXPECT: ingest.ts
  EVIDENCE: src/lib/news/ingest.ts

- [x] G3: contrato de ingest + last-post + orçamento de linhas
  CHECK: node --experimental-strip-types --test scripts/ingest-profile-core.test.mjs scripts/agora-next.test.mjs scripts/profile-last.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 681.229629

- [ ] G4: OpenAI no banco ou na UI deixa de usar o hash do Greg
  EVIDENCE: pending
