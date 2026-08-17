# Story e04s07: Replace unavailable broker with single-user email auth

## 1. Identity

- Story: `e04s07`
- Epic: `e04-full-hardening`
- BCP: 8

## 2. Status

Failing by design. The approved specification exists, but production still
requires the unavailable Grok OAuth broker and the login route has no
email/password flow.

## 3. Type

Fix, security and authentication.

## 4. Risk

P0. This story changes production startup, account admission and the shared
session boundary used by every private API.

## 5. User

The owner needs one persistent account without operating an external OAuth
broker. No other visitor may create or use an account.

## 6. Problem

The hardened application requires `GROK_AUTH_*`, but `auth.grok.me` has no
working OIDC endpoint or administrative client registration. Production cannot
complete its approved cutover with fabricated credentials.

## 7. Outcome

Better Auth authenticates one allowlisted email with a private password stored
in the existing Postgres database. Sign-up is temporarily enabled for bootstrap
and defaults closed thereafter.

## 8. Purpose of affected modules

`auth/server.ts` constructs the same-origin Better Auth instance;
`auth/client.ts` exposes browser session actions; the runtime-config modules
fail production startup closed; `login.tsx` owns the authentication UI; and
`vite.config.ts` currently installs the broker-only preview popup.

## 9. Callers

`/api/auth/*`, `verify.server.ts`, auth middleware, `use-current-user.ts`, the
login route, app menu, preference sync, every owner-scoped watch/prefs/push API,
Nitro bootstrap, Docker release smoke and accessibility/configuration tests.

## 10. Contracts to preserve

- `/api/auth/*`, `authClient.useSession()` and sign-out remain stable.
- Production sessions remain persisted in `DATABASE_URL` and survive restart.
- Secure host-only cookies, canonical origin, CSRF checks and owner-scoped APIs
  remain unchanged.
- Env-less builds and explicit local/preview modes remain valid.
- The previous production image remains available until the new login and
  private writes pass.

## 11. Reason for Depth

One pure email-policy module is justified because startup validation and both
sign-up/sign-in hooks must share exactly the same normalization, allowlist and
bootstrap-default contract; duplicating that security rule would permit drift.

## 12. External dependencies and Slopcheck

- `[OK]` Better Auth `1.6.27`: already installed. Its documented
  `emailAndPassword.enabled`, `disableSignUp` and request before hooks provide
  the required flow without a new provider or package.
- `[OK]` React `19.2.8` and TanStack Router `1.170.27`: already installed and
  used by `/login`.
- No new package or external service is introduced.

Technical reference:
`https://better-auth.com/docs/authentication/email-password`.

## 13. Data flow

Runtime bootstrap validates `AUTH_ALLOWED_EMAIL`; the login form posts to the
same-origin Better Auth email endpoints; a server hook normalizes and checks the
address before sign-up or sign-in; Better Auth hashes the password and persists
account/session rows in Postgres; existing session consumers resolve the owner
ID from the secure cookie.

## 14. Error handling

Startup names missing or malformed variable names without values. Server hooks
return a stable generic rejection for a non-allowlisted address. The UI
distinguishes closed bootstrap, invalid credentials, duplicate owner account and
network failure with short Portuguese messages, never raw exception text.

## 15. Security model

`AUTH_ALLOWED_EMAIL` is normalized server-side; `AUTH_BOOTSTRAP_SIGNUP` defaults
false; both sign-up and sign-in enforce the allowlist; passwords never enter
source, logs or chat. Manual password recovery revokes other sessions. No legacy
Supabase key is revoked during this story's first deployment.

## 16. Requirements

#### MODIFIED: Production authentication variables

**Before:** Production requires `GROK_AUTH_ISSUER`, `GROK_AUTH_CLIENT_ID` and
`GROK_AUTH_CLIENT_SECRET` for an unavailable broker.

**After:** Production requires one valid `AUTH_ALLOWED_EMAIL`; Better Auth uses
the existing database, origin and secret without broker variables.

#### ADDED: Single-user server boundary

Only the normalized configured email may use email sign-up or sign-in. Client
visibility does not grant access.

#### ADDED: Closed-by-default bootstrap

Sign-up is disabled unless `AUTH_BOOTSTRAP_SIGNUP` is exactly `true`. After the
owner account exists, the flag is false and restart proves sign-up remains
closed while sign-in works.

