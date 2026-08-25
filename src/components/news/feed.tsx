import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { loadNews, newsFromFallback } from "@/lib/news/server";
import { useNewsStore } from "@/lib/news/store";
import { type Category, type Story } from "@/lib/news/types";
import { FEED_ORDENS, rankStories } from "@/lib/news/feed-rank.mjs";
import { useExtraFontes } from "@/lib/news/use-extra-fontes";
import { normHandle } from "@/lib/news/fontes-prefs";
import { showFavoriteAlerts } from "@/lib/news/notify-favorites";
import { useFontesPrefs } from "@/lib/news/use-fontes-prefs";
import {
  consumeFeedScroll,
  currentScrollY,
  markLeaveFeed,
  restoreScrollY,
} from "@/lib/news/feed-scroll";
import { freshMemberCount, markClusterSeen, readClusterSeen } from "@/lib/news/cluster-seen";
import { noteFirstUnread } from "@/lib/news/unread";
import { observeUnreadImpressions } from "@/lib/news/unread-impression";
import { useUnread } from "@/lib/news/use-unread";
import { relativeTime } from "@/lib/news/format";
import { mergeAvatarsIntoStories } from "@/lib/news/profile-store-core.mjs";
import { handlesForGroup } from "@/lib/news/section-catalog.mjs";
import { useSectionCatalog } from "@/lib/news/use-section-catalog";
import { useFeedOlder } from "@/lib/news/use-feed-older";
import { useFeedProfile } from "@/lib/news/use-feed-profile";
import { cn } from "@/lib/utils";
import { tapIcon } from "./icon-btn";
import { FeedProfilePopup } from "./feed-profile-popup";
import { StoryCard } from "./story-card";

type NewsPayload = ReturnType<typeof newsFromFallback> & {
  meta: ReturnType<typeof newsFromFallback>["meta"] & { hasMore?: boolean };
};

