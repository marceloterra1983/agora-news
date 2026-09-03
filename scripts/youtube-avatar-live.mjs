#!/usr/bin/env node
/** Live HTTP check: todos os avatares do YOUTUBE_SEED devem responder 200 + image. */
import { YOUTUBE_SEED } from "../src/lib/news/youtube-catalog.mjs";

const UA = "Mozilla/5.0 (compatible; agora-news-avatar-live/1.0)";

async function probe(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": UA, Referer: "" },
    signal: AbortSignal.timeout(15000),
  });
  const buf = await res.arrayBuffer();
  const ct = res.headers.get("content-type") || "";
  return {
    status: res.status,
    bytes: buf.byteLength,
    ok: res.ok && buf.byteLength > 500 && ct.startsWith("image/"),
    ct,
  };
}

const failures = [];
for (const channel of YOUTUBE_SEED) {
  try {
    const result = await probe(channel.avatar);
    if (!result.ok) {
      failures.push(`${channel.title} HTTP ${result.status} ${result.ct} ${result.bytes}b`);
      console.error(`FAIL\t${channel.title}\t${result.status}\t${result.bytes}`);
    } else {
      console.log(`OK\t${channel.title}\t${result.status}\t${result.bytes}`);
    }
  } catch (error) {
    failures.push(`${channel.title} ${error.message || error}`);
    console.error(`ERR\t${channel.title}\t${error.message || error}`);
  }
}

const total = YOUTUBE_SEED.length;
const ok = total - failures.length;
console.log(`OK ${ok}/${total}`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
