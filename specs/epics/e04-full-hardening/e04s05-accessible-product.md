# Story e04s05: Deliver an accessible and truthful product shell

## 1. Identity

- Story: `e04s05`
- Epic: `e04-full-hardening`
- BCP: 8

## 2. Status

Completed; all tasks pass.

## 3. Type

Fix and product quality.

## 4. Risk

P0 for release quality because shared shell changes affect every route; security risk is low.

## 5. User

Keyboard, assistive-technology, mobile and ordinary readers need predictable navigation, honest states and controls whose visible and accessible meaning agree.

## 6. Problem

The audited UI has missing heading/skip structure, invalid composite widgets, visually-only unread/selection state, forced orientation, false offline/error states and unstable SSR-derived settings.

## 7. Outcome

Core routes use native semantics, stable server/client state, actionable errors and truthful product copy with automated browser evidence.

## 8. Purpose of affected modules

`AppChrome` owns shared navigation/main layout; story/article/media components present news; Fontes owns source management; root/head/PWA/error routes define document and product-wide behavior.

## 9. Callers

All eight routes, every feed/story card, source controls, saved/search/configuration screens, service-worker registration and browser history/share links.

## 10. Contracts to preserve

- PR #42 mobile text scale and PR #41 fixed chrome remain unchanged.
- Real links remain links and existing route/search types remain valid.
- Saved items continue local persistence; only the unsupported shell-offline claim is removed.
- Existing light/dark/reduced-motion behavior remains.

## 11. Reason for Depth

Shared AppChrome/root fixes are intentionally centralized because all routes consume the same navigation, main target and provider tree; route-specific content stays local.

## 12. External dependencies and Slopcheck

- `[OK]` React/TanStack/Playwright: existing stack.
- Native HTML/CSS replaces invalid or oversized component behavior; no accessibility package is added.

## 13. Data flow

URL search params own shareable group/query/sort state; SSR emits stable defaults; client effects subscribe to local preference/system changes; async routes expose explicit loading/empty/error status.

## 14. Error handling

Network errors never become empty results. Global errors show generic copy plus retry/home. Notification preference changes commit only after permission/subscription success. Destructive actions require native confirmation.

## 15. Security model

Raw exception text is not rendered. External media links keep safe href/referrer behavior. No origin/auth guard is weakened by UI work.

## 16. Requirements

#### MODIFIED: Navigation semantics

**Before:** No skip link/main target; home begins at `h3`; pseudo-listboxes contain interactive descendants.

**After:** One skip link/main target and one `h1` per route; native select or ordinary button-list semantics are used.

#### MODIFIED: Product state truth

**Before:** Offline, notification and network states can claim success or emptiness that did not occur.

**After:** Copy and control state reflect completed capability; loading, empty and failure are distinct and announced.

#### MODIFIED: Responsive/accessibility state

**Before:** Portrait is forced and unread/bulk state can be visual-only.

**After:** Orientation is unrestricted and equivalent accessible state is exposed with visible focus and sufficient contrast.

## 17. Acceptance criteria

```gherkin
Scenario: Route landmarks
  Given any core route
  When it is rendered and hydrated
  Then it has one h1, one named main target and a keyboard-focusable skip link

Scenario: Unread and bulk selection
  Given an unread story and a picked source
  When a screen reader inspects them
  Then unread and pressed state are exposed without conflicting expanded semantics

Scenario: Search network failure
  Given the search request fails
  When results settle
  Then an actionable alert is shown instead of the empty-results message

Scenario: Notification setup fails
  Given permission or subscription creation fails
  When the user enables a source notification
  Then the preference remains disabled and the failure is announced

Scenario: SSR preference differs from local storage
  Given saved sort/theme/install state differs from the server default
  When hydration occurs
  Then there is no hydration error and the client updates after mount
```

## 18. Implementation steps

1. Add route-wide Playwright/behavior tests for landmarks, names, focus, state truth, hydration and media dimensions and observe failure → verify: `node --experimental-strip-types --test scripts/accessibility-contract.test.mjs`
2. Add shared skip/main structure, route headings and native subject/group controls without regressing fixed mobile chrome → verify: `node --experimental-strip-types --test --test-name-pattern="landmark|heading|select" scripts/accessibility-contract.test.mjs`
3. Expose unread/bulk state, labels, focus and contrast; confirm destructive actions natively → verify: `node --experimental-strip-types --test --test-name-pattern="unread|pressed|focus|contrast|confirm" scripts/accessibility-contract.test.mjs`
4. Separate async loading/empty/error states, sanitize global error output and make notification state commit only after success → verify: `node --experimental-strip-types --test --test-name-pattern="error|notification|busy" scripts/accessibility-contract.test.mjs`
5. Stabilize SSR-derived state, synchronize selected URL params and listen for system theme changes → verify: `node --experimental-strip-types --test --test-name-pattern="hydration|URL|theme" scripts/accessibility-contract.test.mjs`
6. Correct metadata/PWA copy/orientation, media naming/dimensions/priority, grouped-empty state and live announcements → verify: `node --experimental-strip-types --test scripts/accessibility-contract.test.mjs scripts/fontes-smoke.test.mjs`
7. Run all browser regressions and a security review of rendered error/link paths with no new findings → verify: `npm test && npm run typecheck && npm audit --omit=dev`

## 19. Verification script

Run Playwright at mobile and desktop widths with keyboard-only navigation, inspect the accessibility tree and console/hydration errors, simulate network/permission failures, share/reload URL state and switch system theme while open.

## 20. Out of scope, risks and rollback

No visual redesign or fabricated video captions are included. Native controls may change appearance slightly; shared mobile geometry tests protect chrome sizing. Changes can roll back per component because no schema migration is involved.
