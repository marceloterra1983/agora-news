# Story e04s08: Close confirmed post-audit gaps

## 1. Identity

- Story: `e04s08`
- Epic: `e04-full-hardening`
- BCP: 8

## 2. Status

Failing by design. The audit is complete and the current gates pass, but the
public feed still reads the union of private watches and the remaining UI,
operational, documentation and simplification recommendations are not closed.

## 3. Type

Fix, security, correctness, accessibility, operations and refactor.

## 4. Risk

P0. The first slice changes a public cache boundary that currently consumes
owner-scoped data. Later slices are P2/P3 and cannot start until that boundary
has a focused passing regression test.

## 5. User

Anonymous visitors need the stable public catalog. The signed-in owner needs
the public catalog plus only the sources added by that owner. Neither side may
observe another user's watched sources.

## 6. Problem

`serverCatalogFor()` calls `listAllWatchAccounts()` on the public feed path;
`loadNews()` and `loadFeed()` also resolve different catalog snapshots and
filter twice, which can discard allowed owner stories. The audit additionally
confirmed a first-paint theme mismatch, missing form metadata and live regions,
unbounded host cron logs, incomplete operational backup metadata, stale release
evidence and small zero-consumer code paths.

## 7. Outcome

The feed resolves one request-scoped catalog: public profiles for anonymous
traffic and public profiles plus the current user's watches for authenticated
traffic. Downloaded and retained snapshots are filtered by that same catalog,
and personalized responses are never publicly cached. The remaining confirmed
UI, operation, documentation and P3 cleanup items close behind the security
gate without adding packages or infrastructure.

## 8. Purpose of affected modules

`server-catalog.ts` defines which handles a request may see; `server-news.ts`
resolves request/session context; `feed.ts` downloads and filters one feed;
`watch.ts` owns public-vs-owner-vs-ingest access; theme/PWA modules own initial
browser state; backup/runbook files own recoverability; the final cleanup
removes only symbols proven to have no runtime caller.

## 9. Callers

SSR loaders, the `/api/feed` route, React Query feed refresh, pagination,
`/api/watch`, ingest and ingest-scan, section catalog hooks, Fontes/Buscar,
accessibility and release tests, the production cron, backup-to-Drive and the
operator runbook.

## 10. Contracts to preserve

- `listAllWatchAccounts()` remains behind ingest-scan; ingest reuses the watch
  list already returned by that seam instead of reading it twice.
- `listUserWatchAccounts(userId)` remains owner-scoped and server-only.
- Anonymous feed behavior and public profile allowlisting remain stable.
- Authenticated feed can include only the current user's watched handles.
- Valid empty feeds stay `live: true`; dependency failure stays truthful.
- The 60-second React Query poll and single Supabase SWR cache remain unchanged.
- Builds remain environment-less and migrations remain explicit.
- Existing keys remain active; no rotation or revocation occurs.

## 11. Reason for Depth

No new architecture layer is justified. One optional `userId`/catalog parameter
on existing seams and reuse of `getSessionUser()` provide the smallest complete
ownership fix; native `logrotate` covers host retention.

## 12. External dependencies and Slopcheck

- `[OK]` Better Auth session verification: already installed and already exposed
  by `getSessionUser()`.
- `[OK]` TanStack Start/Query and React: already installed and unchanged.
- `[OK]` host `logrotate 3.21.0`: native platform facility already installed.
- No new npm, service, queue, cache or monitoring dependency is introduced.

## 13. Data flow

The request resolves an optional verified user ID, loads public profiles and
only that user's watches, builds one `SectionCatalog`, downloads matching public
posts and reuses the same catalog for final filtering. Ingest independently
loads the union of watches. Anonymous responses contain no private extras;
personalized responses use `private, no-store`.

## 14. Error handling

