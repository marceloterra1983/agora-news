import {
  LAST_POST_CATEGORY,
  fetchLastPost,
  lastPostFromXLastRow,
  lastPostIsStale,
  latestFromPosts,
  xLastListParams,
  type StoredLastPost,
} from "./last-post";
import { supabaseReadHeaders, SUPABASE_POSTS_URL } from "./supabase";

function lastRowId(handle: string): string {
  return `last_${handle.replace(/^@+/, "").trim().toLowerCase()}`;
}

export async function listXLastPosts(): Promise<Map<string, StoredLastPost>> {
  const out = new Map<string, StoredLastPost>();
  try {
    const params = xLastListParams(LAST_POST_CATEGORY);
    const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
      headers: supabaseReadHeaders(),
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
      const post = lastPostFromXLastRow(row, String(row.account || ""));
      if (!post) continue;
      const handle = String(row.account || "")
        .replace(/^@+/, "")
        .trim()
        .toLowerCase();
      if (handle) out.set(handle, post);
    }
  } catch {
    /* empty */
  }
  return out;
}

export async function persistLastPost(
  handle: string,
  post: StoredLastPost,
  beforeWrite?: () => Promise<void>,
): Promise<boolean> {
  const { upsertPosts } = await import("./admin");
  const key = handle.replace(/^@+/, "").trim();
  if (!key || !post.id || !post.publishedAt) return false;
  const written = await upsertPosts(
    [
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
    ],
    beforeWrite,
  );
  return written.ok;
}

export async function fillCatalogGaps(
  handles: string[],
  beforeWrite?: () => Promise<void>,
): Promise<number> {
  const have = await listXLastPosts();
  const missing = handles.filter((h) => {
    const key = h.replace(/^@+/, "").trim().toLowerCase();
    if (!key) return false;
    const post = have.get(key);
    return !post || lastPostIsStale(post);
  });
  return fillMissingLastPosts(missing, beforeWrite);
}

export async function fillMissingLastPosts(
  handles: string[],
  beforeWrite?: () => Promise<void>,
): Promise<number> {
  const unique = [
    ...new Set(handles.map((h) => h.replace(/^@+/, "").trim()).filter(Boolean)),
  ].slice(0, 80);
  let n = 0;
  for (let i = 0; i < unique.length; i += 6) {
    const chunk = unique.slice(i, i + 6);
    await Promise.all(
      chunk.map(async (h) => {
        const post = (await latestFromPosts(h)) ?? (await fetchLastPost(h));
        if (!post) return;
        if (await persistLastPost(h, post, beforeWrite)) n += 1;
      }),
    );
  }
  return n;
}
