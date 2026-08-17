# Security review — e04s08 catalog isolation

## Scope

Reviewed the pending catalog/feed change on branch
`codex/e04s08-audit-remediation`: `server-catalog.ts`, `feed.ts`,
`server-news.ts`, `/api/feed`, `watch.ts`, the new privacy behavior tests and
the story fallback contract. No secret values, cookies or production rows were
printed.

## Data-flow result

- Anonymous catalog construction no longer reads `user_watches`.
- Authenticated catalog construction uses only the verified session user ID and
  `listUserWatchAccounts(userId)`.
- `listAllWatchAccounts()` remains outside the public catalog path and is used
  by ingest scanning.
- `lastGood` snapshots are refiltered by the current request catalog before a
  degraded response is returned.
- `loadStory` no longer falls back to a cross-user shared `peekStory` snapshot.
- `/api/feed` is `private, no-store` and does not emit public CDN caching.

## Findings

No new security findings in affected paths at confidence 8/10 or higher.

The original public-watch exposure from the audit is addressed by the
owner-scoped catalog and private cache policy. The retained-snapshot and
individual-story fallback paths were included in the review and are now
fail-closed.

## Evidence

- `node --experimental-strip-types --test scripts/public-catalog-privacy.behavior.test.mjs` — 3 passed.
- `node --experimental-strip-types --test scripts/story-pt.test.mjs` — 7 passed.
- `npm run typecheck` — passed.
- No mutating HTTP request, database write or key operation was performed.

## Review limitation

The repository does not contain `scripts/verify-cwe-fixture-sync.sh` or the
formal parallel-review helper, so this report records the manual data-flow
review and focused behavioral evidence.
