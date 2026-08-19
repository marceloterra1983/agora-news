import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { loadNews, newsFromFallback } from "@/lib/news/server";
import { useNewsStore } from "@/lib/news/store";
import { PAGE_SIZE } from "@/lib/news/page-size.mjs";
import { type Category } from "@/lib/news/types";
import { normHandle } from "@/lib/news/fontes-prefs";
import { showFavoriteAlerts } from "@/lib/news/notify-favorites";
import { useFontesPrefs } from "@/lib/news/use-fontes-prefs";
import {
  consumeFeedScroll,
  currentScrollY,
  markLeaveFeed,
  restoreScrollY,
} from "@/lib/news/feed-scroll";
import { noteFirstUnread } from "@/lib/news/unread";
import { observeUnreadImpressions } from "@/lib/news/unread-impression";
import { useUnread } from "@/lib/news/use-unread";
import { relativeTime } from "@/lib/news/format";
import { cn } from "@/lib/utils";
import { profileByHandle } from "@/lib/news/profiles";
import { mergeAvatarsIntoStories } from "@/lib/news/profile-store-core.mjs";
import { StoryCard } from "./story-card";

const PAGE = PAGE_SIZE;

type NewsPayload = ReturnType<typeof newsFromFallback> & {
  meta: ReturnType<typeof newsFromFallback>["meta"] & { hasMore?: boolean };
};

export function Feed({
  category,
  query,
  initial,
  group: groupProp,
}: {
  category: Category;
  query?: string;
  initial?: NewsPayload;
  group?: string;
}) {
  const ingest = useNewsStore((s) => s.ingest);
  const storedStories = useNewsStore((s) => s.stories);
  const prefs = useFontesPrefs(category);
  const unread = useUnread();
  const seedBaseline = unread.seedBaseline;
  const markRead = unread.markRead;
  const feedRef = useRef<HTMLDivElement>(null);
  const seed = initial ?? newsFromFallback(category, query);
  const [older, setOlder] = useState<NewsPayload["stories"]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const group = groupProp ?? "all";

  useEffect(() => {
    setOlder([]);
    setHasMore(true);
  }, [category, query]);

  const { data, isError, isFetching, refetch } = useQuery({
    queryKey: ["news", category, query ?? ""],
    queryFn: async () => {
      const next = await loadNews({
        data: { category, q: query },
      });
      if (!next.meta.live) throw new Error("feed_unavailable");
      return next;
    },
    initialData: initial?.meta.live ? initial : undefined,
    placeholderData: seed,
    staleTime: 60_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (data?.stories.length) ingest(data.stories);
  }, [data, ingest]);

  const rawStories = [...(data?.stories ?? seed.stories), ...older].filter(
    (s, i, all) =>
      s.category !== "profile" &&
      !String(s.id).startsWith("prfl_") &&
      all.findIndex((x) => x.id === s.id) === i,
  );

  const stories = useMemo(() => {
    const disabled = new Set(prefs.disabled);
    const scoped = rawStories.filter((s) => {
      const h = normHandle(s.source || s.sourceLabel || "");
      if (h && disabled.has(h)) return false;
      const storyGroup = prefs.groups[h] ?? profileByHandle(h)?.group ?? "novos";
      if (group !== "all" && storyGroup !== group) return false;
      return true;
    });
    return mergeAvatarsIntoStories(scoped, storedStories);
  }, [rawStories, prefs.disabled, prefs.groups, group, storedStories]);

  useEffect(() => {
    if (!rawStories.length) return;
    void showFavoriteAlerts(rawStories);
  }, [rawStories, prefs.starred]);

  useEffect(() => {
    if (!data?.meta.live || !stories.length || unread.hasBaseline) return;
    seedBaseline(stories.map((s) => s.id));
  }, [data?.meta.live, stories, seedBaseline, unread.hasBaseline]);

  useEffect(() => {
    if (!unread.ready || !unread.hasBaseline) return;
    noteFirstUnread(stories.map((s) => s.id));
  }, [stories, unread.ready, unread.hasBaseline]);

  const unreadKey = stories
    .filter((s) => unread.isUnread(s.id))
    .map((s) => s.id)
    .join("\0");

  useEffect(() => {
    const node = feedRef.current;
    if (!node) return;
    return observeUnreadImpressions(node, markRead);
  }, [unreadKey, markRead]);

  useLayoutEffect(() => {
    if (!stories.length) return;
    const y = consumeFeedScroll(category);
    if (y == null) return;
    restoreScrollY(y);
    const later = window.setTimeout(() => restoreScrollY(y), 200);
    return () => window.clearTimeout(later);
  }, [category, stories.length]);

  useEffect(() => {
    const root = feedRef.current;
    if (!root) return;
    const onClick = (event: MouseEvent) => {
      const href = (event.target as Element | null)
        ?.closest("a")
        ?.getAttribute("href");
      if (href && /\/materia\//.test(href)) {
        markLeaveFeed(category, currentScrollY());
      }
    };
    root.addEventListener("click", onClick, true);
    return () => root.removeEventListener("click", onClick, true);
  }, [category]);

  async function loadMore() {
    const last = rawStories.at(-1);
    if (!last || loadingMore) return;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const next = await loadNews({
        data: { category, q: query, before: last.publishedAt },
      });
      const seen = new Set(rawStories.map((s) => s.id));
      const fresh = next.stories.filter((s) => !seen.has(s.id));
      setOlder((cur) => [...cur, ...fresh]);
      setHasMore(Boolean(next.meta.hasMore) && fresh.length > 0);
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const updatedAt = stories[0]?.publishedAt || data?.meta?.syncedAt;
  const updatedLabel = updatedAt ? relativeTime(updatedAt) : null;

  if (isError && !stories.length) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center" role="alert">
        <p className="font-display text-2xl">Feed indisponível</p>
        <p className="mt-2 text-sm text-ink-soft">
          Não foi possível ler as notícias agora.
        </p>
        <button type="button" className="mt-4 h-11 rounded-md border border-line px-4 text-sm" onClick={() => void refetch()}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <div ref={feedRef} data-feed="" aria-busy={isFetching || loadingMore} className="mx-auto max-w-2xl pt-3 max-sm:max-w-none">
      {isError ? <p className="mb-3 text-sm text-mark" role="alert">Feed ao vivo indisponível. Exibindo o conteúdo disponível.</p> : null}
      {updatedLabel ? (
        <p className="mb-4 text-[12px] text-mute" role="status">Atualizado {updatedLabel}</p>
      ) : null}

      {stories.length ? (
        stories.map((story, index) => (
          <StoryCard
            key={story.id}
            story={story}
            variant="reader"
            unread={unread.isUnread(story.id)}
            priority={index === 0}
          />
        ))
      ) : (
        <div className="mx-auto max-w-lg py-16 text-center" role="status">
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
      {moreError ? <p className="pb-6 text-center text-sm text-mark" role="alert">Não foi possível carregar mais. Tente novamente.</p> : null}
    </div>
  );
}
