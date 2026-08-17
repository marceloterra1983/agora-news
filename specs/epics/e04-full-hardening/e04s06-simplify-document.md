# Story e04s06: Shrink runtime cost and repair operational documentation

## 1. Identity

- Story: `e04s06`
- Epic: `e04-full-hardening`
- BCP: 5

## 2. Status

Completed; every task passes.

## 3. Type

Refactor, performance and documentation.

## 4. Risk

P0 in this combined security program because deleting an unknown credential consumer before revocation would be unsafe; individual display-only edits are lower risk.

## 5. User

Readers need less repeated CSS/JS/network cost; maintainers and operators need one real runtime path and documentation that matches production.

## 6. Problem

Full CSS is repeated inline, tooltip/button abstractions retain large dependency chunks, browser polling and server cache layers duplicate work, and confirmed dead code/docs preserve obsolete paths and decisions.

## 7. Outcome

The application serves cacheable CSS, uses one polling/cache path, removes only zero-consumer code/dependencies and records the verified production truth.

## 8. Purpose of affected modules

Root owns global CSS/providers; `Tip`/`Button` wrap shared UI primitives; feed/supabase/cache own freshness; package/lockfile own runtime dependency reachability; README/specs guide operation.

## 9. Callers

Every route receives root CSS/providers; roughly 22 controls call `Tip`; one PWA action calls `Button`; feed readers consume duplicated cache/polling; CI/build and operators consume package/docs.

## 10. Contracts to preserve

- Critical first paint remains styled while full CSS becomes cacheable.
- Icon controls remain named and discoverable.
- Feed freshness remains at the React Query 60-second contract.
- Deletions require zero runtime callers and a clean install/build/test.
- Historical reports remain unchanged as historical evidence.

## 11. Reason for Depth

No new abstraction is created. Existing root/cache/UI seams are made smaller, and native HTML replaces one-use wrappers.

## 12. External dependencies and Slopcheck

- `[OK]` Vite CSS assets and browser `title`/CSS capabilities: native existing platform.
- Candidate packages are removed, not added. Each removal is conditional on an empty direct-consumer graph and successful clean build.

## 13. Data flow

Critical CSS is inline once, full CSS is a hashed asset, React Query triggers the single server cache/read path, and documentation is updated from post-deploy evidence.

## 14. Error handling

CSS asset failure leaves critical shell styling. Cache failure falls through to the canonical data request without a synthetic public-table fallback. Dependency/dead-code removal is reverted if clean build or smoke fails.

## 15. Security model

Secret consumers are inventoried before deletion. Documentation never contains values. Removing tooltip/button/cache paths cannot remove accessible names, auth checks or trust-boundary validation.

## 16. Requirements

#### MODIFIED: CSS delivery

**Before:** Critical and full application CSS are both inlined into every HTML response.

**After:** Only critical CSS is inline; full CSS is a cacheable hashed asset.

#### REMOVED: Duplicate refresh/cache paths

**Before:** Direct 15-second browser polling and overlapping server SWR/cloud-list layers duplicate React Query/canonical storage behavior.

**After:** (removed) — one React Query refresh and one server SWR layer remain.

#### REMOVED: Zero-consumer runtime paths

**Before:** Legacy scripts, wrappers, exports and direct dependencies remain without production callers.

**After:** (removed) — only after consumer and artifact checks prove absence.

#### MODIFIED: Operational documentation

**Before:** Docs describe Google Sheets, PM2/Vite dev, anonymous writes and an unsafe no-rotation decision.

**After:** Docs describe the verified Docker/Nitro, dedicated persistence, persistent auth and rotation state.

## 17. Acceptance criteria

```gherkin
Scenario: Cacheable CSS
  Given two route responses
  When their HTML and stylesheet references are inspected
  Then full application CSS is not repeated inline and the hashed asset is shared

Scenario: Feed refresh
  Given the home feed remains open for one minute
  When network requests are counted
  Then only the documented React Query refresh path runs

Scenario: Candidate deletion
  Given a wrapper, export, script or dependency is selected
  When runtime consumers and built artifacts are searched
  Then deletion occurs only when both are empty and all verification passes

Scenario: Documentation truth
  Given the hardened deployment has passed smoke
  When README, environment, architecture and state docs are inspected
  Then each describes that deployed state and no credential value
```

## 18. Implementation steps

1. Add CSS/bundle/network budgets and zero-consumer deletion contracts and observe failure → verify: `node --experimental-strip-types --test scripts/simplification-contract.test.mjs`
2. Serve full CSS as a hashed asset while retaining only measured critical CSS inline → verify: `node --experimental-strip-types --test --test-name-pattern="CSS" scripts/simplification-contract.test.mjs && npm run build`
3. Preserve `Tip` caller behavior with native accessible naming, inline the sole Button use and remove now-empty UI dependencies → verify: `node --experimental-strip-types --test --test-name-pattern="Tip|Button|dependency" scripts/simplification-contract.test.mjs`
4. Remove direct 15-second polling, duplicate SWR/cloud-list cache and their unused imports/exports → verify: `node --experimental-strip-types --test --test-name-pattern="poll|cache" scripts/simplification-contract.test.mjs`
5. Delete only confirmed zero-consumer scripts/exports/dependencies and regenerate the lockfile → verify: `node --experimental-strip-types --test --test-name-pattern="dead|dependency" scripts/simplification-contract.test.mjs && npm run build`
6. Update README, env example, architecture/state/epic decisions and deployment/migration comments from verified evidence → verify: `node --experimental-strip-types --test --test-name-pattern="documentation" scripts/simplification-contract.test.mjs && git diff --check`
7. Run clean install, full verification and security review of affected root/cache/dependency paths with no new findings → verify: `npm ci && npm test && npm run typecheck && npm run lint && npm run build && npm audit --omit=dev`

## 19. Verification script

Measure HTML/asset sizes and request counts before/after, inspect built chunk membership, verify every deleted symbol/package has zero consumers, run clean install/build/browser smoke, then compare docs to the deployed container/env-name/schema evidence.

## 20. Out of scope, risks and rollback

No mass `.mjs/.d.mts` conversion or new cache platform is included. Native tooltips are less visually rich but keep accessible names and remove substantial JS. Each deletion is a separate commit-sized step and can be restored without schema rollback.