Session absence means anonymous catalog, not failure. Failure of the private
watch store must not broaden access: the owner receives the public catalog.
Supabase failures preserve the last known feed as `live: false`, but refilter it
through the current request catalog before returning it. Failed backup metadata
capture aborts the backup before publishing an incomplete snapshot.

## 15. Security model

User identity comes only from the verified Better Auth session. Client-supplied
IDs are never accepted. Public cache headers are forbidden when private watches
participate. Tests use synthetic user IDs and handles and print no credentials.
The affected-path security review must report no new finding at confidence 8/10
or higher before deployment.

## 16. Requirements

#### MODIFIED: Feed catalog ownership

**Before:** Public and authenticated feed requests use the global union of
`user_watches` from every owner.

**After:** Anonymous requests use only public profiles; authenticated requests
add only `listUserWatchAccounts(currentUserId)`; the global union is exclusive
to ingest and ingest-scan.

#### MODIFIED: Feed catalog consistency

**Before:** `loadNews()` and `loadFeed()` resolve separate catalogs and the
payload is filtered again without the catalog that selected it.

**After:** One request-scoped catalog is reused for download, every filter and
any retained `lastGood` fallback after a dependency failure.

#### MODIFIED: HTTP cache boundary

**Before:** `/api/feed` declares public CDN caching even when private watches can
influence the response.

**After:** Personalized feed responses are `private, no-store`; a response may
be publicly cached only when its catalog is provably public-only.

#### MODIFIED: Initial theme and PWA state

**Before:** The theme boot script changes the root class but leaves
`theme-color` light until React effects run; install-state changes are not
announced and form controls omit stable names.

**After:** First-paint theme metadata matches the resolved theme, PWA state
changes are announced, and audited inputs have stable `name`/autocomplete.

#### ADDED: Host log retention and operational recovery metadata

Cron logs have bounded native logrotate policy. Each production snapshot records
the exact wrapper and user crontab needed to restore scheduling and alerts.

#### MODIFIED: Live release documentation

**Before:** state, impact, execution and security evidence name older commits,
test counts and key-rotation intentions.

**After:** live documents name the verified release and explicitly preserve the
current keys without rotation or revocation.

#### REMOVED: Confirmed zero-consumer exports

**Before:** dead exports and duplicated normalization remain in tracked runtime
modules and some tests depend on source delimiters.

**After:** (removed) — only symbols with zero production callers are deleted;
tests are adjusted to assert behavior instead of dead source boundaries.

## 17. Acceptance criteria

```gherkin
Scenario: Anonymous visitor cannot observe private watches
  Given user A and user B have different watched handles
  When an anonymous request loads the feed
  Then neither private handle participates in its catalog or response

Scenario: Owner sees only their own watched source
  Given the signed-in owner watches a handle with a stored public post
  When that owner loads and refetches the feed
  Then the post remains after every filter
  And no handle owned by another user appears

Scenario: Retained owner snapshot cannot cross users
  Given owner A has populated lastGood with a private watched handle
  And the next Supabase request fails
  When owner B or an anonymous visitor loads the same section
  Then the retained snapshot is refiltered and A's handle is absent

Scenario: Ingest still scans the union
  Given watched handles owned by multiple users
  When the ingest account list is built
  Then each distinct handle is scanned without returning ownership to clients

Scenario: Personalized feed is not publicly cached
  Given a verified session influences the catalog
  When the feed response is created
  Then its cache policy is private and no-store

Scenario: Initial UI metadata is truthful
  Given dark theme before hydration
  When the first document script runs
  Then theme-color and color-scheme are dark before React effects
  And audited inputs and PWA states have accessible metadata

Scenario: Operations are recoverable
  Given a completed production backup
  Then its manifest includes cron schedule and alert wrapper
  And host cron logs have a bounded retention policy

Scenario: Cleanup has no behavioral change
  Given the P0, P1 and P2 gates pass
  When zero-consumer exports are removed
  Then full tests, typecheck, lint and build remain green
```

## 18. Implementation steps

