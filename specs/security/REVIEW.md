# Security review — full hardening release

## Scope

- Historical range: `db73cfb15d228ba3a8dfeaa373a27d97e9e7f568..a50aac3` on `codex/full-hardening` (270 tests).
- Re-audit 2026-08-17 on `7c53d1f` / current `main`: 285 tests, 0 findings at confidence >= 8/10.
- Areas: runtime configuration and secrets, Better Auth/session boundaries, Supabase REST and private tables, Web Push ownership/SSRF, ingest leases and partial writes, health/readiness, browser inputs, Docker/CI release gates, and deleted broker paths.
- Production secret values were not printed or copied into this report.

## Review result

No open finding with confidence >= 8/10 was identified in the reviewed range or in the 2026-08-17 re-audit.

The reviewed controls include explicit production-mode validation, server-side ownership guards, allowlisted push endpoints, owner-scoped subscription deletion, token-owned ingest leases, confirmed-write propagation, fail-closed malformed payload handling, same-origin auth cookies, and mandatory release smokes.

## Evidence

- Historical mandatory suite (hardening range): 270 passed, 0 failed, 0 skipped against the freshly built Nitro server.
- Auditoria 2026-08-17: 285 passed, 0 failed, 0 skipped; typecheck and lint clean.
- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run build`: passed.
- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- Focused auth suite: 11 passed, including six-character password behavior and broker removal.
- Manual browser evidence: the allowlisted account was created and then signed in successfully; bootstrap signup was closed afterward.

## 2026-08-17 re-audit — closed

Accepted findings F-P1-01 through F-P3-03 are implemented and deployed.
Production: `news-news:2ab7717` on `127.0.0.1:3080`. Suite at close: 288
passed. No finding at confidence >= 8/10. Keys were not rotated.

Out of scope (cruzada): unify extras/`user_watches`, merge `groupStyle`,
redesign `posts`/`x-last`, delete `/api/feed` or `/api/profile`, cut
zod/bridge/`cn`, hover/Title Case/virtualize, empty-feed rewrite,
`grill-with-docs` on `prefs-sync`→`admin`.

## Release note

Production on port 3080 runs `news-news:2ab7717` with the host `.env` outside
the image. Rollback: `NEWS_IMAGE_TAG=3bfa24f docker compose up -d --no-build news`.
Better Auth migrations stay additive and explicit.
