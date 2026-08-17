# Story e04s04: Prove health and release artifacts in CI

## 1. Identity

- Story: `e04s04`
- Epic: `e04-full-hardening`
- BCP: 5

## 2. Status

Passing locally. The mandatory Nitro suite has 240 passing tests with zero
skips; typecheck, zero-warning lint, build and Docker cold-start smokes pass.
Three blind reviews closed with no open finding at confidence 8 or greater.

## 3. Type

Fix and infrastructure.

## 4. Risk

P0. Release gates currently permit unbuilt or untested production states.

## 5. User

Operators need Docker to restart only a dead process and CI to prove the exact artifact that will be deployed.

## 6. Problem

One global freshness value masks stale sections, Compose treats 503 as healthy, browser tests silently skip and CI does not build/start Nitro or Docker.

## 7. Outcome

Liveness, readiness and section freshness are explicit; CI runs all required tests against real Nitro and Docker artifacts with a zero-warning lint gate.

## 8. Purpose of affected modules

Health routes expose operational state, Compose controls container restarts, package scripts define build/lint behavior, and the GitHub workflow protects merges/releases.

## 9. Callers

Docker healthcheck, Nginx/operator smoke, GitHub Actions, deployment runbook and every pull request.

## 10. Contracts to preserve

- `/api/health` remains the detailed monitoring endpoint.
- Content staleness does not cause a Docker restart loop.
- Local browser tests may remain optional only outside a job explicitly designated as mandatory.
- Build does not run migrations.

## 11. Reason for Depth

Two small endpoints are clearer than mode flags: liveness has no dependency, while detailed health owns readiness/freshness and its 503 semantics.

## 12. External dependencies and Slopcheck

- `[OK]` GitHub Actions, Docker/Compose and Playwright Chromium: existing delivery platforms/tooling.
- No new package is added; the installed Playwright dependency supplies the browser.

## 13. Data flow

CI installs, runs unit/type/lint, builds Nitro, starts the artifact, runs mandatory browser smokes, builds/starts Docker, probes liveness/detail, and publishes no artifact when any step fails.

## 14. Error handling

Required CI tests fail with a clear missing-browser/server message instead of skip. Health treats malformed timestamps/dependency failures as unhealthy detail while liveness remains process-only.

## 15. Security model

CI uses safe test secrets and never production values. Health bodies expose state/age only. Gate changes only tighten acceptance and are compared old versus new.

## 16. Requirements

#### MODIFIED: Health semantics

**Before:** One endpoint combines process and global newest-post freshness; Compose accepts both 200 and 503.

**After:** `/api/health/live` is process-only for Compose; `/api/health` reports dependency and freshness for each section and uses 503 meaningfully.

#### MODIFIED: Required CI browser coverage

**Before:** Missing Chromium/server turns up to eight tests into skips while CI remains green.

**After:** The required CI job provisions both and fails on any skipped mandatory smoke.

#### MODIFIED: Build and lint gates

**Before:** CI omits production build and lint exits zero with warnings.

**After:** CI builds/starts artifacts and lint rejects every warning after the existing warning set is corrected.

## 17. Acceptance criteria

```gherkin
Scenario: One section is stale
  Given IA is fresh and Tech is stale
  When detailed health is requested
  Then the response identifies both section states and returns 503

Scenario: Feed is stale but process is alive
  Given detailed health returns 503
  When Compose checks liveness
  Then the container remains healthy

Scenario: Required browser is missing
  Given the mandatory CI smoke job has no Chromium
  When tests start
  Then the job fails and records zero skipped success

Scenario: Deployable artifact
  Given a pull request
  When CI completes
  Then the built Nitro server and Docker image both cold-start and pass smoke
```

## 18. Implementation steps

1. Add health matrix and mandatory-smoke gate tests and observe failure → verify: `node --experimental-strip-types --test scripts/release-gates.behavior.test.mjs`
2. Add process-only liveness and per-section readiness/freshness health → verify: `node --experimental-strip-types --test --test-name-pattern="health" scripts/release-gates.behavior.test.mjs`
3. Point Compose at liveness and prove detailed 503 does not restart a living process → verify: `node --experimental-strip-types --test scripts/release-gates.behavior.test.mjs scripts/docker-prod.test.mjs`
4. Fix all existing lint warnings, then tighten the script to `--max-warnings=0` → verify: `npm run lint`
5. Make build hermetic and make required live tests fail instead of skip in CI mode → verify: `npm run build && node --experimental-strip-types --test --test-name-pattern="mandatory" scripts/release-gates.behavior.test.mjs`
6. Provision Chromium, start Nitro, run smokes, then build/cold-start Docker in CI → verify: `npm test && npm run typecheck && npm run lint && npm run build`
7. Prove the gate accepts no state previously rejected and review affected paths with no new security findings → verify: `/home/marce/bin/audit-gate-diff.sh /home/marce/news /home/marce/news-full-hardening origin/HEAD`

## 19. Verification script

Run health against fresh/stale/empty/unavailable fixtures, run CI locally with required-smoke mode, cold-start the Nitro artifact and Docker image, and inspect that test summaries contain zero skips.

## 20. Out of scope, risks and rollback

No monitoring vendor is added. A quiet but intentional section may require a future per-section freshness policy; the initial thresholds remain explicit and tested. Gate changes are reverted as a unit if the old/new comparison detects broader acceptance.
