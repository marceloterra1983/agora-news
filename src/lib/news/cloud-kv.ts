import { adminHeaders, upsertPosts, deletePost, SUPABASE_URL } from "./admin";

function kvId(key: string) {
  return `kv_${key.replace(/[^a-zA-Z0-9_:-]/g, "_").slice(0, 80)}`;
}

export async function cloudKvGet(key: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?post_id=eq.${encodeURIComponent(kvId(key))}&select=content,posted_at,media_label&limit=1`,
      { headers: adminHeaders(), signal: AbortSignal.timeout(4_000) },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{ content?: string; posted_at?: string; media_label?: string }>;
    const row = rows[0];
    if (!row?.content) return null;
    const ttl = Number(row.media_label) || 0;
    const at = Date.parse(row.posted_at || "");
    if (ttl && Number.isFinite(at) && Date.now() - at > ttl * 1000) return null;
    return row.content;
  } catch {
    return null;
  }
}

export async function cloudKvSet(key: string, value: string, ttlSec = 60): Promise<void> {
  const now = new Date().toISOString();
  await upsertPosts([
    {
      post_id: kvId(key),
      account: "cache",
      posted_at: now,
      posted_at_sp: now,
      content: value,
      translation_pt: "",
      summary_pt: key.slice(0, 80),
      post_url: "https://x.com",
      media_label: String(ttlSec),
      image_url: "",
      category: "cache",
      batch_name: "cache",
      source: "cache",
    },
  ]);
}

export async function cloudKvDel(key: string): Promise<void> {
  await deletePost(kvId(key));
}

export function cloudKvId(key: string): string {
  return kvId(key);
}

/** Lista por prefixo de post_id com service-role (não usa SELECT anon). */
export async function cloudKvListPrefix(prefix: string): Promise<Array<{ id: string; content: string }>> {
  const idPrefix = kvId(prefix);
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?post_id=like.${encodeURIComponent(`${idPrefix}*`)}&select=post_id,content&limit=200`,
      { headers: adminHeaders(), signal: AbortSignal.timeout(5_000) },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ post_id?: string; content?: string }>;
    return rows
      .filter((r) => r.post_id && r.content)
      .map((r) => ({ id: String(r.post_id), content: String(r.content) }));
  } catch {
    return [];
  }
}

export async function cloudKvList(category: string): Promise<Array<{ id: string; content: string }>> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?category=eq.${encodeURIComponent(category)}&select=post_id,content&limit=200`,
      { headers: adminHeaders(), signal: AbortSignal.timeout(5_000) },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ post_id?: string; content?: string }>;
    return rows
      .filter((r) => r.post_id && r.content)
      .map((r) => ({ id: String(r.post_id), content: String(r.content) }));
  } catch {
    return [];
  }
}
