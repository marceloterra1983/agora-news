# Agora News — Full Hardening and Simplification Design

Date: 2026-08-16

Baseline: `main@2cf09fe`

Branch: `codex/full-hardening`

Status: awaiting user review before implementation

## 1. Goal

Make the current application safe and predictable in production without changing its product model or introducing a new platform. The work covers the confirmed audit findings in security, authentication, persistence, ingestion, operations, accessibility, performance, tests, dependencies, and documentation.

The target remains one TanStack Start/Nitro application, one production container, Supabase for news/domain persistence, Postgres for Better Auth, and the existing cron. This program deliberately does not introduce microservices, a queue, an event bus, or a new UI framework.

## 2. Scope decisions

These decisions remove ambiguity from the audit findings.

1. Production is a single canonical origin: `https://news.automatizems.com`.
2. Production authentication must use a persistent `DATABASE_URL`, a persistent `BETTER_AUTH_SECRET`, an explicit `BETTER_AUTH_URL`, and production OAuth credentials. Production never falls back to preview credentials or PGLite.
3. Local development and Grok preview may keep PGLite and preview OAuth. Environment mode is explicit; it is not inferred from missing secrets.
4. User-added sources, preferences, and push subscriptions are private and owned by the authenticated Better Auth user.
5. The X profile catalog is global, but only cron/admin server paths may mutate it. Browser sessions may request a personal watch; they may not write arbitrary global profile data.
6. `public.posts` stores news only after migration. Profiles, watches, preferences, push subscriptions, last-post data, and cache do not use synthetic post rows.
7. The saved-items copy will stop promising full offline operation. The service worker remains responsible for push; an offline application shell is not added.
8. React Query's 60-second refresh is sufficient for a cron that runs every 15 minutes. The extra browser-to-Supabase 15-second polling path is removed.
9. Accessibility fixes prefer native HTML (`select`, `button`, headings, focus styles, `window.confirm`) over new component abstractions.
10. The mobile type scale fixed by PR #42 is accepted as complete and is not reimplemented.

## 3. Delivery shape

The program is split into six independently verifiable increments. Each increment must be green and deployable before the next cutover.

### Increment A — Production configuration and credential readiness

- Introduce one server-only production configuration validator invoked at Nitro runtime startup, not during `vite build`.
- Require production values for `DATABASE_URL`, `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GROK_AUTH_ISSUER`, `GROK_AUTH_CLIENT_ID`, `GROK_AUTH_CLIENT_SECRET`, `SUPABASE_SECRET_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `CRON_SECRET`.
- Keep local/preview defaults behind an explicit non-production mode.
- Set Better Auth to the static production base URL and exact trusted origin.
- Read client IP from the Nginx-overwritten `X-Real-IP` header; do not trust a broad forwarded chain.
- Register the exact Generic OAuth callbacks:
  - `https://news.automatizems.com/api/auth/oauth2/callback/grok-google`
  - `https://news.automatizems.com/api/auth/oauth2/callback/grok-x`
- Make the build hermetic: `npm run build` builds only. Database migration remains an explicit deployment step.

The container is not restarted with the new fail-fast validator until the database and OAuth credentials are present and the auth migration has succeeded.

### Increment B — Secrets and private persistence

- Replace the legacy Supabase `service_role` JWT with a new `sb_secret_*` API key created for this backend.
- Update administrative REST headers: `sb_secret_*` is sent as `apikey` only; it is never sent as `Authorization: Bearer` because it is not a JWT.
- Replace the public legacy anon key with a publishable key and stop sending it as a Bearer token.
- Remove all literal privileged keys from tracked source and add a test that scans tracked source plus public/server build artifacts.
- Generate a new VAPID pair once, store the private key only in production secrets, and expose only the public key to the client.
- Detect a subscription created with the previous VAPID public key, unsubscribe it, and create/store a subscription for the new key. Invalid subscriptions are removed on HTTP 401, 403, 404, or 410.

Dedicated Supabase tables become the only persistence seams:

- `x_profiles`: global server-managed profile and last-post catalog.
- `user_watches`: `(user_id, section, handle)` ownership and uniqueness.
- `user_prefs`: one JSON preferences row per `user_id`.
- `push_subscriptions`: subscriptions scoped by `user_id` and endpoint.

The migration is expand-then-contract:

1. Create tables, indexes, grants, and idempotent migration checks.
2. Confirm anonymous and authenticated Supabase roles cannot read private tables.
3. Migrate global profile/last-post rows.
4. Export legacy unowned watch rows before removing them from the personal API. They remain read-only cron inputs for one release and are never presented as a user's private list.
5. Drop all write fallbacks to `public.posts`.
6. Verify row counts and application reads.
7. Remove migrated synthetic rows only after the export and verification report identify the exact IDs and counts.

Supabase credential cutover follows the official coexistence path: create and deploy the new secret/publishable keys, verify all consumers, disable legacy `anon`/`service_role`, migrate to asymmetric JWT signing keys, wait at least the configured JWT TTL plus 15 minutes, then revoke the legacy signing secret. Dashboard actions and the final revocation require the project owner.

