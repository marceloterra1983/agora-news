# Story e04s01: Boot production with persistent auth and rotated credentials

## 1. Identity

- Story: `e04s01`
- Epic: `e04-full-hardening`
- BCP: 8

## 2. Status

Passing locally: focused behavior tests, env-less build, full regression,
typecheck and dependency audit all pass. Provider credential creation/revocation
remains the owner-controlled production cutover in the runbook.

## 3. Type

Fix, security and infrastructure.

## 4. Risk

P0. This story changes privileged credentials, auth callbacks and production startup.

## 5. User

The operator needs a deploy that cannot silently run with preview identity or committed credentials; users need login sessions that survive restarts.

## 6. Problem

Production currently lacks persistent auth configuration and falls back to preview OAuth/PGLite. Privileged Supabase and VAPID values exist as tracked literals.

## 7. Outcome

Production boots only with explicit persistent auth and env-only credentials, while local/preview and env-less builds remain supported.

## 8. Purpose of affected modules

`auth/server.ts` constructs the Better Auth instance; `db.ts` selects persistent Postgres or preview PGLite; `admin.ts`/`cache.ts` authenticate Supabase REST; `push-server.ts` and `vapid-public.ts` establish Web Push identity.

## 9. Callers

Auth routes, popup/login, auth middleware, every authenticated news write, ingest/profile/prefs/push stores, browser feed reads, Docker startup and migration commands.

## 10. Contracts to preserve

- `vite build` succeeds without runtime secrets.
- Local/preview may use PGLite and preview OAuth only in an explicit non-production mode.
- Browser bundles contain only a Supabase publishable key and VAPID public key.
- Existing auth/write middleware APIs remain stable.

## 11. Reason for Depth

A single server-only production-config module is justified because auth, database, Supabase, push and startup share one security invariant that must be validated once rather than inconsistently at each caller.

## 12. External dependencies and Slopcheck

- `[OK]` Better Auth: already installed; static `baseURL`, exact trusted origins and trusted client-IP header are documented capabilities.
- `[OK]` Supabase REST: already used; new `sb_secret_*` and publishable keys coexist with legacy keys during migration.
- `[OK]` `web-push`: already installed; the existing library generates/uses VAPID pairs.
- No new package is introduced.

## 13. Data flow

Runtime bootstrap validates production env, Better Auth uses persistent Postgres and canonical callbacks, server REST requests use `SUPABASE_SECRET_KEY` as `apikey`, browser REST requests use the publishable key, and Web Push resubscribes when its stored application-server key differs.

## 14. Error handling

Startup errors identify a missing variable by name but never print values. Build-time module evaluation does not run runtime validation. Invalid VAPID state returns a recoverable UI error and never marks notifications enabled.

## 15. Security model

Production trusts only `https://news.automatizems.com`; Nginx overwrites `X-Real-IP`; private keys remain server-only. The old VAPID key is not retained as a fallback. Final provider revocation remains an owner-controlled action.

## 16. Requirements

#### MODIFIED: Production configuration fallback

**Before:** Missing production variables select preview OAuth, PGLite and literal credentials.

**After:** Explicit production mode refuses missing persistent auth/database/secret configuration at runtime; only explicit local/preview mode can use fallbacks.

#### MODIFIED: Supabase API-key headers

**Before:** Legacy JWT keys are sent as both `apikey` and Bearer tokens.

**After:** `sb_secret_*`/publishable keys are sent as `apikey`; Bearer is used only for a real user JWT when one exists.

#### MODIFIED: VAPID rotation

**Before:** A literal pair is reused and existing subscriptions are never checked against the current public key.

**After:** Env-only keys are required and a mismatched subscription is replaced with one bound to the current public key.

## 17. Acceptance criteria

```gherkin
Scenario: Production starts with complete configuration
  Given all required production variables and migrated auth schema
  When the Nitro server starts
  Then auth uses persistent Postgres and the canonical production origin

Scenario: Production refuses an unsafe fallback
  Given production mode with any required credential absent
  When runtime bootstrap executes
  Then startup fails naming only the missing variable

Scenario: Build remains hermetic
  Given no production secrets and no database connection
  When vite build runs
  Then the Nitro artifact is produced without running migrations

Scenario: VAPID identity changes
  Given a browser subscription created with the previous public key
  When notification setup runs with the new public key
  Then the old subscription is cancelled and a new owned subscription is saved
```

## 18. Implementation steps

1. Add executable configuration/header/VAPID behavior tests and observe the intended failures → verify: `node --experimental-strip-types --test scripts/production-config.behavior.test.mjs`
2. Add the shared runtime-only production configuration and explicit environment-mode contract → verify: `node --experimental-strip-types --test --test-name-pattern="configuration" scripts/production-config.behavior.test.mjs`
3. Configure persistent Better Auth, canonical callbacks/origin and trusted Nginx client-IP input → verify: `node --experimental-strip-types --test --test-name-pattern="auth" scripts/production-config.behavior.test.mjs && npm run typecheck`
4. Replace Supabase literal/legacy header paths with env-only new-key semantics and public publishable configuration → verify: `node --experimental-strip-types --test --test-name-pattern="Supabase" scripts/production-config.behavior.test.mjs`
5. Replace literal VAPID identity and resubscribe mismatched clients → verify: `node --experimental-strip-types --test --test-name-pattern="VAPID" scripts/production-config.behavior.test.mjs`
6. Separate build from migration and document the exact runtime variables/callbacks → verify: `npm run build && git diff --check`
7. Run a security review of all affected paths with no new findings before cutover → verify: `npm test && npm run typecheck && npm audit --omit=dev`

## 19. Verification script

Run the focused suite, an env-less build, server/public bundle secret scan, configured Docker cold start, login callback, container restart persistence and authenticated write smoke. Dashboard key creation/revocation is recorded separately from automated evidence.

## 20. Out of scope, risks and rollback

No new auth provider or identity migration is added. Missing OAuth/database credentials block production cutover, not code/build validation. Rollback is the previous image while new Supabase keys and expanded schema remain active; final legacy-key revocation occurs only after all smokes and usage checks pass.
