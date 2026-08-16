import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { loadNews, newsFromFallback } from "@/lib/news/server";
import { useNewsStore } from "@/lib/news/store";
import { PAGE_SIZE } from "@/lib/news/page-size.mjs";
import { type Category } from "@/lib/news/types";
import { normHandle } from "@/lib/news/fontes-prefs";
import { showFavoriteAlerts } from "@/lib/news/notify-favorites";
import { useFontesPrefs } from "@/lib/news/use-fontes-prefs";
import { useUnread } from "@/lib/news/use-unread";
import { SUPABASE_ANON_KEY, SUPABASE_POSTS_URL } from "@/lib/news/supabase";
import { relativeTime } from "@/lib/news/format";
import { cn } from "@/lib/utils";
import { groupOf } from "./group-tag";
import { StoryCard } from "./story-card";

const LAST_FEED = "agora-last-live-v3";
const GROUP_KEY = "agora-feed-group";
const PAGE = PAGE_SIZE;

type NewsPayload = ReturnType<typeof newsFromFallback> & {
  meta: ReturnType<typeof newsFromFallback>["meta"] & { hasMore?: boolean };
};

function readLastGood(category: Category, query?: string) {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(`${LAST_FEED}:${category}:${query ?? ""}`);
    return raw ? (JSON.parse(raw) as NewsPayload) : null;
  } catch {
    return null;
  }
}

function writeLastGood(category: Category, query: string | undefined, data: NewsPayload) {
  if (typeof window === "undefined" || !data.meta.live) return;
  try {
    sessionStorage.setItem(`${LAST_FEED}:${category}:${query ?? ""}`, JSON.stringify(data));
  } catch {
    // quota
  }
}

function readGroup(category: Category): string {
  if (typeof window === "undefined") return "all";
  try {
    const v = sessionStorage.getItem(`${GROUP_KEY}:${category}`) ?? sessionStorage.getItem(GROUP_KEY);
    if (!v || v === "all") return "all";
    return v;
  } catch {
    /* ignore */
  }
  return "all";
}

