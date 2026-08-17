# Impacto — e04s08 audit remediation closeout

## Target

Executar as recomendações confirmadas na auditoria do HEAD `c71c4fe`, com
prioridade para a separação entre catálogo público e `user_watches`, seguida
pela consistência do feed, pequenos contratos de UI/PWA, continuidade
operacional, documentação viva e limpeza de código sem callers.

## Purpose, callers and contracts

- `server-catalog.ts` monta o catálogo permitido para uma seção. Seus callers
  são `loadFeed()` e `loadNews()`; o contrato novo é: visitante recebe somente
  perfis públicos, usuário autenticado recebe somente as próprias watches.
- `feed.ts` baixa, limita e retém o último feed válido. Seus callers são
  `server-news.ts`, testes de acessibilidade e o cache em memória; um único
  snapshot de catálogo deve atravessar a consulta, todos os filtros e a
  refiltragem de `lastGood` após falha.
- `server-news.ts` atende SSR, server functions e `/api/feed`; deve resolver a
  sessão apenas no servidor e impedir cache público de respostas personalizadas.
- `theme.ts`, `pwa.ts` e `pwa-install.tsx` aplicam o tema inicial e o contrato de
  instalação; devem preservar SSR/hydration e anunciar mudanças de estado.
- `backup-production.sh`, o wrapper externo do cron e o runbook formam o
  contrato de recuperação; o snapshot deve registrar o agendamento e o wrapper,
  e os logs do host precisam de retenção limitada.

## Dependents (18 boundary groups)

- Feed público: `src/routes/api/feed.ts`.
- SSR e paginação: `src/lib/news/server-news.ts`.
- Lista e fallback: `src/lib/news/feed.ts` e `src/lib/news/supabase.ts`.
- Catálogo: `src/lib/news/server-catalog.ts`, `section-catalog.mjs` e
  `profiles.ts`.
- Sessão: `src/lib/auth/verify.server.ts`.
- Persistência de watches: `src/lib/news/watch.ts` e `/api/watch`.
- Ingestão: `src/lib/news/ingest.ts` e `ingest-scan.ts`.
- UI personalizada: `use-section-catalog.ts`, `extra-fontes.ts`, `fontes.tsx`
  e `buscar.tsx`.
- Tema/PWA: `__root.tsx`, `theme.ts`, `pwa.ts`, `pwa-install.tsx` e o manifest.
- Operação: Compose, scripts de backup, crontab, wrapper e runbook.
- Gates: testes de catálogo, persistência privada, acessibilidade, release e
  simplificação.

## Affected stories

- `e04s02`: ownership de watches e persistência privada.
- `e04s04`: cache HTTP, CI, artifact smoke e operação.
- `e04s05`: tema, formulários, estados anunciados e PWA.
- `e04s06`: documentação viva e zero-consumer cleanup.
- `e04s08`: fechamento das recomendações desta auditoria.

## Test coverage

- `private-persistence.behavior.test.mjs`: ownership e união usada pela ingestão.
- `catalog-feed-scope.test.mjs`: allowlist do catálogo e escopo por seção.
- `accessibility-contract.test.mjs`: feed truthful, tema, formulários e PWA.
- `release-gates.behavior.test.mjs`: Compose, CI e release smoke.
- `simplification-contract.test.mjs`: documentação e zero consumers.
- Gap P0: não existe teste que prove que uma watch de A nunca entra no feed
  anônimo ou no feed de B, inclusive quando a dependência falha depois de
  `lastGood` receber o snapshot personalizado de A.
- Gap P1: não existe teste que prove o mesmo catálogo em download e pós-filtro.
- Gap P2: não há contrato para `theme-color` no boot, metadados dos inputs,
  live region do instalador, logrotate ou recuperação do cron.

## Risk: High

O feed é uma fronteira pública compartilhada e hoje combina dados owner-scoped
com cache HTTP público. O conserto atravessa sessão, catálogo e filtragem; uma
mudança parcial pode vazar dados ou fazer fontes do dono desaparecerem.

## Risk score

- Fan-in: 4/4 — SSR, API, React Query, testes e ingestão dependem do contrato.
- Fan-out: 3/3 — sessão, Supabase, catálogo, cache e watches são consultados.
- Recent churn: 3/3 — os arquivos mudaram repetidamente no hardening recente.
- Total: 10/10.

## Recommended action

Adicionar primeiro um teste comportamental de isolamento, depois fazer o feed
resolver um catálogo owner-scoped uma única vez e refiltrar qualquer fallback
por esse mesmo catálogo. Respostas personalizadas devem ser `private, no-store`;
a união global permanece exclusiva da ingestão. UI, operação, documentação e
limpeza entram somente após o gate P1 passar.

Nenhuma chave será rotacionada ou revogada. Nenhum pacote novo será adicionado.
