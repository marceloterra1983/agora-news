# Security review — e04s07

## Scope

- Branch: `codex/full-hardening`
- Reviewed range: `db73cfb15d228ba3a8dfeaa373a27d97e9e7f568..a50aac3`
- Focus: replacement of the unavailable broker with single-user email/password authentication.
- Secrets and production credential values were not read into this report.

## Trace and controls

- Production startup fails closed unless the runtime mode is explicit and the persistent database, Better Auth, allowlisted email, Supabase, VAPID, and cron settings are present (`src/lib/runtime-config.ts:16-38`).
- Sign-in and bootstrap sign-up normalize the submitted email and enforce the one configured allowlist server-side; sign-up is disabled after bootstrap (`src/lib/auth/server.ts:101-123`).
- Credentialed Better Auth requests are restricted to configured trusted origins and use same-origin session cookies; bearer-token browser auth and broker providers are absent (`src/lib/auth/server.ts:82-99`, `src/lib/auth/middleware.ts`, `src/lib/auth/verify.server.ts`).
- Cookies use `__Host-` names with Secure, SameSite=Lax, Path=/, and no Domain, preventing sibling-domain cookie injection (`src/lib/auth/server.ts:129-146`).
- The browser enforces the six-character minimum, while Better Auth enforces the same bound server-side (`src/routes/login.tsx:225-236`, `src/lib/auth/server.ts:101-108`).
- Broker popup/provider modules are deleted and zero-consumer behavior is covered by the focused tests (`scripts/single-user-auth.behavior.test.mjs`).

## Verification

- `node --experimental-strip-types --test scripts/single-user-auth.behavior.test.mjs` — 11 passed, 0 failed.
- `CI_REQUIRED_SMOKES=1 NEWS_SMOKE_URL=http://127.0.0.1:3180 node --experimental-strip-types --test --test-concurrency=1 scripts/**/*.test.mjs` — 270 passed, 0 failed, 0 skipped.
- `npm run typecheck` — passed.
- `npm run lint` — passed with zero warnings.
- `npm run build` — passed.
- `npm audit --omit=dev --audit-level=high` — 0 vulnerabilities.
- Manual browser verification — allowlisted account creation and subsequent sign-in both redirected to the feed; signup was then closed in the runtime environment.

## Findings

No open finding with confidence >= 8/10 was identified in this scope.

The mandatory browser/live checks ran against the freshly built Nitro server on port 3180.