#### MODIFIED: Login interaction

**Before:** `/login` renders Google and X OAuth icon buttons.

**After:** `/login` renders labeled email/password sign-in controls; the
temporary `?cadastro=1` mode adds owner-name and password-confirmation fields.

#### REMOVED: Grok OAuth broker and popup

**Before:** Server/client generic OAuth, preview credentials, providers and a
Vite popup middleware depend on `auth.grok.me`.

**After:** (removed) — the endpoint is unavailable and native single-user
email/password covers the approved production need.

## 17. Acceptance criteria

```gherkin
Scenario: Production starts without the broker
  Given complete production configuration with AUTH_ALLOWED_EMAIL
  And no GROK_AUTH variables
  When Nitro runtime validation runs
  Then startup accepts the configuration

Scenario: Another address is rejected
  Given an email that differs after trim and lowercase normalization
  When that address attempts sign-up or sign-in
  Then the server rejects it without creating a user or session

Scenario: Bootstrap is closed by default
  Given AUTH_BOOTSTRAP_SIGNUP is absent or not exactly true
  When the allowed email attempts sign-up
  Then Better Auth rejects sign-up

Scenario: Owner signs in
  Given the owner account already exists and bootstrap is closed
  When the owner submits the correct email and password
  Then a persistent session is created and the app returns to the feed

Scenario: Broker code is absent
  Given the email flow passes
  When tracked production sources are scanned
  Then no Grok provider, preview credential or popup consumer remains
```

## 18. Implementation steps

1. Add `scripts/single-user-auth.behavior.test.mjs` and observe failures for runtime, policy, UI and broker-removal contracts → verify: `node --experimental-strip-types --test scripts/single-user-auth.behavior.test.mjs`
2. Add the pure normalized-email/bootstrap policy and replace `GROK_AUTH_*` with `AUTH_ALLOWED_EMAIL` in fail-closed runtime configuration → verify: `node --experimental-strip-types --test --test-name-pattern="runtime|allowed email|bootstrap" scripts/single-user-auth.behavior.test.mjs scripts/production-config.behavior.test.mjs`
3. Configure Better Auth email/password, redefine `authConfigured` independently of OAuth and enforce the allowlist before sign-up/sign-in → verify: `node --experimental-strip-types --test --test-name-pattern="server|sign-up|sign-in" scripts/single-user-auth.behavior.test.mjs && npm run typecheck`
4. Replace OAuth actions with the accessible sign-in/bootstrap form while preserving session and sign-out consumers → verify: `node --experimental-strip-types --test --test-name-pattern="login|accessib" scripts/single-user-auth.behavior.test.mjs scripts/accessibility-contract.test.mjs scripts/agora-next.test.mjs`
5. Delete broker-only providers, popup, preview secrets and Vite/client/server consumers after zero-consumer proof → verify: `node --experimental-strip-types --test --test-name-pattern="broker|popup|zero consumer" scripts/single-user-auth.behavior.test.mjs scripts/mobile-viewport.test.mjs && npm run build`
6. Update `.env.example`, CI smoke and production runbook with bootstrap-lock and manual-recovery operations → verify: `node --experimental-strip-types --test scripts/production-config.behavior.test.mjs scripts/release-gates.behavior.test.mjs && git diff --check`
7. Run full regression, artifact smokes and affected-path security review before production bootstrap → verify: `npm test && npm run typecheck && npm run lint && npm run build && npm audit --omit=dev && test -f specs/verifications/e04s07-security-review.md`

## 19. Verification script

Run the focused RED/GREEN suite, full mandatory gates and Docker release smoke.
Then confirm zero existing Better Auth users, deploy with bootstrap temporarily
enabled, let the owner enter the password directly in the connected Chrome,
verify one session and one private preference write, disable bootstrap, restart,
and prove new sign-up is rejected while owner sign-in still works.

## 20. Out of scope, risks and rollback

Google/X login, email delivery, self-service reset, backups and legacy-row
cleanup remain out of scope. The principal risks are accidentally treating
email auth as disabled, admitting another address, or leaving bootstrap open.
Rollback restores the retained production image and does not delete the new
account or rotate Supabase credentials.
