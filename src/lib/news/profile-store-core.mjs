/**
 * Regras puras de perfil persistido — fonte única para TS e node:test.
 */
import { keepLastPost, parseLastPost } from "./last-post-core.mjs";

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

function keepText(prev, next) {
  const a = String(prev || "").trim();
  return a || String(next || "").trim();
}

/**
 * Sessão pode preencher perfil novo; não sobrescreve campos já gravados no catálogo.
 * last_post ainda entra via keepLastPost.
 * @param {Record<string, unknown> | null | undefined} prev
 * @param {Record<string, unknown> | null | undefined} body
 */
export function mergeClientProfile(prev, body) {
  const handle = String(body?.handle || prev?.handle || "")
    .replace(/^@+/, "")
    .trim();
  if (!handle) return null;
  const incoming = parseLastPost(body?.last_post ?? body?.lastPost);
  const avatar = prev?.avatar || body?.avatar || null;
  return {
    handle: String(prev?.handle || handle),
    name: keepText(prev?.name, body?.name) || handle,
    bio: keepText(prev?.bio, body?.bio),
    summary_pt: keepText(prev?.summary_pt, body?.summary_pt || body?.bio || body?.summary).slice(0, 220),
    avatar: typeof avatar === "string" && avatar ? avatar : null,
    followers: Number(prev?.followers) || Number(body?.followers) || 0,
    last_post: keepLastPost(prev?.last_post, incoming),
  };
}