### Increment C — Authorization and ingestion correctness

Authorization contracts:

- `GET/POST/DELETE /api/watch` always use the session user ID. The cron has a separate server-only union query across users.
- A user may neither list nor delete another user's watches or push subscriptions.
- `POST /api/profile` is removed from the browser write surface or restricted to the cron/admin guard. Profile data is derived server-side from trusted upstream responses.
- Push subscription deletion requires both endpoint and session user ID.
- Push endpoints require HTTPS, no credentials, standard port 443, and an allowlisted push-service hostname suffix. Validation occurs both when saving and before sending.
- Preference writes return failure when persistence fails; there is no public-table fallback.

Ingestion contracts:

- `upsertPosts.ok` means every expected batch succeeded.
- The result contains confirmed IDs and failed IDs/batches.
- Cache and push receive confirmed rows only.
- A partial write produces an upstream error response while preserving confirmed IDs for an idempotent retry.
- `existingIds` aborts the run on any HTTP failure or invalid response rather than returning an incomplete set.
- External FXTwitter/translation JSON is parsed through narrow runtime guards before dates and nested fields are used.
- Favorite filtering happens before selecting the top three stories for each subscriber.

The ingest lock uses an ownership token. Redis acquisition is `SET NX` with a TTL; renewal and release compare the token atomically. A `finally` block releases only the caller's lock. The single-process memory fallback remains acceptable for the current one-container ceiling and is documented as such.

### Increment D — Health, CI, and behavioral gates

Health is separated by purpose:

- `/api/health/live`: process liveness only; used by Docker and never depends on news freshness.
- `/api/health`: Supabase readiness plus `ai`, `tech`, and `brasil` freshness/age fields. It returns 503 for dependency or freshness failure.

CI becomes evidence for the deployable artifact:

1. Install the pinned Playwright Chromium.
2. Run unit/behavior tests, typecheck, and lint.
3. Build with `vite build` without production secrets or database mutation.
4. Start `.output/server/index.mjs` with explicit safe test configuration.
5. Run browser/live smokes against that artifact.
6. Fail, rather than skip, when Chromium or the required server is absent in CI.
7. Build and cold-start the Docker image with test secrets after production runtime validation exists.

The 12 current lint warnings are fixed in production code first. Only then does the lint script add `--max-warnings=0`. Gate changes must demonstrate that fewer states pass; no bypass environment or skip flag is introduced. The old and new gates are compared with `/home/marce/bin/audit-gate-diff.sh`.

Behavioral tests replace the highest-risk source-regex contracts first:

- Production/dev/preview configuration matrix and env-less build.
- HTTP/session tests proving 401/403 and cross-user isolation.
- Dedicated-table failure is an error, never a public-table fallback.
- Partial second upsert batch and confirmed-row-only push/cache.
- `existingIds` 500, timeout, and malformed body.
- Lock ownership, renewal, exception release, and stale-owner safety.
- Section-specific health and unavailable Supabase.
- VAPID key mismatch resubscription and invalid-subscription cleanup.

### Increment E — Product truth and accessibility

- Replace the AppChrome subject pseudo-listbox with a native labeled `select`.
- Add one skip link and a shared `main#conteudo-principal` target.
- Guarantee exactly one `h1` on home, login loading, and article routes; cards use the next semantic heading level.
- Announce unread stories with screen-reader text.
- During bulk selection, expose `aria-pressed` instead of `aria-expanded`.
- Replace invalid `listbox > option > button` structures with native select or ordinary labeled button lists.
- Add a global visible `:focus-visible` style and restore labels where outlines were removed.
- Remove manifest orientation locking.
- Remove the unsupported “mesmo offline” promise while keeping saved content persistence truthful.
- Separate empty, loading, and network-error states; the global error view shows a generic message, home/retry actions, and never raw exception text.
- Persist source notification preference only after permission and subscription succeed.
- Stabilize SSR snapshots for localStorage/matchMedia-derived state, then update after mount.
- Confirm destructive reset/delete actions with the native confirmation dialog.
- Add route-specific title/description metadata and replace stale Google Drive/“IA — NEWS” copy.
- Add `aria-current`, live/busy status, sufficient contrast, known avatar dimensions, media aspect-ratio reservation, and an accessible media-link name.
- Put group/query/sort state in URL search parameters; transient expansion remains local.
- Listen for system theme changes while the app is open.
- Render a real empty state in grouped Fontes results.
- Label videos. Caption tracks are rendered only when caption data exists; captions are not fabricated.

### Increment F — Performance, deletion, and documentation

