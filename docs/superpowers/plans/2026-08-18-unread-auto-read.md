# Unread auto-read Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Destaque de não-lido some por impressão no feed (≥50% visível por 1,5s) ou após 12h desde `firstUnreadAt` neste aparelho.

**Architecture:** Regras puras e storage em `unread.ts`. Um `IntersectionObserver` no `Feed` via helper. Abrir a matéria continua `markRead` imediato. Sem sync na nuvem.

**Tech Stack:** TypeScript, React 19, `localStorage`, `IntersectionObserver`, `node --test`.

## Global Constraints

- `UNREAD_TTL_MS = 12 * 60 * 60 * 1000`
- `IMPRESSION_MS = 1500`
- `IMPRESSION_RATIO = 0.5`
- Chave nova: `agora-unread-since-v1`
- Hint: `Destaque some ao passar no feed ou após 12 horas.`
- Sem slider, sem sync de prefs, sem chip Novo, sem observer em busca/salvos
- Branch: `feat/unread-auto-read` (não commitar em `main`)

## File map

| File | Role |
|---|---|
| `src/lib/news/unread.ts` | Constantes, `isUnreadNow`, `impressionReady`, since-map, `noteFirstUnread`, `markRead`, `resetUnread` |
| `src/lib/news/unread-impression.ts` | `observeUnreadImpressions(root, markRead)` |
| `src/lib/news/use-unread.ts` | Estado React inclui since-map |
| `src/components/news/feed.tsx` | Scan + observer |
| `src/components/news/story-card.tsx` | `data-story-id` |
| `src/routes/configuracoes.tsx` | Hint |
| `scripts/unread-status.test.mjs` | Unidade |
| `scripts/agora-now.test.mjs` | Contrato estático |
| `scripts/accessibility-contract.test.mjs` | Playwright 13h |

---

### Task 1: Regras puras e storage

**Files:**
- Create: `scripts/unread-status.test.mjs`
- Modify: `src/lib/news/unread.ts`

**Interfaces:**
- Produces: `isUnreadNow`, `impressionReady`, `noteFirstUnread`, `getUnreadSince`, `UNREAD_TTL_MS`, `IMPRESSION_MS`, `IMPRESSION_RATIO`, `SINCE_KEY`

- [ ] **Step 1: Write the failing test** (`scripts/unread-status.test.mjs`)
- [ ] **Step 2: Run** `node --experimental-strip-types --test scripts/unread-status.test.mjs` — FAIL (exports ausentes)
- [ ] **Step 3: Implement helpers + since-map + `markRead`/`resetUnread`/`isUnread`**
- [ ] **Step 4: Re-run unit test — PASS**
- [ ] **Step 5: Commit** `test(unread): lock impression and 12h fade rules` + `feat(unread): persist first-seen and compute 12h fade`

### Task 2: Feed impression + copy

**Files:**
- Create: `src/lib/news/unread-impression.ts`
- Modify: `src/lib/news/use-unread.ts`, `src/components/news/feed.tsx`, `src/components/news/story-card.tsx`, `src/routes/configuracoes.tsx`, `scripts/agora-now.test.mjs`

- [ ] **Step 1: Contract tests** for `data-story-id`, `observeUnreadImpressions`, hint 12h
- [ ] **Step 2: Run agora-now — FAIL**
- [ ] **Step 3: Wire observer, `data-story-id`, hook since-map, hint**
- [ ] **Step 4: PASS contract + unit**
- [ ] **Step 5: Commit** `feat(unread): mark read after feed dwell`

### Task 3: Playwright expire + gates

**Files:**
- Modify: `scripts/accessibility-contract.test.mjs`

- [ ] **Step 1: Test** injeta `firstUnreadAt` 13h no passado → `data-unread` não é `1`
- [ ] **Step 2: `npm test` focado; typecheck; lint**
- [ ] **Step 3: Commit** `test(unread): expire highlight after 13h`
- [ ] **Step 4: Land** PR merge na `main` se gates locais passarem
