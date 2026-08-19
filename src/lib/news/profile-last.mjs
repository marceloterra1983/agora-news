/**
 * Histórico curto do perfil: 10 últimos posts, UI abre de 2 em 2.
 */
import { parseLastPost } from "./last-post-core.mjs";

export const PROFILE_LAST_KEEP = 10;
export const PROFILE_LAST_PAGE = 2;

/**
 * @param {unknown} raw
 * @returns {import("./last-post-core.mjs").StoredLastPost | null}
 */
function asLast(raw) {
  return parseLastPost(raw);
}

/**
 * @param {unknown} prev
 * @param {unknown} incoming
 * @param {number} [max]
 */
export function keepLastPosts(prev, incoming, max = PROFILE_LAST_KEEP) {
  const map = new Map();
  for (const raw of [...(Array.isArray(prev) ? prev : []), ...(Array.isArray(incoming) ? incoming : [])]) {
    const post = asLast(raw);
    if (!post) continue;
    const older = map.get(post.id);
    if (!older || Date.parse(post.publishedAt) >= Date.parse(older.publishedAt)) {
      map.set(post.id, post);
    }
  }
  return [...map.values()]
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, Math.max(0, max));
}

/**
 * Empacota no JSON já persistido em x_profiles.last_post.
 * Cabeça = mais novo (parseLastPost continua válido); recent = os outros.
 * @param {unknown} list
 */
export function packLastPosts(list) {
  const kept = keepLastPosts(list, []);
  if (!kept.length) return null;
  const [head, ...recent] = kept;
  return recent.length ? { ...head, recent } : head;
}

/**
 * @param {unknown} raw
 */
export function unpackLastPosts(raw) {
  const head = asLast(raw);
  const extra =
    raw && typeof raw === "object" && !Array.isArray(raw) && Array.isArray(/** @type {{ recent?: unknown }} */ (raw).recent)
      ? /** @type {{ recent: unknown[] }} */ (raw).recent
      : [];
  return keepLastPosts(head ? [head, ...extra] : extra, []);
}

/**
 * @param {number} shown
 * @param {number} total
 */
export function nextProfileShown(shown, total) {
  const cap = Math.max(0, Number(total) || 0);
  const current = Math.max(0, Number(shown) || 0);
  if (current >= cap) return cap;
  return Math.min(cap, current + PROFILE_LAST_PAGE);
}

/**
 * @param {unknown[]} posts
 * @param {number} shown
 */
export function visibleProfilePosts(posts, shown) {
  const list = Array.isArray(posts) ? posts : [];
  const n = Math.min(list.length, Math.max(0, Number(shown) || 0));
  return list.slice(0, n);
}