- Keep only critical CSS inline and serve the full stylesheet as a cacheable asset.
- Preserve the `Tip` caller API but implement it with native accessible title/label behavior; remove the Radix tooltip provider and dependency.
- Replace the sole shared `Button` use with a native button, then remove `class-variance-authority` and `@radix-ui/react-slot` if the dependency graph is empty.
- Remove the 15-second direct Supabase polling path and retain React Query refresh.
- Keep one SWR/in-flight cache layer in `supabase.ts`; remove the unreachable cloud-list fallback and duplicate feed cache.
- Use `content-visibility: auto` for long feed/source lists and prioritize only the first likely LCP image.
- Remove confirmed dead exports, wrappers, constants, `auth/gates.tsx` if still unused after auth work, and the two disconnected legacy sync scripts.
- Remove direct dependencies proven redundant after a clean install/build: `@tanstack/router-plugin`, `lightningcss`, and `eslint-plugin-prettier`.
- Do not mass-convert `.mjs/.d.mts` pairs in this program; conversion has broad churn and no production outcome. Convert a pair only when its implementation is already being changed.
- Update README, `.env.example`, architecture, state, active epic decisions, deployment runbook, migration comments, and root metadata after the deployed state is verified. Historical bug/cutover reports remain historical.

## 4. Runtime data flow after completion

```text
cron -> guarded ingest -> FXTwitter/translation -> validated news rows -> public.posts
                                              -> confirmed rows -> one cache -> feed
                                              -> per-user filter -> Web Push

browser session -> user_watches / user_prefs / push_subscriptions (owner-scoped)
cron/admin      -> x_profiles (global catalog)
SSR/feed        -> public.posts + x_profiles (read-only application view)
Better Auth     -> persistent Postgres
```

No browser request receives or sends a privileged Supabase key. No private user domain falls back into the anonymous news table.

## 5. Error handling and observability

- Startup errors name the missing variable, never its value.
- External-call failures include operation, status, attempt, and bounded safe context; response bodies and keys are redacted.
- Ingest logs one structured summary with scanned, confirmed, failed, cached, pushed, profile, duration, and lock-owner outcome fields.
- Partial ingestion is visible as failure to cron/monitoring even when some rows were committed.
- Health reports section ages and dependency state without exposing configuration.
- Auth rate limiting receives the real client IP from the trusted Nginx header.
- Cron uses bounded retries with backoff and exits nonzero after the final failure.

## 6. Rollout and rollback

1. Capture pre-migration row counts and an export of every synthetic row category.
2. Create dedicated tables and production secrets without disabling old keys.
3. Run database/auth migrations.
4. Deploy the compatible application with the new keys and schemas.
5. Smoke home, each section, login/callback, authenticated prefs/watch, ingest, profile read, push subscription, and health.
6. Restart the container and prove the authenticated session/data persist.
7. Disable legacy Supabase API keys and re-run smokes. Re-enable them only as the bounded rollback if the new API key path fails.
8. Rotate VAPID and verify client resubscription. The old private key is not retained as a fallback.
9. Remove synthetic rows only from the reviewed exact-ID manifest.
10. Revoke the legacy Supabase signing secret after the documented token-overlap window and final usage check.

Application rollback is the previous Docker image plus the still-compatible expanded schema. Destructive schema contraction is deferred until the new release has remained healthy and the export is verified.

## 7. Acceptance criteria

- No tracked or built artifact contains a Supabase privileged key or VAPID private key.
- Production refuses missing runtime auth/database/secret configuration; `vite build` remains env-independent.
- Login succeeds on the canonical domain and survives a container restart.
- Two test users cannot read, overwrite, or delete each other's watch, preference, or push records.
- Anonymous Supabase access cannot read private domain tables or synthetic private rows.
- A failed upsert batch cannot produce cache entries or notifications for unconfirmed rows.
- Concurrent/long ingest runs cannot overlap after a lock holder renews, and an old holder cannot unlock a new holder.
- Health distinguishes process, dependency, and freshness per section; Docker only restarts on liveness failure.
- CI runs the full browser suite with zero skips, builds the Nitro artifact and Docker image, and fails on any lint warning.
- Each audited route has one `h1`, a working skip link, named interactive controls, visible keyboard focus, and no forced portrait orientation.
- The application no longer promises unavailable offline behavior or reports network errors as empty results.
- Full application CSS is cacheable rather than repeated inline; duplicate browser polling and cache layers are removed.
- Dead scripts/exports and removable dependencies have zero consumers before deletion, followed by clean install, build, tests, typecheck, lint, and production smoke.
- Documentation describes the verified deployed architecture and no longer preserves the unsafe “do not rotate” decision.

## 8. Human-controlled gates

Implementation can prepare and validate the code, migrations, generated VAPID pair, and deployment commands. The following actions require owner credentials or an explicit dashboard ceremony and will not be bypassed:

- Create/disable/revoke Supabase API and JWT signing keys.
- Install secret values in the production secret store.
- Provide or create the production OAuth client and register both callbacks.
- Provide the persistent production `DATABASE_URL`.
- Approve the final legacy-key revocation after usage and token-expiry checks.

No secret value is recorded in this document, Git, logs, command output, or chat.

## 9. Explicit non-goals

- Microservices, event bus, queue platform, or multiple production replicas.
- Full offline shell/article caching.
- A new design system, state manager, validation dependency, or ORM.
- Rewriting Git history after key revocation unless a compliance requirement specifically demands it.
- Bulk `.mjs/.d.mts` conversion unrelated to a touched behavior.

These non-goals are deliberate: the confirmed risks are resolved with a smaller single-runtime architecture.
