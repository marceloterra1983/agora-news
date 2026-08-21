import { useEffect, useRef, useState } from "react";
import { loadNews } from "@/lib/news/server";
import type { Category, Story } from "@/lib/news/types";
import {
  FEED_MORE_STEPS,
  shouldWalkEmptyWindow,
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
  const raw = dedupe([...preview, ...older]);
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
        setHasMore(Boolean(next.meta.hasMore));
      })
      .catch(() => {
        /* one attempt per group — do not retry-loop */
      });
  }, [group, category, query, visible.length, live, groupAccounts]);

  async function loadMore(lastPublishedAt?: string) {
    if (!lastPublishedAt || loadingMore) return;
    setLoadingMore(true);
    setMoreError(false);
    try {
      let cursor = lastPublishedAt;
      let addedVisible = 0;
      let steps = 0;
      let serverHasMore = true;
      const seen = new Set(rawRef.current.map((s) => s.id));
      const bundled: Story[] = [];
      const accounts = group === "all" ? undefined : groupAccounts;
      while (steps < FEED_MORE_STEPS && addedVisible === 0) {
        const after = windowAfter(cursor);
        const next = await loadNews({
          data: {
            category,
            q: query,
            before: cursor,
            after: after || undefined,
            accounts,
          },
        });
        const fresh = next.stories.filter((s) => !seen.has(s.id) && storyHasText(s));
        for (const row of fresh) seen.add(row.id);
        bundled.push(...fresh);
        addedVisible = fresh.filter((s) => viewRef.current(s)).length;
        serverHasMore = Boolean(next.meta.hasMore);
        if (
          !shouldWalkEmptyWindow({
            addedVisible,
            freshCount: fresh.length,
            serverHasMore,
            steps,
          })
        ) {
          break;
        }
        cursor = after || fresh.at(-1)?.publishedAt || "";
        if (!cursor) break;
        steps += 1;
      }
      if (bundled.length) setOlder((cur) => dedupe([...cur, ...bundled]));
      setHasMore(addedVisible > 0 || serverHasMore);
    } catch {
      setMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  return { older, raw, visible, loadingMore, moreError, hasMore, loadMore };
}
