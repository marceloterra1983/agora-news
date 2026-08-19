import { preferNewerLast, storedToLastHit } from "./last-post";
import { listXLastPosts } from "./last-post-store";
import { supabaseReadHeaders, SUPABASE_POSTS_URL } from "./supabase";
import type { Category } from "./types";

export type LastHit = {
  id: string;
  title: string;
  publishedAt: string;
  count: number;
};

const lastCache = new Map<
  string,
  {
    at: number;
    feed: Map<string, LastHit>;
    last: Map<string, LastHit>;
    recent: Map<string, LastHit[]>;
  }
>();
const LAST_TTL = 45_000;

function norm(h: string): string {
  return String(h || "")
    .replace(/^@+/, "")
    .trim();
}

/** Feed da seção separado do x-last — inApp só vale se o id está no feed. */
export async function lastPostsByAccount(
  section: Category,
): Promise<{
  feed: Map<string, LastHit>;
  last: Map<string, LastHit>;
  recent: Map<string, LastHit[]>;
}> {
  const key = section;
  const hit = lastCache.get(key);
  if (hit && Date.now() - hit.at < LAST_TTL)
    return { feed: hit.feed, last: hit.last, recent: hit.recent };

  const feed = new Map<string, LastHit>();
  const recent = new Map<string, LastHit[]>();
  try {
    const params = new URLSearchParams();
    params.set("select", "post_id,account,posted_at,summary_pt");
    params.set("category", `eq.${section}`);
    params.set("order", "posted_at.desc");
    params.set("limit", "1000");
    const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
      headers: supabaseReadHeaders(),
      signal: AbortSignal.timeout(5_000),
    });
    if (res.ok) {
      const rows = (await res.json()) as Array<{
        post_id?: string;
        account?: string;
        posted_at?: string;
        summary_pt?: string;
      }>;
      for (const row of rows) {
        const handle = norm(row.account || "").toLowerCase();
        if (!handle || !row.post_id) continue;
        const id = String(row.post_id);
        const title = String(row.summary_pt || "Sem título").slice(0, 180);
        const publishedAt = String(row.posted_at || "");
        const prev = feed.get(handle);
        if (prev) prev.count += 1;
        else feed.set(handle, { id, title, publishedAt, count: 1 });
        const list = recent.get(handle) ?? [];
        if (list.length < 10 && !list.some((item) => item.id === id)) {
          list.push({ id, title, publishedAt, count: 1 });
          recent.set(handle, list);
        }
      }
    }
  } catch {
    /* empty map */
  }
  const last = new Map(feed);
  const storedLast = await listXLastPosts();
  for (const [handle, post] of storedLast) {
    const stored = storedToLastHit(post);
    if (!stored) continue;
    const next = preferNewerLast(last.get(handle) ?? null, stored);
    if (next) last.set(handle, next);
  }
  lastCache.set(key, { at: Date.now(), feed, last, recent });
  return { feed, last, recent };
}

export function invalidateFontesLastCache() {
  lastCache.clear();
}
