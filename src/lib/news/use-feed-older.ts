import { useEffect, useRef, useState } from "react";
import { loadNews } from "@/lib/news/server";
import type { Category, Story } from "@/lib/news/types";
import { attachClusterChrome } from "@/lib/news/story-cluster.mjs";
import {
  FEED_MORE_HOUR_STEPS,
  moreStillOpen,
  storyHasText,
  windowAfter,
} from "@/lib/news/feed-more.mjs";

function dedupe(stories: Story[]) {
  return stories.filter((s, i, all) => all.findIndex((x) => x.id === s.id) === i);
}

export function useFeedOlder({
  category,
  query,
  group,
  groupAccounts,
  live,
  preview,
  inView,
}: {
  category: Category;
  query?: string;
  group: string;
  groupAccounts: string[];
  live: boolean;
  preview: Story[];
  inView: (story: Story) => boolean;
}) {
  const [older, setOlder] = useState<Story[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const filling = useRef("");
  const raw = attachClusterChrome(dedupe([...preview, ...older]));
  const visible = raw.filter((s) => storyHasText(s) && inView(s));
  const rawRef = useRef(raw);
  rawRef.current = raw;
  const viewRef = useRef(inView);
  viewRef.current = inView;

  useEffect(() => {
    setOlder([]);
    setHasMore(true);
    filling.current = "";
  }, [category, query]);

  useEffect(() => {
    if (group === "all" || visible.length || !live || !groupAccounts.length) return;
    const key = `${category}:${group}`;
    if (filling.current === key) return;
    filling.current = key;
    const seen = new Set(rawRef.current.map((s) => s.id));
    void loadNews({ data: { category, q: query, accounts: groupAccounts } })
      .then((next) => {
        const fresh = next.stories.filter((s) => !seen.has(s.id) && storyHasText(s));
        if (fresh.length) setOlder((cur) => dedupe([...cur, ...fresh]));
      })
      .catch(() => {
        /* one attempt per group — do not retry-loop */
      });
  }, [group, category, query, visible.length, live, groupAccounts]);

  async function pull(
    cursor: string,
    accounts: string[] | undefined,
    after?: string,
  ) {
    const next = await loadNews({
      data: {
        category,
        q: query,
        before: cursor,
        after,
        accounts,
      },
    });
    return next.stories.filter((s) => storyHasText(s));
  }

  async function loadMore(lastPublishedAt?: string) {
    if (!lastPublishedAt || loadingMore) return;
    setLoadingMore(true);
    setMoreError(false);
    try {
      const seen = new Set(rawRef.current.map((s) => s.id));
      const bundled: Story[] = [];
      const accounts = group === "all" ? undefined : groupAccounts;
      let addedVisible = 0;

      for (const hours of FEED_MORE_HOUR_STEPS) {
        const after = windowAfter(lastPublishedAt, hours);
        const fresh = (await pull(lastPublishedAt, accounts, after || undefined)).filter(
          (s) => !seen.has(s.id),
        );
        for (const row of fresh) seen.add(row.id);
        bundled.push(...fresh);
        addedVisible = bundled.filter((s) => viewRef.current(s)).length;
        if (addedVisible > 0) break;
      }

      let unboundedCount = 0;
      if (addedVisible === 0) {
        const fresh = (await pull(lastPublishedAt, accounts)).filter((s) => !seen.has(s.id));
        for (const row of fresh) seen.add(row.id);
        bundled.push(...fresh);
        unboundedCount = fresh.length;
        addedVisible = bundled.filter((s) => viewRef.current(s)).length;
      }

      if (bundled.length) setOlder((cur) => dedupe([...cur, ...bundled]));
      setHasMore(
        moreStillOpen({
          addedVisible,
          hours: addedVisible > 0 ? 12 : 24,
          unboundedTried: addedVisible === 0,
          unboundedCount,
        }),
      );
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  return { older, raw, visible, loadingMore, moreError, hasMore, loadMore };
}
