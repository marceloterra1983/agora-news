import { createServerFn } from "@tanstack/react-start";
import { fallbackPayload, filterStories, loadFeed } from "./feed";
import { newsFromFallback } from "./news-fallback";
import { serverCatalogFor } from "./server-catalog";
import { downloadPostById } from "./supabase";
import { attachStoryAvatars, hydrateStory } from "./story-hydrate";
import { persistHydratedBody } from "./story-persist";
import { timed } from "./timing";
import { PAGE_SIZE } from "./page-size.mjs";
import { attachClusterChrome } from "./story-cluster.mjs";
import { accountsForQuery } from "./account-in-filter.mjs";
import {
  FEED_MORE_LIMIT,
  YOUTUBE_BACKFILL_HOURS,
  YOUTUBE_BACKFILL_LIMIT,
  intersectAccounts,
  mergeFeedStories,
  windowAfter,
  youtubeHandlesIn,
} from "./feed-more.mjs";
import { DEFAULT_SECTION, normalizeSection, type Category } from "./types";
import type { SectionCatalog } from "./section-catalog.mjs";
import { getSessionUser } from "@/lib/auth/verify.server";

export { newsFromFallback };

type NewsInput = {
  category?: Category;
  q?: string;
  before?: string;
  after?: string;
  accounts?: string[];
};

function toNews(
  payload: ReturnType<typeof fallbackPayload>,
  category: Category,
  q?: string,
  catalog?: SectionCatalog,
) {
  return {
    stories: filterStories(payload.stories, category, q, catalog).map((s) => ({
      ...s,
      body: s.body || s.excerpt || s.title,
      original: s.original || "",
    })),
    meta: {
      live: payload.live,
      syncedAt: payload.syncedAt,
      folder: payload.folder,
      count: payload.count,
      source: payload.source,
    },
  };
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export const loadNews = createServerFn({ method: "GET" })
  .validator((input: NewsInput | undefined) => ({
    category: normalizeSection(input?.category || DEFAULT_SECTION),
    q: typeof input?.q === "string" ? input.q : undefined,
    before: typeof input?.before === "string" ? input.before : undefined,
    after: typeof input?.after === "string" ? input.after : undefined,
    accounts: asStringList(input?.accounts),
  }))
  .handler(async ({ data }) => {
    return timed(
      `loadNews ${data.category}`,
      async () => {
        const user = await getSessionUser();
        const catalog = await serverCatalogFor(data.category, user?.id);
        const accounts = intersectAccounts(data.accounts, catalog.handles);
        const scoped = accounts.length > 0 && accounts.length < catalog.handles.length;
        if (data.before || data.after || scoped) {
          const { downloadSupabase } = await import("./supabase");
          const older = await downloadSupabase(data.category, {
            before: data.before,
            after: data.after,
            limit: data.before || data.after ? FEED_MORE_LIMIT : PAGE_SIZE,
            accounts: accountsForQuery(catalog, scoped ? accounts : []),
          });
          const ytWanted = youtubeHandlesIn(scoped ? accounts : catalog.handles);
          let bundled = older;
          if (ytWanted.length && (data.before || data.after)) {
            try {
              const extra = await downloadSupabase(data.category, {
                before: data.before,
                after: data.before ? windowAfter(data.before, YOUTUBE_BACKFILL_HOURS) || undefined : data.after,
                limit: YOUTUBE_BACKFILL_LIMIT,
                accounts: accountsForQuery(catalog, ytWanted),
              });
              bundled = mergeFeedStories(older, extra);
            } catch {
              bundled = older;
            }
          }
          const stories = await attachStoryAvatars(
            attachClusterChrome(
              filterStories(bundled, data.category, data.q, catalog).map((s) => ({
                ...s,
                body: s.body || s.excerpt || s.title,
                original: s.original || "",
              })),
            ),
          );
          return {
            stories,
            meta: {
              live: true,
              syncedAt: new Date().toISOString(),
              folder: `NEWS/${data.category.toUpperCase()}`,
              count: stories.length,
              source: "supabase",
              hasMore: older.length >= (data.before || data.after ? FEED_MORE_LIMIT : PAGE_SIZE),
            },
          };
        }
        const payload = await loadFeed(data.category, catalog);
        const news = toNews(payload, data.category, data.q, catalog);
        const stories = await attachStoryAvatars(news.stories);
        return {
          ...news,
          stories,
          meta: {
            ...news.meta,
            hasMore: payload.hasMore ?? stories.length >= PAGE_SIZE,
          },
        };
      },
      (r) => ({ count: r.stories?.length ?? 0, live: Boolean(r.meta?.live) }),
    );
  });

export const loadStory = createServerFn({ method: "GET" })
  .validator((id: string) => String(id || ""))
  .handler(async ({ data: id }) => {
    const full = await downloadPostById(id);
    if (!full) return null;
    const base = full;
    const hydrated = await hydrateStory(base);
    if (hydrated.body && hydrated.body !== (base.body || "").trim()) {
      void persistHydratedBody(base, hydrated.body);
    }
    return hydrated;
  });
