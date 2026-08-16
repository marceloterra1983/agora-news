/**
 * Regras puras de last-post — fonte única para TS e para node:test.
 * last-post.ts só adiciona I/O (fxtwitter / posts).
 */

/**
 * @typedef {{ id: string, text: string, url: string, publishedAt: string }} StoredLastPost
 */

/**
 * @param {unknown} raw
 * @param {{ allowPath?: boolean }} [opts]
 * @returns {string}
 */
export function safeHttpHref(raw, opts = {}) {
  const allowPath = opts.allowPath !== false;
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      if (u.protocol === "http:" || u.protocol === "https:") return s;
    } catch {
      return "";
    }
    return "";
  }
  if (allowPath && s.startsWith("/") && !s.startsWith("//") && !s.includes("\\")) return s;
  return "";
}

/** @param {unknown} raw @returns {StoredLastPost | null} */
export function parseLastPost(raw) {
  if (!raw || typeof raw !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const id = String(o.id || "").trim();
  const text = String(o.text || o.title || "")
    .replace(/\s+/g, " ")
    .trim();
  const publishedAt = String(o.publishedAt || "").trim();
  if (!id || !publishedAt) return null;
  const fallback = `https://x.com/i/status/${id}`;
  return {
    id,
    text,
    url: safeHttpHref(String(o.url || fallback)) || fallback,
    publishedAt,
  };
}

/** @param {string} handle @param {string} id @param {boolean} inApp */
export function lastPostHref(handle, id, inApp) {
  const key = handle.replace(/^@+/, "").trim();
  if (inApp && id) return `/materia/${id}`;
  if (id) return `https://x.com/${key}/status/${id}`;
  return `https://x.com/${key}`;
}

/**
 * @param {StoredLastPost | null | undefined} prev
 * @param {StoredLastPost | null | undefined} next
 * @returns {StoredLastPost | null}
 */
export function keepLastPost(prev, next) {
  if (!next) return prev ?? null;
  if (!prev) return next;
  const pt = Date.parse(prev.publishedAt);
  const nt = Date.parse(next.publishedAt);
  if (!Number.isFinite(nt)) return prev;
  if (Number.isFinite(pt) && nt < pt) return prev;
  return next;
}

/**
 * @param {StoredLastPost | null | undefined} post
 * @returns {{ id: string, title: string, publishedAt: string, count: number } | null}
 */
export function storedToLastHit(post) {
  if (!post?.id) return null;
  return { id: post.id, title: post.text.slice(0, 180), publishedAt: post.publishedAt, count: 1 };
}

/**
 * @template {{ publishedAt: string }} T
 * @param {T | null} a
 * @param {T | null} b
 * @returns {T | null}
 */
export function preferNewerLast(a, b) {
  if (!a) return b;
  if (!b) return a;
  return Date.parse(b.publishedAt) > Date.parse(a.publishedAt) ? b : a;
}

/** x-last com mais de 14 dias entra de novo no fill (DanielaAmodei 2023). */
export const LAST_POST_STALE_MS = 14 * 24 * 60 * 60_000;

/** @param {{ publishedAt?: string } | null | undefined} post @param {number} [now] */
export function lastPostIsStale(post, now = Date.now()) {
  if (!post?.publishedAt) return true;
  const at = Date.parse(post.publishedAt);
  return !Number.isFinite(at) || now - at > LAST_POST_STALE_MS;
}

/** @param {unknown} id */
export function isSyntheticPostId(id) {
  return /^(prfl_|watch_|last_|kv_)/i.test(String(id || ""));
}

/** @param {unknown} id @param {unknown} url */
export function usableTweetId(id, url) {
  const fromUrl = String(url || "").match(/\/status\/(\d+)/)?.[1];
  if (fromUrl) return fromUrl;
  const raw = String(id || "").trim();
  return /^\d+$/.test(raw) ? raw : "";
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @param {string} [handle]
 * @returns {{ id: string, text: string, url: string, publishedAt: string } | null}
 */
export function lastPostFromXLastRow(row, handle = "") {
  if (!row || typeof row !== "object") return null;
  const key = String(handle || row.account || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
  const publishedAt = String(row.posted_at || "").trim();
  const text = String(row.summary_pt || row.content || "").trim();
  if (!key || !publishedAt || !text) return null;
  const url = String(row.post_url || "").trim();
  const id = usableTweetId(row.post_id, url);
  if (!id) return null;
  return {
    id,
    text: text.slice(0, 280),
    url: url || `https://x.com/${key}/status/${id}`,
    publishedAt,
  };
}

/**
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} handle
 */
export function pickLatestFromPostRows(rows, handle) {
  if (!Array.isArray(rows)) return null;
  for (const row of rows) {
    const rawId = String(row?.post_id || "");
    if (!rawId || isSyntheticPostId(rawId)) continue;
    const post = lastPostFromXLastRow(row, handle);
    if (post) return post;
  }
  return null;
}

/** @param {string} [category] */
export function xLastListParams(category = "x-last") {
  const params = new URLSearchParams();
  params.set("select", "account,post_id,posted_at,summary_pt,content,post_url");
  params.set("category", `eq.${category}`);
  params.set("order", "posted_at.desc");
  params.set("limit", "1000");
  return params;
}
