# Gates: horário depois da tag do grupo em Fontes

Scope: Em Fontes, o “há X min” fica imediatamente depois da tag do grupo no header do card.

- [x] G1: teste prova GroupTag → time no header; ClosedPostMeta sem relativeTime
  CHECK: node --experimental-strip-types --test scripts/fontes-card-controls.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: 3/3 fail 0

- [x] G2: suite do repo
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ tests 532 | ℹ pass 522 | ℹ fail 0 | ℹ skipped 10 | ℹ duration_ms 5669.34678

- [x] G3: typecheck e lint
  CHECK: npm run typecheck && npm run lint && echo TYPECHECK_LINT_OK
  EXPECT: TYPECHECK_LINT_OK
  EVIDENCE: TYPECHECK_LINT_OK

- [x] G4: browser Fontes — time depois da tag
  EVIDENCE: 127.0.0.1:8082/fontes?secao=tech The Information — Imprensa (idx 2) then "há 28 min" (idx 3)
