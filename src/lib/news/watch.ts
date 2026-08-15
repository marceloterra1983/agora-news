import { upsertPosts, deletePost } from "./admin";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabase";

export type WatchAccount = {
  handle: string;
  name: string;
  avatar: string | null;
  summary: string;
  followers: number;
};

const AUTH = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Accept: "application/json",
};

function norm(h: string): string {
  return String(h || "")
    .replace(/^@+/, "")
    .trim();
}

function watchId(handle: string) {
  return `watch_${handle.toLowerCase()}`;
}

export async function listWatchAccounts(): Promise<WatchAccount[]> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?category=eq.watch&select=account,content,summary_pt,image_url,media_label&limit=80`,
      { headers: AUTH, signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{
      account?: string;
      content?: string;
      summary_pt?: string;
      image_url?: string;
      media_label?: string;
    }>;
    const out: WatchAccount[] = [];
    const seen = new Set<string>();
    for (const row of rows) {
      const handle = norm(row.account || "");
      if (!handle || seen.has(handle.toLowerCase())) continue;
      seen.add(handle.toLowerCase());
      out.push({
        handle,
        name: row.content || handle,
        avatar: row.image_url || null,
        summary: row.summary_pt || "",
        followers: Number(row.media_label) || 0,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function registerWatch(input: WatchAccount): Promise<boolean> {
  const handle = norm(input.handle);
  if (!/^[A-Za-z0-9_]{1,15}$/.test(handle)) return false;
  const posted = "2020-01-01T00:00:00.000Z";
  const written = await upsertPosts([
    {
      post_id: watchId(handle),
      account: handle,
      posted_at: posted,
      posted_at_sp: posted,
      content: input.name || handle,
      translation_pt: input.summary || "",
      summary_pt: (input.summary || input.name || handle).slice(0, 220),
      post_url: `https://x.com/${handle}`,
      media_label: String(input.followers || 0),
      image_url: input.avatar || "",
      category: "watch",
      batch_name: "x-watch",
      source: "x-watch",
    },
  ]);
  return written.ok;
}

export async function unregisterWatch(handle: string): Promise<boolean> {
  const key = norm(handle);
  if (!key) return false;
  return deletePost(watchId(key));
}
