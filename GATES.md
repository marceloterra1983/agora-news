# Gates: publicar sempre depois do land

Scope: Deploy vira Always (script + regra + AGENTS). Sem perguntar.

- [x] G1: deploy-prod.sh é o cutover Docker sem migrate nem dump de .env
  CHECK: node --experimental-strip-types --test scripts/deploy-prod.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 56.94314

- [x] G2: AGENTS.md e auto-land mandam rodar o script depois do merge
  CHECK: node --experimental-strip-types --test scripts/deploy-prod.test.mjs
  EXPECT: Always
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 125.180454

- [x] G3: npm test passa
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ todo 0 | ℹ duration_ms 5128.692477
