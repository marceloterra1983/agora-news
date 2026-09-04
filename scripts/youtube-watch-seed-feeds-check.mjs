#!/usr/bin/env node
/**
 * Smoke: canais do seed recalibrado por watch-history respondem via Atom
 * ou via página /videos (fallback já usado em youtube-ingest).
 */
import { YOUTUBE_SEED } from "../src/lib/news/youtube-catalog.mjs";
import { extractChannelVideosFromHtml } from "../src/lib/news/youtube-core.mjs";

const WATCH_TITLES = new Set([
  "Maestros da IA",
  "Rafael Quintanilha – QuantBrasil",
  "Vini Lana",
  "Sandeco",
  "PrimosAgro",
  "Deltan Dallagnol",
  "Flow Podcast",
  "Inteligência Ltda",
  "CazéTV",
  "Waldemar Neto - Dev Lab",
  "André Marsiglia",
  "TV 247",
  "Kim Kataguiri",
  "Talk Flow",
]);

const UA = "Mozilla/5.0 (compatible; agora-news-watch-seed-check/1.0)";
const channels = YOUTUBE_SEED.filter((row) => WATCH_TITLES.has(row.title));

if (channels.length !== WATCH_TITLES.size) {
  const missing = [...WATCH_TITLES].filter((t) => !channels.some((c) => c.title === t));
  console.error(`SEED_MISSING ${missing.join(", ")}`);
  process.exit(1);
}

async function probe(channel) {
  try {
    const res = await fetch(channel.url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    const entries = (text.match(/<entry>/g) || []).length;
    if (res.ok && entries >= 1) return { ok: true, via: "atom", entries };
  } catch {
    /* Atom falhou — tenta HTML */
  }
  if (!channel.channelId) return { ok: false, via: "none", entries: 0 };
  const pageUrl = `https://www.youtube.com/channel/${channel.channelId}/videos`;
  const res = await fetch(pageUrl, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(25000),
  });
  const html = await res.text();
  const videos = extractChannelVideosFromHtml(html) || [];
  return { ok: res.ok && videos.length >= 1, via: "html", entries: videos.length };
}

const failures = [];
for (const channel of channels) {
  try {
    const result = await probe(channel);
    if (!result.ok) {
      failures.push(`${channel.title} via=${result.via} entries=${result.entries}`);
      console.error(`FAIL\t${channel.title}\t${result.via}\t${result.entries}`);
    } else {
      console.log(`OK\t${channel.title}\t${result.via}\t${result.entries}`);
    }
  } catch (error) {
    failures.push(`${channel.title} ${error.message || error}`);
    console.error(`ERR\t${channel.title}\t${error.message || error}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`FEEDS_OK ${channels.length}/${WATCH_TITLES.size}`);
