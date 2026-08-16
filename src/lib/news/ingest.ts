import { keepLastPost } from "./last-post";
import { persistLastPost } from "./last-post-store";
import { fillCatalogGaps } from "./last-post-store";
import { allProfiles, blurbFor, profileByHandle } from "./profiles";
import { sectionOfHandle } from "./section-catalog.mjs";
import { upsertPosts, upsertProfile, type UpsertPost } from "./admin";
import { listStoredProfiles } from "./profile-store";
import { invalidateFeedCache } from "./feed";
import { persistBuzzCache } from "./fonte-buzz-store";
import { enrichFontesCatalog, invalidateFontesLastCache } from "./influence";
import { mapPool } from "./map-pool";
import { embedForStory } from "./x-media";
import { PAGE_SIZE } from "./page-size.mjs";
import { translateToPt } from "./translate-pt.mjs";
import { clipAtWord } from "./summary-core.mjs";
import { packMediaLabel } from "./story-media-meta.mjs";
import { handlesToScan, latestByAccount } from "./ingest-scan";
import {
  existingIds,
  needsEmbed,
  postedIso,
  saoPauloIso,
  saoPauloStamp,
  statusesFor,
  type Status,
} from "./ingest-fetch";
import { invalidateSupabaseList, storiesFromDbPosts } from "./supabase";
import { CACHE_KEYS, cacheSetNx, cacheBackend } from "./cache";
import { logTiming, nowMs, elapsedMs } from "./timing";
import { cloudKvSet } from "./cloud-kv";
import { sendPushForStories } from "./push-server";

const MAX_AGE_MS = 36 * 60 * 60_000;
const MAX_INSERT = 40;
const LOCK_MS = 90_000;
const SKIP_IF_FRESH_MS = 10 * 60_000;

async function translateLine(text: string): Promise<string> {
  const src = text.replace(/\s+/g, " ").trim();
  if (!src) return "";
  return (await translateToPt(src, { chunk: 280 })).slice(0, 280);
}

async function acquireLock(): Promise<boolean> {
  return cacheSetNx(CACHE_KEYS.lock, String(Date.now()), Math.ceil(LOCK_MS / 1000));
}

export async function runIngest(opts?: { limitHandles?: number; withProfiles?: boolean }) {
  const t0 = nowMs();
  const locked = await acquireLock();
  if (!locked) return { ok: true, skipped: true, reason: "locked" as const };

  const { catalog, extra, watch } = await handlesToScan(opts?.limitHandles ?? 64);
  const catalogInput = { profiles: allProfiles(), extras: watch };
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
    .slice(0, MAX_INSERT)
    .filter((c) => sectionOfHandle(c.handle, catalogInput));

  let gtxFail = 0;
  const built = await mapPool(fresh, 8, async ({ handle, status }) => {
    const posted = postedIso(status) || new Date().toISOString();
    const content = String(status.text).replace(/\s+/g, " ").trim();
    let photo = status.media?.photos?.[0]?.url || status.media?.videos?.[0]?.thumbnail_url || "";
    let media = photo ? (status.media?.videos?.length ? "Vídeo" : "Foto") : "Nenhuma";
    let usedEmbed = false;
    let embedMeta: Record<string, unknown> | null = null;

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
      embedMeta = {
        quoted: embed.quoted,
        replyTo: embed.replyTo,
        card: embed.card,
        xArticle: embed.article,
        assets: embed.assets,
      };
    } else if (status.quote || status.retweet) {
      media = status.retweet ? "Repost" : "Citação";
    }

    const translation = await translateToPt(content, { onFail: () => { gtxFail += 1; } });
    const row: UpsertPost = {
      post_id: String(status.id),
      account: handle,
      posted_at: posted,
      posted_at_sp: saoPauloIso(posted),
      content,
      translation_pt: translation,
      summary_pt: clipAtWord(translation, 180),
      post_url: status.url || `https://x.com/${handle}/status/${status.id}`,
      media_label: packMediaLabel(media, embedMeta),
      image_url: photo,
      category: sectionOfHandle(handle, catalogInput),
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
    ...watch.map((w) => w.handle),
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

  const result = {
    batch,
    scanned: due.length,
    skippedFresh,
    candidates: candidates.length,
    inserted: rows.length,
    embeds,
    gtxFail,
    written: written.status,
    writtenCount: written.count,
    ok: written.ok,
    error: written.error,
    profiles,
    lastFilled,
    enriched,
    pushed,
    cache: cacheBackend(),
  };
  logTiming("ingest", elapsedMs(t0), {
    scanned: result.scanned,
    inserted: result.inserted,
    gtxFail,
    written: written.count,
    ok: written.ok,
  });
  return result;
}
