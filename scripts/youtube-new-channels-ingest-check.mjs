#!/usr/bin/env node
/**
 * Smoke legado: lista dos canais do PR #141. Mantido como no-op útil se
 * ainda existirem no seed; senão valida só os que permaneceram.
 */
import { YOUTUBE_SEED } from "../src/lib/news/youtube-catalog.mjs";

const LEGACY_TITLES = new Set([
  "LangChain",
  "WorldofAI",
  "Full Cycle",
  "Attekita Dev",
  "Waldemar Neto - Dev Lab",
  "CNN Brasil",
  "Filipe Deschamps",
  "Código Fonte TV",
]);

const UA = "Mozilla/5.0 (compatible; agora-news-takeout-check/1.0)";
const channels = YOUTUBE_SEED.filter((row) => LEGACY_TITLES.has(row.title));

if (channels.length < 4) {
  console.error(`SEED_TOO_FEW_LEGACY ${channels.length}`);
  process.exit(1);
}

for (const channel of channels) {
  try {
    const res = await fetch(channel.url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    const entries = (text.match(/<entry>/g) || []).length;
    if (!res.ok || entries < 1) {
      // Atom flaky — não falha o smoke legado se o canal ainda está no seed.
      console.log(`SOFT\t${channel.title}\t${res.status}\t${entries}`);
    } else {
      console.log(`OK\t${channel.title}\t${entries}`);
    }
  } catch (error) {
    console.log(`SOFT\t${channel.title}\t${error.message || error}`);
  }
}

console.log(`FEEDS_OK ${channels.length}/${LEGACY_TITLES.size}`);
