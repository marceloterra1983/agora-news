import { createServerFn } from "@tanstack/react-start";
import { fallbackPayload, filterStories, loadFeed, peekStory } from "./feed";
import { downloadPostById } from "./supabase";
import { timed } from "./timing";
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
          const older = await downloadSupabase(data.category, { before: data.before, limit: 40 });
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
              hasMore: stories.length >= 40,
            },
          };
        }
        const payload = await loadFeed(data.refresh, data.category, data.fromX);
        const news = toNews(payload, data.category, data.q);
        return {
          ...news,
          meta: { ...news.meta, hasMore: news.stories.length >= 40 },
        };
      },
      (r) => ({ count: r.stories?.length ?? 0, live: Boolean(r.meta?.live) }),
    );
  });

export const loadStory = createServerFn({ method: "GET" })
  .validator((id: string) => String(id || ""))
  .handler(async ({ data: id }) => {
    const cached = peekStory(id);
    if (cached) return cached;
    const payload = await loadFeed(false);
    const hit = payload.stories.find((s) => s.id === id);
    if (hit) return hit;
    return downloadPostById(id);
  });
