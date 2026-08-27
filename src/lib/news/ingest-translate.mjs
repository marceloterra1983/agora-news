import { isNewsRow } from "./news-row.mjs";
import { needsFullTranslation } from "./story-pt.mjs";
import { applyStoredTranslation, translateToPt } from "./translate-pt.mjs";

const RETRY_WINDOW_MS = 36 * 60 * 60_000;
const RETRY_EMPTY = 120;
const RETRY_RECENT = 400;
const RETRY_WRITE = 48;
const POST_SELECT =
  "post_id,account,posted_at,posted_at_sp,content,translation_pt,summary_pt,post_url,media_label,image_url,category,batch_name,source";

export function postsNeedingPt(rows) {
  return (Array.isArray(rows) ? rows : []).filter(
    (row) => isNewsRow(row) && needsFullTranslation(row.content, row.translation_pt),
  );
}

/** Vazios primeiro: os 200 mais novos são RSS já em PT e o backlog EN some da janela. */
export function mergeRetranslateRows(empty, recent) {
  const seen = new Set();
  const out = [];
  for (const row of [...(empty || []), ...(recent || [])]) {
    const id = row?.post_id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

async function fetchNewsPosts(extra) {
  const { supabaseReadHeaders, SUPABASE_POSTS_URL } = await import("./supabase.ts");
  const params = new URLSearchParams();
  params.set("select", POST_SELECT);
  params.set("posted_at", `gte.${new Date(Date.now() - RETRY_WINDOW_MS).toISOString()}`);
  params.set("order", "posted_at.desc");
  for (const [key, value] of Object.entries(extra)) params.set(key, value);
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

export async function listRecentNewsPosts(limit = RETRY_RECENT) {
  return fetchNewsPosts({ limit: String(limit) });
}

export async function listPostsForRetranslate() {
  const [empty, recent] = await Promise.all([
    fetchNewsPosts({
      limit: String(RETRY_EMPTY),
      or: "(translation_pt.eq.,translation_pt.is.null)",
    }),
    fetchNewsPosts({ limit: String(RETRY_RECENT) }),
  ]);
  return mergeRetranslateRows(empty, recent);
}

export async function retranslateMissingPt(opts = {}) {
  const listRecent = opts.listRecent ?? listPostsForRetranslate;
  const translate = opts.translate ?? translateToPt;
  const upsert = opts.upsert ?? (await import("./admin.ts")).upsertPosts;
  const need = postsNeedingPt(await listRecent()).slice(0, opts.limit ?? RETRY_WRITE);
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
