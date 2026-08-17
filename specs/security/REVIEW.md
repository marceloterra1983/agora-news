# Security review — full hardening release

## Scope

- Branch: `codex/full-hardening`
- Range: `db73cfb15d228ba3a8dfeaa373a27d97e9e7f568..a50aac3`
- Areas: runtime configuration and secrets, Better Auth/session boundaries, Supabase REST and private tables, Web Push ownership/SSRF, ingest leases and partial writes, health/readiness, browser inputs, Docker/CI release gates, and deleted broker paths.
- Production secret values were not printed or copied into this report.

## Review result

No open finding with confidence >= 8/10 was identified in the reviewed range.

The reviewed controls include explicit production-mode validation, server-side ownership guards, allowlisted push endpoints, owner-scoped subscription deletion, token-owned ingest leases, confirmed-write propagation, fail-closed malformed payload handling, same-origin auth cookies, and mandatory release smokes.

## Evidence

- Mandatory suite: 270 passed, 0 failed, 0 skipped against the freshly built Nitro server.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run build`: passed.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- Focused auth suite: 11 passed, including six-character password behavior and broker removal.
- Manual browser evidence: the allowlisted account was created and then signed in successfully; bootstrap signup was closed afterward.

## Release note

The current production process on port 3080 is intentionally not modified until the hardening image is built and the post-merge smoke passes. The cutover must retain the existing `.env` outside the image and keep the Better Auth migration additive.
