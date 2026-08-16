import { keepLastPost } from "./last-post";
import { persistLastPost } from "./last-post-store";
import { fillCatalogGaps } from "./last-post-store";
import { allProfiles, blurbFor, profileByHandle, profilesFor } from "./profiles";
import { listKnownSections } from "./sections";
import { upsertPosts, upsertProfile, type UpsertPost } from "./admin";
import { listStoredProfiles } from "./profile-store";
import { listWatchAccounts } from "./watch";
import { invalidateFeedCache } from "./feed";
import { persistBuzzCache } from "./fonte-buzz-store";
import { enrichFontesCatalog, invalidateFontesLastCache } from "./influence";
import { mapPool } from "./map-pool";
import { embedForStory } from "./x-media";
import { PAGE_SIZE } from "./page-size.mjs";
import { translateToPt } from "./translate-pt.mjs";
import { clipAtWord } from "./summary-core.mjs";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_POSTS_URL,
  invalidateSupabaseList,
  storiesFromDbPosts,
} from "./supabase";
import { CACHE_KEYS, cacheGetJson, cacheSetJson, cacheSetNx, cacheBackend } from "./cache";
import { cloudKvSet } from "./cloud-kv";
import { sendPushForStories } from "./push-server";

const MAX_AGE_MS = 36 * 60 * 60_000;
const MAX_INSERT = 40;
const LOCK_MS = 90_000;
const SKIP_IF_FRESH_MS = 10 * 60_000;
const AUTH = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

function saoPauloStamp(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const g = (t: string) => parts.find((p) => p.type === t)?.value || "00";
  return `${g("year")}-${g("month")}-${g("day")}_${g("hour")}-${g("minute")}`;
}

function saoPauloIso(iso: string) {
  try {
    return new Date(iso).toLocaleString("sv-SE", { timeZone: "America/Sao_Paulo" }).replace(" ", "T");
  } catch {
    return iso;
  }
}

function postedIso(status: Status): string {
  if (status.created_timestamp) return new Date(status.created_timestamp * 1000).toISOString();
  if (status.created_at) return new Date(status.created_at).toISOString();
  return "";
}

async function translateLine(text: string): Promise<string> {
  const src = text.replace(/\s+/g, " ").trim();
  if (!src) return "";
  if (/[áàâãéêíóôõúç]/i.test(src) && !/\b(the|and|with|for|this)\b/i.test(src)) return src.slice(0, 280);
  try {
    const g = await fetch(
      `https://translate.googleapis.com/translate_a/single?${new URLSearchParams({
        client: "gtx",
        sl: "auto",
        tl: "pt",
        dt: "t",
        q: src.slice(0, 280),
      })}`,
      { signal: AbortSignal.timeout(5_000) },
    );
    if (!g.ok) return src.slice(0, 280);
    const data = (await g.json()) as unknown;
    const parts = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];
    const out = parts
      .map((p) => (Array.isArray(p) && typeof p[0] === "string" ? p[0] : ""))
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    return (out || src).slice(0, 280);
  } catch {
    return src.slice(0, 280);
  }
}

type Status = {
  id?: string;
  text?: string;
  url?: string;
  created_timestamp?: number;
  created_at?: string;
  replying_to?: unknown;
  quote?: { id?: string; text?: string; author?: { screen_name?: string } };
  retweet?: { id?: string; text?: string; author?: { screen_name?: string } };
  card?: { title?: string };
  article?: { id?: string; title?: string };
  media?: { photos?: Array<{ url?: string }>; videos?: Array<{ thumbnail_url?: string; url?: string }> };
  author?: {
    screen_name?: string;
    name?: string;
    description?: string;
    avatar_url?: string;
    followers?: number;
  };
};

function needsEmbed(status: Status): boolean {
  if (status.quote || status.retweet || status.card || status.article) return true;
  if (status.media?.videos?.length) return true;
  if (status.media?.photos?.[0]?.url) return false;
  return /https?:\/\/t\.co\/|\/i\/article|quoted/i.test(status.text || "");
}

async function statusesFor(handle: string): Promise<Status[]> {
  const res = await fetch(
    `https://api.fxtwitter.com/2/profile/${encodeURIComponent(handle)}/statuses?count=3`,
    { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(5_000) },
  );
  if (!res.ok) return [];
  const body = (await res.json()) as { results?: Status[] };
  return body.results ?? [];
}

async function existingIds(ids: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  const unique = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 80) {
    const chunk = unique.slice(i, i + 80);
    const params = new URLSearchParams();
    params.set("select", "post_id");
    params.set("post_id", `in.(${chunk.join(",")})`);
    const res = await fetch(`${SUPABASE_POSTS_URL}?${params}`, {
      headers: AUTH,
      signal: AbortSignal.timeout(6_000),
    });
    if (!res.ok) continue;
    const rows = (await res.json()) as Array<{ post_id?: string }>;
    for (const row of rows) if (row.post_id) out.add(row.post_id);
  }
  return out;
}

