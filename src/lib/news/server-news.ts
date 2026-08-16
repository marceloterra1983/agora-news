import { createServerFn } from "@tanstack/react-start";
import { fallbackPayload, filterStories, loadFeed, peekStory } from "./feed";
import { downloadPostById } from "./supabase";
import { hydrateStory } from "./story-hydrate";
import { persistHydratedBody } from "./story-persist";
import { timed } from "./timing";
import { PAGE_SIZE } from "./page-size.mjs";
import { DEFAULT_SECTION, normalizeSection, type Category } from "./types";

function toNews(payload: ReturnType<typeof fallbackPayload>, category: Category, q?: string) {
  return {
    stories: filterStories(payload.stories, category, q).map((s) => ({
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

export function newsFromFallback(category: Category, q?: string) {
  return toNews(fallbackPayload(category), category, q);
}

export const loadNews = createServerFn({ method: "GET" })
  .validator(
    (
      input:
        | { category?: Category; q?: string; refresh?: boolean; fromX?: boolean; before?: string }
        | undefined,
    ) => ({
      category: normalizeSection(input?.category || DEFAULT_SECTION),
      q: typeof input?.q === "string" ? input.q : undefined,
      refresh: Boolean(input?.refresh),
      fromX: Boolean(input?.fromX),
      before: typeof input?.before === "string" ? input.before : undefined,
    }),
  )
  .handler(async ({ data }) => {
    return timed(
      `loadNews ${data.category}`,
      async () => {
        if (data.before) {
          const { downloadSupabase } = await import("./supabase");
          const older = await downloadSupabase(data.category, { before: data.before, limit: PAGE_SIZE });
          const stories = filterStories(older, data.category, data.q).map((s) => ({
            ...s,
            body: s.excerpt || s.title,
            original: s.original || "",
          }));
          return {
            stories,
            meta: {
              live: true,
              syncedAt: new Date().toISOString(),
              folder: `NEWS/${data.category.toUpperCase()}`,
              count: stories.length,
              source: "supabase",
              hasMore: stories.length >= PAGE_SIZE,
            },
          };
        }
        const payload = await loadFeed(data.refresh, data.category, data.fromX);
        const news = toNews(payload, data.category, data.q);
        return {
          ...news,
          meta: { ...news.meta, hasMore: news.stories.length >= PAGE_SIZE },
        };
      },
      (r) => ({ count: r.stories?.length ?? 0, live: Boolean(r.meta?.live) }),
    );
  });

export const loadStory = createServerFn({ method: "GET" })
  .validator((id: string) => String(id || ""))
  .handler(async ({ data: id }) => {
    const full = await downloadPostById(id);
    const base = full ?? peekStory(id);
    if (!base) return null;
    const hydrated = await hydrateStory(base);
    if (hydrated.body && hydrated.body !== (base.body || "").trim()) {
      void persistHydratedBody(base, hydrated.body);
    }
    return hydrated;
  });
