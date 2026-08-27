import { isNewsRow } from "./news-row.mjs";
import { needsFullTranslation } from "./story-pt.mjs";
import { applyStoredTranslation, translateToPt } from "./translate-pt.mjs";

const RETRY_WINDOW_MS = 36 * 60 * 60_000;
const RETRY_SCAN = 200;
const RETRY_WRITE = 24;

export function postsNeedingPt(rows) {
  return (Array.isArray(rows) ? rows : []).filter(
    (row) => isNewsRow(row) && needsFullTranslation(row.content, row.translation_pt),
  );
}

export async function listRecentNewsPosts(limit = RETRY_SCAN) {
  const { supabaseReadHeaders, SUPABASE_POSTS_URL } = await import("./supabase.ts");
  const params = new URLSearchParams();
  params.set(
    "select",
    "post_id,account,posted_at,posted_at_sp,content,translation_pt,summary_pt,post_url,media_label,image_url,category,batch_name,source",
  );
  params.set("posted_at", `gte.${new Date(Date.now() - RETRY_WINDOW_MS).toISOString()}`);
  params.set("order", "posted_at.desc");
  params.set("limit", String(limit));
  try {
    const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
      headers: supabaseReadHeaders(),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function retranslateMissingPt(opts = {}) {
  const listRecent = opts.listRecent ?? listRecentNewsPosts;
  const translate = opts.translate ?? translateToPt;
  const upsert = opts.upsert ?? (await import("./admin.ts")).upsertPosts;
  const need = postsNeedingPt(await listRecent(RETRY_SCAN)).slice(0, opts.limit ?? RETRY_WRITE);
  const built = [];
  for (const row of need) {
    await opts.assertOwned?.();
    const translation = await translate(row.content, { onFail: opts.onFail });
    const stored = applyStoredTranslation(row.content, translation);
    if (!stored.translation_pt) continue;
    built.push({
      post_id: row.post_id,
      account: row.account,
      posted_at: row.posted_at,
      posted_at_sp: row.posted_at_sp,
      content: row.content,
      translation_pt: stored.translation_pt,
      summary_pt: stored.summary_pt,
      post_url: row.post_url,
      media_label: row.media_label || "",
      image_url: row.image_url || "",
      category: row.category || "",
      batch_name: row.batch_name || "",
      source: row.source || "x",
    });
  }
  if (!built.length) return 0;
  await opts.assertOwned?.();
  const written = await upsert(built, opts.assertOwned);
  return written.count ?? 0;
}
