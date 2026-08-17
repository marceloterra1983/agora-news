# Security review — e04s08 audit remediation

## Scope

Manual review of `codex/e04s08-audit-remediation`, range
`bb167f8..e5e1101`, covering public/owner catalog construction, retained feed
and story fallbacks, response caching, theme/PWA and form metadata, host
cron/backup capture, documentation, and confirmed zero-consumer deletions.
No secret values, cookies, production rows or key material were printed or
copied.

## Data-flow and operational result

- Anonymous catalog construction never reads `user_watches`.
- Authenticated catalog construction uses only the verified session user ID and
  `listUserWatchAccounts(userId)`.
- `listAllWatchAccounts()` remains outside public request paths and is used by
  ingest scanning only.
- `lastGood` snapshots are refiltered through the current request catalog
  before a degraded response is returned.
- `loadStory` requires the canonical post download and no longer uses a shared
  `peekStory` fallback.
- `/api/feed` is `private, no-store` and does not emit public CDN caching.
- Backup additions capture the host crontab and fixed wrapper path under the
  existing mode-700 staging directory; the `.env` remains age-encrypted.
- The logrotate policy contains no credentials and only targets the known
  `/home/marce/backups/news` log paths.

## Findings

No new security findings in affected paths at confidence 8/10 or higher.

Machine-readable result: `no new security findings in affected paths`.

The original public-watch exposure, cross-owner retained snapshot risk and
individual-story fallback risk are covered by owner-scoped catalogs, request
private caching, refiltered degraded responses and canonical story reads. The
UI and cleanup changes do not widen trust boundaries. Existing Supabase,
Better Auth, Web Push, ingest lease and SSRF controls were regression-tested
by the full suite.

## Evidence

- `npm test` — 283 passed, 0 failed, 0 skipped.
- `npm run typecheck` — passed.
- `npm run lint` — passed with zero warnings.
- `npm run build` — passed; generated Nitro node-server artifact.
- `npm audit --omit=dev --audit-level=high` — 0 vulnerabilities.
- Focused privacy/story/release/backup/accessibility contracts — passed.
- No mutating Supabase request, production deploy, key rotation or revocation
  was performed by this review.

## Review limitation

The repository does not contain `scripts/verify-cwe-fixture-sync.sh` or the
formal parallel-review helper. This report therefore records the manual
affected-path review plus deterministic behavioral evidence.