1. Add a synthetic RED contract for anonymous, owner A, owner B and ingest-union catalog behavior → verify: `node --experimental-strip-types --test scripts/public-catalog-privacy.behavior.test.mjs`
2. Resolve the verified user once, build a public-or-owner catalog, reuse it through `loadFeed()`/`toNews()` and remove the public global-watch read → verify: `node --experimental-strip-types --test scripts/public-catalog-privacy.behavior.test.mjs scripts/private-persistence.behavior.test.mjs scripts/catalog-feed-scope.test.mjs && npm run typecheck && rg -q 'no new security findings in affected paths' specs/security/e04s08-audit-remediation.md`
3. Make personalized `/api/feed` responses private/no-store and retain public-only behavior for anonymous requests → verify: `node --experimental-strip-types --test scripts/public-catalog-privacy.behavior.test.mjs scripts/release-gates.behavior.test.mjs && rg -q 'no new security findings in affected paths' specs/security/e04s08-audit-remediation.md`
4. Extend the accessibility contract, then align first-paint theme metadata, manifest colors, input names/autocomplete and PWA live states → verify: `node --experimental-strip-types --test scripts/accessibility-contract.test.mjs scripts/mobile-viewport.test.mjs`
5. Add a tracked native logrotate policy and make production snapshots include the validated cron wrapper and crontab → verify: `node --experimental-strip-types --test --test-name-pattern='log|cron|backup|restore' scripts/release-gates.behavior.test.mjs scripts/backup-contract.test.mjs && logrotate -d ops/logrotate/agora-news >/dev/null`
6. Align live state, impact, execution, security review and runbook evidence with the verified commit/test counts and the no-rotation key decision → verify: `node --experimental-strip-types --test --test-name-pattern='documentation|runbook|state' scripts/simplification-contract.test.mjs scripts/release-gates.behavior.test.mjs && git diff --check`
7. Remove only confirmed zero-consumer exports after a fresh caller scan; preserve `.mjs` catalog boundaries unless a failing contract proves drift → verify: `node --experimental-strip-types --test scripts/simplification-contract.test.mjs scripts/section-catalog.test.mjs scripts/catalog-feed-scope.test.mjs && npm run typecheck`
8. Run full regression, build, dependency audit and affected-path security review → verify: `npm test && npm run typecheck && npm run lint && npm run build && npm audit --omit=dev && rg -q 'no new security findings in affected paths' specs/security/e04s08-audit-remediation.md`
9. Build a versioned image, deploy with the existing environment, smoke anonymous/owner behavior and retain the prior image for rollback → verify: `CI_REQUIRED_SMOKES=1 NEWS_SMOKE_URL=https://news.automatizems.com npm test && curl -fsS https://news.automatizems.com/api/health/live >/dev/null && curl -fsS https://news.automatizems.com/api/health >/dev/null && rg -q 'no new security findings in affected paths' specs/security/e04s08-audit-remediation.md`

## 19. Verification script

Run the focused privacy suite first. Start the built artifact with synthetic
users and prove anonymous/A/B separation. Run browser checks for dark first
paint, input metadata and installation announcements. Dry-run logrotate and
create an isolated backup, verifying wrapper/crontab hashes without printing
contents. Run full gates and security review. Tag the current image, deploy the
new image with unchanged secrets, test anonymous feed and the owner account in
the connected browser, then keep the previous tag until the next healthy cron
and backup cycles complete.

## 20. Out of scope, risks and rollback

Key rotation/revocation, new auth providers, multiple replicas, a full offline
PWA, new packages, speculative env abstraction and broad normalization/`.mjs`
conversion are out of scope. The main risk is mixing personalized data with
public cache or a retained cross-user snapshot; any ambiguous cache result fails
closed to `private, no-store` and is refiltered. UI/ops/cleanup do not start
until the ownership suite passes. Rollback restores the retained image tag;
migrations are not needed and existing keys, database rows and backups are
preserved.
