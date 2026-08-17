## Target

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
   states. It currently renders only Google/X actions.
5. **Preview popup** — `vite.config.ts`, `popup.server.ts`, `providers.ts` and
   `preview.ts` form a broker-only path and have no purpose after replacement.
6. **Release configuration** — `.env.example`, `compose.yml`,
   `scripts/ci-release-smoke.sh` and `docs/production-runbook.md` describe and
   inject the production auth contract.
7. **Regression gates** — `production-config.behavior.test.mjs`,
   `agora-next.test.mjs`, `accessibility-contract.test.mjs` and
   `mobile-viewport.test.mjs` encode current startup, login and popup behavior.

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

- Existing configuration tests prove fail-closed startup but require
  `GROK_AUTH_*` and do not cover an email allowlist.
- Existing login tests cover heading, signed-in state and logout only.
- Existing mobile test references `popup.server.ts` as a source-size fixture.
- Gap: no behavior test covers normalized allowlist, bootstrap default-closed,
  12–128 character passwords, unauthorized sign-in/sign-up, safe errors or zero
  remaining broker consumers.

## Risk: High (8/10)

This modifies a shared authentication API and production startup. An incorrect
`authConfigured` blocks every private API; an incorrect hook permits another
account; an incomplete popup deletion can break preview/build gates.

## Recommended action

Proceed as `e04s07` via TDD: pure runtime/allowlist contract first, Better Auth
server hook second, client/login third, broker deletion fourth, infra/docs and
real bootstrap last. Preserve `/api/auth/*`, persistent Postgres, cookie/CSRF
settings, session consumers and owner-scoped APIs. Add no package.
