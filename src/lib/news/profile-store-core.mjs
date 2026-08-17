/**
 * Regras puras de perfil persistido — fonte única para TS e node:test.
 */
import { parseLastPost } from "./last-post-core.mjs";

/**
 * @param {unknown} raw
 * @param {string} [fallbackHandle]
 */
export function storedProfileFromRow(raw, fallbackHandle = "") {
  if (!raw || typeof raw !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const handle = String(o.handle || o.account || fallbackHandle || "")
    .replace(/^@+/, "")
    .trim();
  if (!handle) return null;
  const avatar = o.avatar || o.image_url || null;
  return {
    handle,
    name: String(o.name || o.translation_pt || handle),
    bio: String(o.bio || o.content || ""),
    summary_pt: String(o.summary_pt || ""),
    avatar: typeof avatar === "string" && avatar ? avatar : null,
    followers: Number(o.followers ?? o.media_label) || 0,
    last_post: parseLastPost(o.last_post),
    updated_at: String(o.updated_at || o.posted_at || ""),
  };
}
