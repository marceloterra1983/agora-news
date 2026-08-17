# Story e04s03: Make ingestion and notifications correct under failure

## 1. Identity

- Story: `e04s03`
- Epic: `e04-full-hardening`
- BCP: 8

## 2. Status

Passing locally. The full suite has 230 passing tests with zero skips,
typecheck and dependency audit are clean, and the dual-blind review passed at
97/100 and 96/100 with no must-fix finding. The affected-path security review
has no open finding at confidence 8 or greater.

## 3. Type

Fix and reliability.

## 4. Risk

P0. Bugs can create duplicate or phantom notifications and overlapping writes.

## 5. User

Readers need notifications and feed entries only for news that was actually persisted; operators need retries that do not duplicate work.

## 6. Problem

Partial upsert success is reported as complete, existing-ID lookup fails open, and a fixed-TTL lock can expire or be released by the wrong run.

## 7. Outcome

Only confirmed rows flow to cache/push, discovery failure aborts safely, upstream data is validated and the ingest lock is token-owned and renewable.

## 8. Purpose of affected modules

`admin.ts` batches REST writes; `ingest-fetch.ts` discovers existing IDs and upstream posts; `ingest.ts` orchestrates; cache helpers coordinate the lock; push dispatch selects per-subscriber stories.

## 9. Callers

`/api/ingest`, the host cron, cache invalidation/list readers, profile enrichment, last-post updates and Web Push subscribers.

## 10. Contracts to preserve

- Re-running the same source IDs remains idempotent.
- Successful single-batch ingestion keeps current response fields where compatible.
- Cache is optional but never claims unpersisted rows.
- One-container memory-lock fallback remains documented.

## 11. Reason for Depth

No new orchestration layer is added; richer result values deepen the existing shared `upsertPosts` and lock seams so every caller observes the same truth.

## 12. External dependencies and Slopcheck

- `[OK]` Supabase REST, Redis REST, FXTwitter, Google Translate and `web-push`: existing integrations.
- No new validation package is added; narrow trust-boundary type guards cover used fields only.

## 13. Data flow

Acquire token lock, discover IDs, fetch/validate posts, translate, batch upsert, collect confirmed IDs, update cache and notify only confirmed rows, enrich profiles, emit summary, and owner-release the lock in `finally`.

## 14. Error handling

Any failed existing-ID chunk aborts. Partial write returns failure plus confirmed IDs for retry evidence. Invalid external payloads are rejected with bounded context. Cron exits nonzero after bounded retries.

## 15. Security model

Ingest remains bearer-guarded. Lock tokens and error logs are non-secret random identifiers; upstream response bodies and credentials are not logged. Push endpoint validation from e04s02 is rechecked before send.

## 16. Requirements

#### MODIFIED: Batch write success

**Before:** One successful chunk can make the entire upsert `ok` and all requested rows flow downstream.

**After:** `ok` requires every chunk; confirmed/failed IDs are explicit and only confirmed rows flow downstream.

#### MODIFIED: Existing-ID failure

**Before:** Failed chunks are skipped, so known posts can appear new.

**After:** Any incomplete lookup aborts the run before fetch/write/push.

#### MODIFIED: Ingest lock

**Before:** A fixed 90-second value expires without renewal and release is not owner-aware.

**After:** A token-owned lock renews during work and only its owner can release it.

## 17. Acceptance criteria

```gherkin
Scenario: Second upsert batch fails
  Given the first batch succeeds and the second fails
  When ingestion completes
  Then the response is a failure and only first-batch IDs may be cached or notified

Scenario: Existing-ID lookup fails
  Given any lookup chunk returns 500 or malformed JSON
  When ingestion runs
  Then no downstream fetch, write or push occurs

Scenario: Long ingest renews its lock
  Given a run exceeds the original lock TTL
  When renewal succeeds
  Then a second run cannot acquire the lock

Scenario: Old owner releases late
  Given a new run owns a replacement lock
  When the old run executes cleanup
  Then the new lock remains intact

Scenario: Favorite appears fourth globally
  Given a subscriber's favorite story is fourth in the global list
  When notifications are selected
  Then filtering occurs before the subscriber's top-three limit
```

## 18. Implementation steps

1. Add partial-write, lookup failure, lock ownership/renewal, malformed payload and favorite-order tests and observe failure → verify: `node --experimental-strip-types --test scripts/ingest-correctness.behavior.test.mjs`
2. Return complete/confirmed/failed batch results from `upsertPosts` and route only confirmed rows downstream → verify: `node --experimental-strip-types --test --test-name-pattern="upsert|confirmed" scripts/ingest-correctness.behavior.test.mjs`
3. Make existing-ID lookup and external payload parsing fail closed → verify: `node --experimental-strip-types --test --test-name-pattern="existing|payload" scripts/ingest-correctness.behavior.test.mjs`
4. Add token compare-and-renew/release primitives and wrap orchestration in owner-safe `finally` cleanup → verify: `node --experimental-strip-types --test --test-name-pattern="lock" scripts/ingest-correctness.behavior.test.mjs`
5. Filter subscriber favorites before limiting, remove permanently invalid subscriptions and emit structured ingest summary → verify: `node --experimental-strip-types --test --test-name-pattern="favorite|subscription|summary" scripts/ingest-correctness.behavior.test.mjs`
6. Add bounded cron retry/nonzero-final-failure behavior and run relevant regressions → verify: `node --experimental-strip-types --test scripts/ingest-correctness.behavior.test.mjs scripts/agora-now.test.mjs scripts/review-next.test.mjs`
7. Run a security review of ingest, lock, push and logging paths with no new findings → verify: `npm test && npm run typecheck && npm audit --omit=dev`

## 19. Verification script

Run deterministic fake HTTP/Redis servers for each failure, assert call order and downstream IDs, then run one live staging ingest twice and compare database IDs, cache payload and push count.

## 20. Out of scope, risks and rollback

No queue or multi-replica distributed scheduler is added. If token renewal fails, the run fails rather than continuing without exclusivity. Rollback restores the previous image; writes remain idempotent and schema-compatible.
