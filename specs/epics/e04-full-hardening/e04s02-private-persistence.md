# Story e04s02: Isolate private user domains in dedicated persistence

## 1. Identity

- Story: `e04s02`
- Epic: `e04-full-hardening`
- BCP: 8

## 2. Status

Passing locally and applied additively to production. The migration ran twice
with the same 296-row exact manifest; `public.posts` retained its count and ID
checksum, no legacy row was deleted, and the affected-path security review is
clean at confidence 8 or greater.

## 3. Type

Fix, security and data migration.

## 4. Risk

P0. Incorrect ownership or migration can expose or delete user data.

## 5. User

An authenticated user needs watches, preferences and subscriptions that only that user can read or change; every reader needs a trustworthy global profile catalog.

## 6. Problem

Global watch/profile writes lack resource authorization and several domains can fall back into anonymously readable synthetic `public.posts` rows.

## 7. Outcome

Dedicated tables and server contracts enforce ownership, global profiles are cron/admin managed, and private data fails closed.

## 8. Purpose of affected modules

`watch.ts`, `prefs-server.ts`, `push-server.ts` and `profile-store.ts` hide domain persistence; their API routes apply session/write guards; ingest consumes the global profile catalog plus a deduplicated private-watch union.

## 9. Callers

Fontes, preferences sync, notification controls, search/profile cards, ingest scan/enrichment, last-post and the watch/profile/push API routes.

## 10. Contracts to preserve

- Existing UI-facing watch/preferences/push shapes remain stable where safe.
- Cron still discovers every watched handle without exposing another user's list.
- Global profile reads remain available to feed/search/Fontes.
- Migration preserves verified global profile/last-post data and exports unowned rows before cleanup.

## 11. Reason for Depth

The existing persistence modules are the correct seams; no repository or interface layer is added. Dedicated tables deepen those modules by removing unrelated storage fallbacks.

## 12. External dependencies and Slopcheck

- `[OK]` Supabase Postgres/REST: existing platform and operational boundary.
- `[OK]` Better Auth session IDs: existing authoritative user identity.
- No new package is introduced; SQL is idempotent and versioned in the repository.

## 13. Data flow

Session-authenticated routes pass only the verified user ID to owner-scoped stores. Cron uses a server-only union query. Profile enrichment writes `x_profiles`; preferences and subscriptions never traverse the news table.

## 14. Error handling

A missing/inaccessible table or failed write returns a bounded server error. `savePrefs` propagates failure. There is no fallback that changes privacy classification.

## 15. Security model

Private tables deny anon/authenticated direct access because Better Auth identities are not Supabase Auth identities. Server service access bypasses RLS, so every query also filters by the verified Better Auth user ID and is behavior-tested.

## 16. Requirements

#### MODIFIED: Watch ownership

**Before:** Authenticated users read/delete one global watch list and cron/UI share it.

**After:** UI/API access is owner-scoped; cron receives only a deduplicated server-side union.

#### MODIFIED: Profile mutation

**Before:** Any authenticated browser can seed global profile records.

**After:** Only cron/admin server paths mutate the global profile catalog; browsers request personal watches.

#### REMOVED: Private synthetic-post fallback

**Before:** Preferences, subscriptions, watches or profiles can be represented in `public.posts`.

**After:** (removed) — dedicated private/global tables are required and failures remain failures.

## 17. Acceptance criteria

```gherkin
Scenario: Cross-user isolation
  Given users A and B each have a watch and push subscription
  When user A lists or deletes records
  Then only user A's records are visible or changed

Scenario: Cron union
  Given two users watch the same handle
  When cron reads watched handles
  Then it receives that handle once without revealing ownership to public callers

Scenario: Persistence failure
  Given a dedicated table is unavailable
  When a private write is attempted
  Then the API reports failure and public.posts remains unchanged

Scenario: Legacy migration
  Given synthetic profile and unowned watch rows
  When the migration runs twice
  Then global profiles are preserved once and unowned watches are exported without arbitrary ownership
```

## 18. Implementation steps

1. Add cross-user, cron-union, fail-closed and idempotent-migration tests and observe failure → verify: `node --experimental-strip-types --test scripts/private-persistence.behavior.test.mjs`
2. Add idempotent SQL for `x_profiles`, `user_watches`, `user_prefs` and verified `push_subscriptions` grants/indexes → verify: `node --experimental-strip-types --test --test-name-pattern="schema" scripts/private-persistence.behavior.test.mjs`
3. Make watch UI/API owner-scoped and add the separate cron union contract → verify: `node --experimental-strip-types --test --test-name-pattern="watch" scripts/private-persistence.behavior.test.mjs`
4. Make preferences and push persistence owner-scoped, failure-aware and endpoint deletion owner-safe → verify: `node --experimental-strip-types --test --test-name-pattern="prefs|push" scripts/private-persistence.behavior.test.mjs`
5. Restrict global profile mutation to cron/admin and remove profile/post fallback reads after verified migration → verify: `node --experimental-strip-types --test --test-name-pattern="profile" scripts/private-persistence.behavior.test.mjs`
6. Produce an exact-ID/count migration export, run the idempotent migration and prove no private synthetic write path remains → verify: `node --experimental-strip-types --test scripts/private-persistence.behavior.test.mjs scripts/harden-contract.test.mjs`
7. Run a security review of all ownership and persistence paths with no new findings → verify: `npm test && npm run typecheck && npm audit --omit=dev`

## 19. Verification script

Apply schema to an isolated database, run twice, exercise two authenticated users, verify direct anon reads fail, compare pre/post row counts, and inspect the exact legacy export before any production cleanup.

## 20. Out of scope, risks and rollback

Unowned legacy watches are not assigned to a guessed user. Schema contraction and synthetic-row deletion are delayed. Rollback keeps expanded tables and restores the prior image; the exported exact-ID manifest protects against data loss.
