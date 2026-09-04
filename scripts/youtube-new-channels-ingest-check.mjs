#!/usr/bin/env node
/**
 * Smoke: feeds Atom dos canais adicionados via Takeout respondem com entries.
 * Lista canônica dos channelIds novos (não presentes no seed baseline de 26).
 */
import { YOUTUBE_SEED } from "../src/lib/news/youtube-catalog.mjs";

const NEW_TITLES = new Set([
  "LangChain",
  "WorldofAI",
  "Cole Medin",
  "AI Jason",
  "AI Engineer Brasil",
  "Databricks",
  "VirtualizationHowto",
  "Adrenaline",
  "Alura",
  "Rocketseat",
  "Full Cycle",
  "Mayk Brito",
  "Goularte",
  "Otávio Miranda",
  "Attekita Dev",
  "Waldemar Neto - Dev Lab",
  "CNN Brasil",
  "CNN Brasil Money",
  "SpaceToday",
  "Roda Viva",
  "Marcelo Gleiser",
  "Galeria do Meteorito",
  "Ministério da Fazenda",
  "Asimov Academy",
]);

const UA = "Mozilla/5.0 (compatible; agora-news-takeout-check/1.0)";
const channels = YOUTUBE_SEED.filter((row) => NEW_TITLES.has(row.title));

if (channels.length !== NEW_TITLES.size) {
  const missing = [...NEW_TITLES].filter((t) => !channels.some((c) => c.title === t));
  console.error(`SEED_MISSING ${missing.join(", ")}`);
  process.exit(1);
}

const failures = [];
for (const channel of channels) {
  try {
    const res = await fetch(channel.url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    const entries = (text.match(/<entry>/g) || []).length;
    if (!res.ok || entries < 1) {
      failures.push(`${channel.title} HTTP ${res.status} entries=${entries}`);
      console.error(`FAIL\t${channel.title}\t${res.status}\t${entries}`);
    } else {
      console.log(`OK\t${channel.title}\t${entries}`);
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
console.log(`FEEDS_OK ${channels.length}/${NEW_TITLES.size}`);
