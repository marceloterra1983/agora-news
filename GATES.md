# Gates: origem X / RSS no topo

Scope: Dois botões no header ligam/desligam posts do X e do RSS; o feed respeita a escolha e persiste.

- [ ] G1: Filtro de origem
  CHECK: node --experimental-strip-types --test scripts/origin-filter.test.mjs
  EXPECT: fail 0
  EVIDENCE: pending

- [ ] G2: Header expõe o grupo de origem
  CHECK: rg -n "data-origin-switch" src/components/news/app-chrome.tsx src/components/news/origin-switch.tsx
  EXPECT: data-origin-switch
  EVIDENCE: pending

- [ ] G3: Suíte do repo
  CHECK: npm test
  EXPECT: fail 0
  EVIDENCE: pending

- [ ] G4: Typecheck
  CHECK: npm run typecheck && echo TYPECHECK_OK
  EXPECT: TYPECHECK_OK
  EVIDENCE: pending

- [ ] G5: Lint do diff
  CHECK: npx eslint src/lib/news/rss-catalog.mjs src/lib/news/settings.ts src/components/news/origin-switch.tsx src/components/news/app-chrome.tsx src/components/news/feed.tsx src/routes/salvos.tsx scripts/origin-filter.test.mjs --max-warnings=0 && echo LINT_OK
  EXPECT: LINT_OK
  EVIDENCE: pending
