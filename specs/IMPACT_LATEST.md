## Status

Concluído no commit `07c2e256`: Better Auth email/senha para uma conta
allowlisted, sem o broker Grok OAuth. Os testes de contrato, typecheck e lint
passam; resta apenas a verificação operacional de build/rollback e a manutenção
de índices/documentação.

## Target (histórico)

Replace the unavailable Grok OAuth broker with Better Auth email/password for
one allowlisted production account, following
`docs/superpowers/specs/2026-08-17-single-user-email-auth-design.md`.

## Dependents (7 boundary groups)

1. **Auth construction** — `src/lib/auth/server.ts` creates Better Auth and
   exports `authConfigured`; `/api/auth/*`, `verify.server.ts`, every private
   preference/watch/push API and SSR session read depend on that contract.
2. **Runtime safety** — `src/lib/runtime-config.ts` and
   `src/lib/auth/runtime-config.ts` fail production startup closed; the Nitro
   runtime plugin calls them before accepting traffic.
3. **Browser auth** — `src/lib/auth/client.ts` supplies session/sign-out to
   `login.tsx`, `app-menu.tsx`, `use-current-user.ts` and auth middleware.
4. **Login UI** — `src/routes/login.tsx` owns signed-out, pending and signed-in
   email/password states, including the temporary allowlisted signup flow.
5. **Removed broker path** — the former popup/provider modules are historical;
   no production caller should depend on them.
6. **Release configuration** — `.env.example`, `compose.yml`,
   `scripts/ci-release-smoke.sh` and `docs/production-runbook.md` describe and
   inject the production auth contract.
7. **Regression gates** — `production-config.behavior.test.mjs`,
   `agora-next.test.mjs`, `accessibility-contract.test.mjs` and
   `mobile-viewport.test.mjs` encode current startup, login and responsive
   behavior.

## Purpose, callers and contracts

- `server.ts` owns one same-origin Better Auth instance. Its callers require a
  persistent session, host-only secure cookie, canonical origin and no shared
  production fallback user.
- `client.ts` exposes `authClient`, session and sign-out behavior. UI callers
  must retain these interfaces while OAuth/popup code is deleted.
- Runtime config owns fail-fast production validation. Env-less builds and
  explicit local/preview modes must remain valid.
- `/login` owns accessible authentication UI. It must keep one descriptive
  heading, visible labels, announced errors, busy controls and signed-in state.

## Affected stories

- New `e04s07`: single-user email authentication.
- `e04s01`: production auth variables and startup contract are modified.
- `e04s04`: Nitro/Docker release smokes must use the new variables.
- `e04s05`: the login interaction and accessibility contract change.
- `e04s06`: broker-only runtime and documentation become deletable.

## Test coverage

- Configuration and single-user auth tests cover fail-closed startup, the
  normalized allowlist, bootstrap default-closed behavior, password bounds,
  unauthorized sign-in/sign-up and safe errors.
- Accessibility and release tests cover the login state, responsive behavior
  and absence of broker consumers.

## Residual risk: operational

The implementation risk is closed by the current behavior gates. Remaining
risk is operational: verify a fresh production build/rollback and keep the
allowlisted-account policy explicit.

## Recommended action (closeout)

Preserve `/api/auth/*`, persistent Postgres, cookie/CSRF settings, session
consumers and owner-scoped APIs. Do not add a new auth broker or infrastructure
layer without a measured requirement.
