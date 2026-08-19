import { translateToPt } from "./translate-pt.mjs";
import { needsFullTranslation } from "./story-pt.mjs";
import { readAvatarsByHandles, readStoredProfile } from "./profile-store";
import { displayAvatarUrl, withAvatars } from "./profile-store-core.mjs";
import type { Story } from "./types";

const FACE_TTL = 10 * 60_000;
const faceCache = new Map<string, { at: number; avatar: string | null }>();

function handleKey(handle: string): string {
  return handle.replace(/^@+/, "").trim().toLowerCase();
}

async function avatarMapFor(handles: string[]): Promise<Map<string, string>> {
  const now = Date.now();
  const map = new Map<string, string>();
  const missing: string[] = [];
  for (const raw of handles) {
    const key = handleKey(raw);
    if (!key) continue;
    const hit = faceCache.get(key);
    if (hit && now - hit.at < FACE_TTL) {
      if (hit.avatar) map.set(key, hit.avatar);
      continue;
    }
    missing.push(raw);
  }
  if (!missing.length) return map;
  const fetched = await readAvatarsByHandles(missing);
  const seen = new Set(missing.map(handleKey));
  for (const key of seen) {
    const face = fetched.get(key) || null;
    faceCache.set(key, { at: now, avatar: face });
    if (face) map.set(key, face);
  }
  return map;
}

async function avatarOf(handle: string): Promise<string | null> {
  const key = handleKey(handle);
  if (!key) return null;
  try {
    return (await avatarMapFor([handle])).get(key) || null;
  } catch {
    return displayAvatarUrl((await readStoredProfile(handle))?.avatar) || null;
  }
}

export async function attachStoryAvatars(stories: Story[]): Promise<Story[]> {
  if (!stories.length) return stories;
  try {
    return withAvatars(
      stories,
      await avatarMapFor(stories.map((s) => s.source)),
    );
  } catch {
    return withAvatars(stories, new Map());
  }
}

export async function hydrateStory(story: Story): Promise<Story> {
  let body = (story.body || story.excerpt || "").trim();
  if (needsFullTranslation(story.original, body)) {
    const pt = await translateToPt(story.original);
    if (pt) body = pt;
  }
  if (!body) body = story.original || story.title;
  const avatar = displayAvatarUrl(story.avatar) || (await avatarOf(story.source));
  return { ...story, body, avatar };
}
