import { translateToPt } from "./translate-pt.mjs";
import { needsFullTranslation } from "./story-pt.mjs";
import { readStoredProfile } from "./profile-store";
import type { Story } from "./types";

const FACE_TTL = 10 * 60_000;
const faceCache = new Map<string, { at: number; avatar: string | null }>();

async function avatarOf(handle: string): Promise<string | null> {
  const key = handle.replace(/^@+/, "").trim().toLowerCase();
  if (!key) return null;
  const hit = faceCache.get(key);
  if (hit && Date.now() - hit.at < FACE_TTL) return hit.avatar;
  const avatar = (await readStoredProfile(key))?.avatar || null;
  faceCache.set(key, { at: Date.now(), avatar });
  return avatar;
}

export async function hydrateStory(story: Story): Promise<Story> {
  let body = (story.body || story.excerpt || "").trim();
  if (needsFullTranslation(story.original, body)) {
    const pt = await translateToPt(story.original);
    if (pt) body = pt;
  }
  if (!body) body = story.original || story.title;
  const avatar = story.avatar || (await avatarOf(story.source));
  return { ...story, body, avatar };
}
