# Impact — cluster + RSS + ranking

**Date:** 2026-08-25  
**Skill:** `assess-impact`  
**Não substitui** `specs/IMPACT_LATEST.md` (e04s08).

## Target

Read-path do feed (`loadFeed` / `loadNews` / `use-feed-older` / `StoryCard`) e write-path do ingest (`runIngest` + `upsertPosts` + catálogo + prefs).

## Dependents (16)

- `src/lib/news/feed.ts` — `loadFeed`, `filterStories`, `lastGood`
- `src/lib/news/server-news.ts` — `loadNews`, paginação
- `src/routes/index.tsx`, `src/routes/api/feed.ts` — home / API
- `src/components/news/feed.tsx` — `inView`, group, unread observer
- `src/components/news/story-card.tsx`, `src/lib/news/use-feed-older.ts`
- `src/lib/news/section-catalog.mjs` — allowlist + grupos
- `src/lib/news/use-section-catalog.ts` — catálogo **cliente** (hoje sem RSS)
- `src/lib/news/supabase.ts` — `dbPostToStory` (`sourceLabel` = `@account`)
- `src/lib/news/profile-store-core.mjs` — `avatarInFilter` (charset X)
- `src/lib/news/ingest.ts`, `ingest-scan.ts`, `admin.ts`
- `src/lib/news/prefs-server.ts`, `prefs-sync.ts`, `prefs-merge.ts`, `llm-accounts.mjs`
- `src/routes/fontes.tsx`, `src/lib/news/unread.ts` / `unread-impression.ts`
- `src/routes/api/health.ts` — last `posted_at` por seção (RSS conta)

## Affected stories

- e04s02 persistência privada / catálogo owner-scoped
- e04s03 ingest correctness / lease
- e04s05 PWA/a11y feed truthful
- e04s08 catalog-feed-scope + lastGood refilter
- unread auto-read (impression + `data-story-id`)

## Test Coverage

- Cobre hoje: `catalog-feed-scope`, `public-catalog-privacy`, `ingest-*.behavior`, `supabase-account-filter`, `agora-now` (PAGE_SIZE=40), `feed-more`, `prefs-sync-*`, `review-closeout` (CloudPrefs shape)
- Gap: cluster, RSS parse/ingest, `rssFeeds` no snapshot, `dbPostToStory` para `source=rss`, client catalog RSS

## Risk: High

Feed + ingest + prefs são fronteira compartilhada. Fan-in 4/4, fan-out 3/3, churn recente alto. Score leve ~9/10 → grill-me de **fatos** (feito via grill-with-docs), não de produto.

## Recommended action

Corrigir o plano (feito) e **adicionar testes primeiro** nas Tasks 1, 2, 5 e 6 antes de UI. Não alargar `avatarInFilter`. Não commitar seed G1.