export function Feed({
  category,
  query,
  initial,
  group: groupProp,
  onGroupChange,
}: {
  category: Category;
  query?: string;
  initial?: NewsPayload;
  group?: string;
  onGroupChange?: (g: string) => void;
}) {
  const ingest = useNewsStore((s) => s.ingest);
  const prefs = useFontesPrefs(category);
  const unread = useUnread();
  const seedBaseline = unread.seedBaseline;
  const queryClient = useQueryClient();
  const seed = initial?.stories.length ? initial : newsFromFallback(category, query);
  const stickyKey = `${category}:${query ?? ""}`;
  const sticky = useRef(readLastGood(category, query) ?? seed);
  const stickyFor = useRef(stickyKey);
  if (stickyFor.current !== stickyKey) {
    stickyFor.current = stickyKey;
    sticky.current = readLastGood(category, query) ?? seed;
  }
  if (initial?.meta.live && initial.stories.length) {
    sticky.current = initial;
  }
  const [older, setOlder] = useState<NewsPayload["stories"]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [groupLocal, setGroupLocal] = useState<string>("all");
  const group = groupProp ?? groupLocal;

  useEffect(() => {
    const g = readGroup(category);
    setGroupLocal(g);
    onGroupChange?.(g);
    setOlder([]);
    setHasMore(true);
  }, [category, query]);

  const { data, isError, dataUpdatedAt } = useQuery({
    queryKey: ["news", category, query ?? ""],
    queryFn: async () => {
      const next = await loadNews({
        data: { category, q: query, refresh: false, fromX: false },
      });
      if (next.meta.live && next.stories.length) {
        writeLastGood(category, query, next);
        sticky.current = next;
        return next;
      }
      return sticky.current.stories.length ? sticky.current : next;
    },
    initialData: initial?.meta.live && initial.stories.length ? initial : undefined,
    placeholderData: sticky.current,
    staleTime: 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    let last = "";
    let stop = false;
    async function peek() {
      try {
        const res = await fetch(
          `${SUPABASE_POSTS_URL}?select=post_id&order=posted_at.desc&limit=1&category=eq.${category}`,
          {
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              Accept: "application/json",
              Prefer: "count=none",
            },
            signal: AbortSignal.timeout(5_000),
          },
        );
        if (!res.ok || stop) return;
        const rows = (await res.json()) as Array<{ post_id?: string }>;
        const id = rows[0]?.post_id || "";
        if (id && last && id !== last) {
          void queryClient.invalidateQueries({ queryKey: ["news", category] });
        }
        if (id) last = id;
      } catch {
        /* keep interval */
      }
    }
    void peek();
    const timer = window.setInterval(peek, 15_000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [category, queryClient]);

  useEffect(() => {
    if (data?.stories.length) ingest(data.stories);
  }, [data, ingest]);

  const rawStories = [...(data?.stories?.length ? data.stories : sticky.current.stories), ...older].filter(
    (s, i, all) =>
      s.category !== "profile" &&
      !String(s.id).startsWith("prfl_") &&
      all.findIndex((x) => x.id === s.id) === i,
  );

  const stories = useMemo(() => {
    const disabled = new Set(prefs.disabled);
    return rawStories.filter((s) => {
      const h = normHandle(s.source || s.sourceLabel || "");
      if (h && disabled.has(h)) return false;
      if (group !== "all" && groupOf(s.source, category) !== group) return false;
      return true;
    });
  }, [rawStories, prefs.disabled, group, category]);

  useEffect(() => {
    if (!rawStories.length) return;
    void showFavoriteAlerts(rawStories);
  }, [rawStories, prefs.starred]);

  useEffect(() => {
    if (!data?.meta.live || !stories.length || unread.hasBaseline) return;
    seedBaseline(stories.map((s) => s.id));
  }, [data?.meta.live, stories, seedBaseline, unread.hasBaseline]);

  async function loadMore() {
    const last = rawStories.at(-1);
    if (!last || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await loadNews({
        data: { category, q: query, before: last.publishedAt },
      });
      const seen = new Set(rawStories.map((s) => s.id));
      const fresh = next.stories.filter((s) => !seen.has(s.id));
      setOlder((cur) => [...cur, ...fresh]);
      setHasMore(Boolean(next.meta.hasMore) && fresh.length > 0);
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }

  const updatedLabel = useMemo(() => {
    const top = stories[0]?.publishedAt || data?.meta?.syncedAt;
    if (!top) return null;
    return relativeTime(top);
  }, [stories, data?.meta?.syncedAt, dataUpdatedAt]);

  if (isError && !stories.length) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="font-display text-2xl">Nada nesta coleta</p>
        <p className="mt-2 text-sm text-ink-soft">
          Não foi possível ler o feed agora. A tentativa se repete sozinha.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl pt-3">
      {updatedLabel ? (
        <p className="mb-4 text-[12px] text-mute">Atualizado {updatedLabel}</p>
      ) : null}

      {stories.length ? (
        stories.map((story) => (
          <StoryCard
            key={story.id}
            story={story}
            variant="reader"
            unread={unread.isUnread(story.id)}
          />
        ))
      ) : (
        <div className="mx-auto max-w-lg py-16 text-center">
          <p className="font-display text-2xl">Nada neste recorte</p>
          <p className="mt-2 text-sm text-ink-soft">
            {group === "all"
              ? "Todas as contas ativas estão pausadas. Reative em Fontes."
              : "Nenhum post deste grupo no recorte atual."}
          </p>
        </div>
      )}

      {hasMore && rawStories.length >= PAGE ? (
        <div className="flex justify-center py-6">
          <button
            type="button"
            aria-label="Carregar mais"
            disabled={loadingMore}
            onClick={() => void loadMore()}
            className="grid size-10 place-items-center rounded-full bg-paper-2 text-ink disabled:opacity-40"
          >
            <ChevronDown className={cn("size-5", loadingMore && "opacity-50")} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
