# Gates: horário do last-post na linha de Fontes

Scope: Em Fontes, o “há X min” fica imediatamente antes da tag do grupo no header do card, não embaixo do título.

- [x] G1: teste RED/GREEN da ordem time → GroupTag no header; ClosedPostMeta sem relativeTime
  CHECK: node --experimental-strip-types --test scripts/fontes-card-controls.test.mjs
  EXPECT: /fail 0/
  EVIDENCE: 3/3 fontes-card-controls fail 0 (RED then GREEN)

- [x] G2: suite do repo
  CHECK: npm test
  EXPECT: /fail 0/
  EVIDENCE: ℹ pass 522 | ℹ fail 0 | ℹ skipped 10

- [x] G3: typecheck e lint
  CHECK: npm run typecheck && npm run lint && echo TYPECHECK_LINT_OK
  EXPECT: TYPECHECK_LINT_OK
  EVIDENCE: TYPECHECK_LINT_OK

- [x] G4: feed Fontes mostra o horário à esquerda da tag (browser)
  EVIDENCE: 127.0.0.1:8081/fontes?secao=tech The Information — headerKids time "há 19 min" (idx 2) then Imprensa (idx 3); timeUnderTitle=false