async function latestByAccount(): Promise<Map<string, number>> {
  const cached = await cacheGetJson<Array<[string, number]>>(CACHE_KEYS.newest);
  if (cached?.length) return new Map(cached);
  const out = new Map<string, number>();
  try {
    const res = await fetch(
      `${SUPABASE_POSTS_URL}?select=account,posted_at&category=eq.ai&order=posted_at.desc&limit=80`,
      { headers: AUTH, signal: AbortSignal.timeout(5_000) },
    );
    if (!res.ok) return out;
    const rows = (await res.json()) as Array<{ account?: string; posted_at?: string }>;
    for (const row of rows) {
      const key = (row.account || "").replace(/^@+/, "").toLowerCase();
      if (!key || out.has(key)) continue;
      const at = Date.parse(row.posted_at || "");
      if (Number.isFinite(at)) out.set(key, at);
    }
    if (out.size) void cacheSetJson(CACHE_KEYS.newest, [...out.entries()], 60);
  } catch {
    /* scan everyone */
  }
  return out;
}

async function acquireLock(): Promise<boolean> {
  const got = await cacheSetNx(CACHE_KEYS.lock, String(Date.now()), Math.ceil(LOCK_MS / 1000));
  if (!got) return false;
  return true;
}

async function handlesToScan(limit: number): Promise<{ catalog: string[]; extra: string[] }> {
  const catalog = listKnownSections().flatMap((s) =>
    profilesFor(s).map((p) => p.handle.replace(/^@/, "")),
  );
  const extra = (await listWatchAccounts()).map((w) => w.handle.replace(/^@/, ""));
  const take = (list: string[], room: number) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const handle of list) {
      const key = handle.toLowerCase();
      if (!handle || seen.has(key)) continue;
      seen.add(key);
      out.push(handle);
      if (out.length >= room) break;
    }
    return out;
  };
  const extras = take(extra, Math.min(16, limit));
  const mains = take(
    catalog.filter((h) => !extras.some((e) => e.toLowerCase() === h.toLowerCase())),
    Math.max(0, limit - extras.length),
  );
  return { catalog: mains, extra: extras };
}