export function Feed({
  category,
  query,
  initial,
  group: groupProp,
  ordem = "recente",
  onOrdem,
}: {
  category: Category;
  query?: string;
  initial?: NewsPayload;
  group?: string;
  ordem?: "recente" | "seguindo" | "importante";
  onOrdem?: (next: "recente" | "seguindo" | "importante") => void;
}) {
  const ingest = useNewsStore((s) => s.ingest);
  const storedStories = useNewsStore((s) => s.stories);
  const extras = useExtraFontes();
  const prefs = useFontesPrefs(category);
  const catalog = useSectionCatalog(category);
  const unread = useUnread();
  // Vazio no primeiro render para casar com o SSR (localStorage só existe no cliente).
  const [clusterSeen, setClusterSeen] = useState<Record<string, string[]>>({});
  useEffect(() => {
    setClusterSeen(readClusterSeen());
  }, []);
  const seedBaseline = unread.seedBaseline;
  const markRead = unread.markRead;
  const feedRef = useRef<HTMLDivElement>(null);
  const seed = initial ?? newsFromFallback(category, query);
  const group = groupProp ?? "all";
  const groupAccounts = handlesForGroup(catalog, group);

  const { data, isError, isFetching, refetch } = useQuery({
    queryKey: ["news", category, query ?? ""],
    queryFn: async () => {
      const next = await loadNews({ data: { category, q: query } });
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

  const preview = (data?.stories ?? seed.stories).filter(
    (s) => s.category !== "profile" && !String(s.id).startsWith("prfl_"),
  );

  function inView(story: Story) {
    const h = normHandle(story.source || story.sourceLabel || "");
    if (h && prefs.isDisabled(h)) return false;
    if (group !== "all") {
      const mapped = catalog.members.find((m) => m.handle === h)?.group ?? "novos";
      if (mapped !== group) return false;
    }
    return true;
  }

  const page = useFeedOlder({
    category,
    query,
    group,
    groupAccounts,
    live: Boolean(data?.meta.live),
    preview,
    inView,
  });

  const merged = mergeAvatarsIntoStories(page.visible, storedStories);
  const stories = rankStories(merged, ordem, {
    starred: prefs.starred,
    watched: extras.map((row) => row.handle),
    read: unread.ready
      ? merged.filter((s) => !unread.isUnread(s.id)).map((s) => s.id)
      : [],
    hasBaseline: unread.hasBaseline,
  });
  const profile = useFeedProfile(category, stories, prefs);

  useEffect(() => {
    if (data?.stories.length) ingest(data.stories);
  }, [data, ingest]);

  useEffect(() => {
    if (!page.raw.length) return;
    void showFavoriteAlerts(page.raw);
  }, [page.raw, prefs.starred]);

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
    return observeUnreadImpressions(node, (id) => {
      markRead(id);
      const story = stories.find((row) => row.id === id);
      if (story?.clusterId && story.memberIds) {
        markClusterSeen(story.clusterId, story.memberIds);
        setClusterSeen(readClusterSeen());
      }
    });
  }, [unreadKey, markRead, stories]);

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

  const updatedAt = stories[0]?.publishedAt || data?.meta?.syncedAt;
  const updatedLabel = updatedAt ? relativeTime(updatedAt) : null;
  const showMore = page.hasMore && stories.length > 0;

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
    <div ref={feedRef} data-feed="" aria-busy={isFetching || page.loadingMore} className="mx-auto max-w-2xl pt-3 max-sm:max-w-none">
      {isError ? <p className="mb-3 text-sm text-mark" role="alert">Feed ao vivo indisponível. Exibindo o conteúdo disponível.</p> : null}
      {updatedLabel ? (
        <p className="mb-4 text-[12px] text-mute" role="status">
          Atualizado{" "}
          <time dateTime={updatedAt} suppressHydrationWarning>
            {updatedLabel}
          </time>
        </p>
      ) : null}

      <div
        className="mb-4 flex flex-wrap gap-2"
        role="toolbar"
        aria-label="Ordenar feed"
        data-testid="feed-ordem"
      >
        {FEED_ORDENS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={ordem === id}
            onClick={() => onOrdem?.(id)}
            className={cn(
              "inline-flex h-8 items-center rounded-full px-3 text-[12px] font-semibold",
              ordem === id ? "bg-ink text-paper" : "bg-paper-2 text-mute",
            )}
          >
            {id === "recente" ? "Recente" : id === "seguindo" ? "Seguindo" : "Importante"}
          </button>
        ))}
      </div>

      {stories.length ? (
        stories.map((story, index) => (
          <StoryCard
            key={story.id}
            story={story}
            variant="reader"
            unread={unread.isUnread(story.id)}
            priority={index === 0}
            profileOpen={profile.openHandle === normHandle(story.source)}
            onOpenProfile={profile.openProfile}
            freshCount={freshMemberCount(clusterSeen[story.clusterId || story.id], story.memberIds || [story.id])}
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

      {showMore ? (
        <div className="flex flex-col items-center gap-1 py-6">
          <p className="text-[12px] text-mute">mais 12 horas</p>
          <button
            type="button"
            aria-label="Carregar mais"
            disabled={page.loadingMore}
            onClick={() =>
              void page.loadMore((stories.at(-1) ?? page.raw.at(-1))?.publishedAt)
            }
            className={cn(tapIcon, "bg-paper-2 text-ink disabled:opacity-40")}
          >
            <ChevronDown className={cn("size-5", page.loadingMore && "opacity-50")} />
          </button>
        </div>
      ) : null}
      {page.moreError ? <p className="pb-6 text-center text-sm text-mark" role="alert">Não foi possível carregar mais. Tente novamente.</p> : null}
      {profile.row ? (
        <FeedProfilePopup
          row={profile.row}
          prefs={prefs}
          onClose={profile.closeProfile}
          onToggleNotify={prefs.toggleNotify}
        />
      ) : null}
    </div>
  );
}
