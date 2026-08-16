import { looksPortuguese } from "./summary-core.mjs";
import { chunkText, needsFullTranslation, parseGtx } from "./story-pt.mjs";
import { readStoredProfile } from "./profile-store";
import type { Story } from "./types";

const FACE_TTL = 10 * 60_000;
const faceCache = new Map<string, { at: number; avatar: string | null }>();

async function translateToPt(text: string): Promise<string> {
  const src = text.trim();
  if (!src) return "";
  if (looksPortuguese(src)) return src;
  const out: string[] = [];
  for (const chunk of chunkText(src, 1500)) {
    try {
      const g = await fetch(
        `https://translate.googleapis.com/translate_a/single?${new URLSearchParams({
          client: "gtx",
          sl: "auto",
          tl: "pt",
          dt: "t",
          q: chunk,
        })}`,
        { signal: AbortSignal.timeout(8_000) },
      );
      if (!g.ok) {
        out.push(chunk);
        continue;
      }
      out.push(parseGtx(await g.json()) || chunk);
    } catch {
      out.push(chunk);
    }
  }
  return out.join("").trim();
}

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