export async function runIngest(opts?: { limitHandles?: number; withProfiles?: boolean }) {
  const locked = await acquireLock();
  if (!locked) return { ok: true, skipped: true, reason: "locked" as const };

  const { catalog, extra } = await handlesToScan(opts?.limitHandles ?? 64);
  const newest = await latestByAccount();
  const now = Date.now();
  const extraSet = new Set(extra.map((h) => h.toLowerCase()));
  const due = [...catalog, ...extra].filter((handle) => {
    if (extraSet.has(handle.toLowerCase())) return true;
    const last = newest.get(handle.toLowerCase()) || 0;
    return now - last > SKIP_IF_FRESH_MS;
  });
  const skippedFresh = catalog.length + extra.length - due.length;

  const batch = saoPauloStamp();
  const collected = await mapPool(due, 10, async (handle) => {
    try {
      return { handle, list: await statusesFor(handle) };
    } catch {
      return { handle, list: [] as Status[] };
    }
  });

  const cutoff = now - MAX_AGE_MS;
  const candidates: Array<{ handle: string; status: Status }> = [];
  for (const { handle, list } of collected) {
    for (const status of list) {
      if (!status.id || !status.text) continue;
      if (status.replying_to) continue;
      const at = Date.parse(postedIso(status));
      if (!Number.isFinite(at) || at < cutoff) continue;
      candidates.push({ handle, status });
    }
  }

  const known = await existingIds(candidates.map((c) => String(c.status.id)));
  const seenFresh = new Set<string>();
  const fresh = candidates
    .filter((c) => {
      const id = String(c.status.id);
      if (known.has(id) || seenFresh.has(id)) return false;
      seenFresh.add(id);
      return true;
    })
    .sort((a, b) => Date.parse(postedIso(b.status)) - Date.parse(postedIso(a.status)))
    .slice(0, MAX_INSERT);

  const built = await mapPool(fresh, 8, async ({ handle, status }) => {
    const posted = postedIso(status) || new Date().toISOString();
    const content = String(status.text).replace(/\s+/g, " ").trim();
    let photo = status.media?.photos?.[0]?.url || status.media?.videos?.[0]?.thumbnail_url || "";
    let media = photo ? (status.media?.videos?.length ? "Vídeo" : "Foto") : "Nenhuma";
    let usedEmbed = false;

    if (needsEmbed(status)) {
      usedEmbed = true;
      const embed = await embedForStory({ id: String(status.id), source: handle });
      photo =
        embed.assets.find((a) => a.type === "photo")?.url ||
        embed.assets.find((a) => a.poster)?.poster ||
        embed.quoted?.image ||
        embed.card?.image ||
        embed.article?.cover ||
        photo;
      const kind = embed.quoted?.kind;
      media = embed.assets.some((a) => a.type === "video")
        ? "Vídeo"
        : kind === "repost"
          ? "Repost"
          : kind === "quote"
            ? "Citação"
            : embed.article
              ? "Artigo"
              : embed.card
                ? "Link"
                : photo
                  ? "Foto"
                  : "Nenhuma";
    } else if (status.quote || status.retweet) {
      media = status.retweet ? "Repost" : "Citação";
    }

    const translation = await translateToPt(content);
    const row: UpsertPost = {
      post_id: String(status.id),
      account: handle,
      posted_at: posted,
      posted_at_sp: saoPauloIso(posted),
      content,
      translation_pt: translation,
      summary_pt: clipAtWord(translation, 180),
      post_url: status.url || `https://x.com/${handle}/status/${status.id}`,
      media_label: media,
      image_url: photo,
      category: profileByHandle(handle)?.section || "ai",
      batch_name: batch,
      source: "x",
    };
    return { row, usedEmbed };
  });
  const rows = built.map((b) => b.row);
  const embeds = built.filter((b) => b.usedEmbed).length;

  const written = await upsertPosts(rows);
  if (written.ok && rows.length) {
    invalidateSupabaseList();
    invalidateFeedCache();
    invalidateFontesLastCache();
    try {
      const stories = storiesFromDbPosts(rows, "ai");
      const byCat = new Map<string, typeof stories>();
      for (const story of stories) {
        const list = byCat.get(story.category) ?? [];
        list.push(story);
        byCat.set(story.category, list);
      }
      for (const [cat, list] of byCat) {
        await cloudKvSet(CACHE_KEYS.list(cat, PAGE_SIZE), JSON.stringify(list.slice(0, PAGE_SIZE)), 60);
      }
    } catch {
      /* cache is optional */
    }
  }

  let pushed = 0;
  if (written.ok && rows.length) {
    try {
      pushed = await sendPushForStories(
        rows.map((r) => ({
          id: r.post_id,
          source: r.account,
          title: r.summary_pt || r.translation_pt,
        })),
      );
    } catch {
      pushed = 0;
    }
  }

  let profiles = 0;
  if (opts?.withProfiles !== false) {
    const stored = await listStoredProfiles();
    const storedAt = new Map(stored.map((p) => [p.handle.toLowerCase(), p]));
    const sample = due.filter((handle) => {
      const hit = storedAt.get(handle.toLowerCase());
      if (!hit?.summary_pt) return true;
      return Date.now() - Date.parse(hit.updated_at || "") > 7 * 24 * 60 * 60_000;
    }).slice(0, 8);
    await mapPool(sample, 4, async (handle) => {
      const list = collected.find((c) => c.handle.toLowerCase() === handle.toLowerCase())?.list ?? [];
      const last = list.find((t) => t.id && t.text);
      const author = last?.author;
      const knownProfile = profileByHandle(handle);
      const prev = storedAt.get(handle.toLowerCase());
      const name = knownProfile?.name || author?.name || handle;
      const bio = author?.description?.trim() || prev?.bio || "";
      const summary = knownProfile
        ? blurbFor(handle, name)
        : bio
          ? await translateLine(bio)
          : prev?.summary_pt || "";
      if (!summary) return;
      const lastPost = keepLastPost(
        prev?.last_post,
        last?.id
          ? {
              id: String(last.id),
              text: String(last.text),
              url: last.url || `https://x.com/${handle}/status/${last.id}`,
              publishedAt: postedIso(last) || "",
            }
          : null,
      );
      const ok = await upsertProfile({
        handle,
        name,
        bio,
        summary_pt: summary.slice(0, 220),
        avatar: author?.avatar_url?.replace("_normal.", "_400x400.") || prev?.avatar || null,
        followers: Number(author?.followers) || prev?.followers || 0,
        last_post: lastPost,
      });
      if (lastPost) await persistLastPost(handle, lastPost);
      if (ok) profiles += 1;
    });
  }

  const lastFilled = await fillCatalogGaps([
    ...allProfiles().map((p) => p.handle),
    ...(await listWatchAccounts()).map((w) => w.handle),
  ]);
  if (lastFilled) invalidateFontesLastCache();

  const storedForEnrich = await listStoredProfiles();
  const storedAtEnrich = new Map(storedForEnrich.map((p) => [p.handle.toLowerCase(), p]));
  let enriched = 0;
  const liveRows = await enrichFontesCatalog();
  const needStore = liveRows
    .filter((r) => (r.avatar || r.followers) && !storedAtEnrich.get(r.handle.toLowerCase())?.avatar)
    .slice(0, 8);
  await mapPool(needStore, 4, async (r) => {
    const prev = storedAtEnrich.get(r.handle.toLowerCase());
    const ok = await upsertProfile({
      handle: r.handle,
      name: r.name,
      bio: r.bio || prev?.bio || "",
      summary_pt: prev?.summary_pt || r.bio || r.handle,
      avatar: r.avatar,
      followers: r.followers || prev?.followers || 0,
      last_post: prev?.last_post ?? null,
    });
    if (ok) enriched += 1;
  });
  await persistBuzzCache();

  return {
    batch,
    scanned: due.length,
    skippedFresh,
    candidates: candidates.length,
    inserted: rows.length,
    embeds,
    written: written.status,
    ok: written.ok,
    error: written.error,
    profiles,
    lastFilled,
    enriched,
    pushed,
    cache: cacheBackend(),
  };
}
