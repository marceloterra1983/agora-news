import { LAST_POST_CATEGORY, fetchLastPost, latestFromPosts, type StoredLastPost } from "./last-post";
import { SUPABASE_ANON_KEY, SUPABASE_POSTS_URL } from "./supabase";

const AUTH = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  Accept: "application/json",
};

function lastRowId(handle: string): string {
  return `last_${handle.replace(/^@+/, "").trim().toLowerCase()}`;
}

function tweetIdOf(id: string, url: string): string {
  return url.match(/status\/(\d+)/)?.[1] || id;
}

export async function listXLastPosts(): Promise<Map<string, StoredLastPost>> {
  const out = new Map<string, StoredLastPost>();
  try {
    const params = new URLSearchParams();
    params.set("select", "account,post_id,posted_at,summary_pt,content,post_url");
    params.set("category", `eq.${LAST_POST_CATEGORY}`);
    params.set("limit", "400");
    const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
      headers: AUTH,
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) return out;
    const rows = (await res.json()) as Array<{
      account?: string;
      post_id?: string;
      posted_at?: string;
      summary_pt?: string;
      content?: string;
      post_url?: string;
    }>;
    for (const row of rows) {
      const handle = String(row.account || "")
        .replace(/^@+/, "")
        .trim()
        .toLowerCase();
      const publishedAt = String(row.posted_at || "");
      const text = String(row.summary_pt || row.content || "").trim();
      if (!handle || !publishedAt || !text) continue;
      const url = String(row.post_url || "");
      out.set(handle, {
        id: tweetIdOf(String(row.post_id || ""), url),
        text: text.slice(0, 280),
        url: url || `https://x.com/${handle}`,
        publishedAt,
      });
    }
  } catch {
    /* empty */
  }
  return out;
}

export async function persistLastPost(handle: string, post: StoredLastPost): Promise<boolean> {
  const { upsertPosts } = await import("./admin");
  const key = handle.replace(/^@+/, "").trim();
  if (!key || !post.id || !post.publishedAt) return false;
  const written = await upsertPosts([
    {
      post_id: lastRowId(key),
      account: key,
      posted_at: post.publishedAt,
      posted_at_sp: post.publishedAt,
      content: post.text,
      translation_pt: post.text,
      summary_pt: post.text.slice(0, 220),
      post_url: post.url || `https://x.com/${key}/status/${post.id}`,
      media_label: "",
      image_url: "",
      category: LAST_POST_CATEGORY,
      batch_name: LAST_POST_CATEGORY,
      source: LAST_POST_CATEGORY,
    },
  ]);
  return written.ok;
}

export async function fillMissingLastPosts(handles: string[]): Promise<number> {
  const unique = [...new Set(handles.map((h) => h.replace(/^@+/, "").trim()).filter(Boolean))].slice(0, 80);
  let n = 0;
  for (let i = 0; i < unique.length; i += 6) {
    const chunk = unique.slice(i, i + 6);
    await Promise.all(
      chunk.map(async (h) => {
        const post = (await latestFromPosts(h)) ?? (await fetchLastPost(h));
        if (!post) return;
        if (await persistLastPost(h, post)) n += 1;
      }),
    );
  }
  return n;
}
