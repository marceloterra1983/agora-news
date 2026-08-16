/**
 * Regras puras de last-post — fonte única para TS e para node:test.
 * last-post.ts só adiciona I/O (fxtwitter / posts).
 */

/**
 * @typedef {{ id: string, text: string, url: string, publishedAt: string }} StoredLastPost
 */

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
  return {
    id,
    text,
    url: String(o.url || `https://x.com/i/status/${id}`),
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
