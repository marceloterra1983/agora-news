import assert from "node:assert/strict";
import test from "node:test";
import {
  YOUTUBE_SEED,
  mergeYouTubeFontes,
  youtubeExtrasFor,
  youtubeFonteRow,
  youtubeLabelFor,
} from "../src/lib/news/youtube-catalog.mjs";
import { CHANNEL_ID_RE } from "../src/lib/news/youtube-core.mjs";
import { isYouTubeAccount } from "../src/lib/news/rss-id.mjs";

test("seed catalog has curated channels for ai, tech and brasil with valid attributes", () => {
  assert.ok(YOUTUBE_SEED.length >= 20, "Deve ter pelo menos 20 canais curados");
  const sections = new Set(YOUTUBE_SEED.map((c) => c.section));
  assert.ok(sections.has("ai"));
  assert.ok(sections.has("tech"));
  assert.ok(sections.has("brasil"));

  for (const c of YOUTUBE_SEED) {
    assert.match(c.channelId, CHANNEL_ID_RE, `Channel ID inválido: ${c.channelId}`);
    assert.match(c.account, /^y_[a-f0-9]{12}$/, `Account inválida: ${c.account}`);
    assert.equal(isYouTubeAccount(c.account), true);
    assert.ok(c.title.length > 0, "Título deve existir");
    assert.ok(c.url.startsWith("https://www.youtube.com/feeds/videos.xml?channel_id=UC"), "URL de feed inválida");
    assert.ok(c.group.length > 0, "Grupo deve existir");
    assert.ok(c.blurb.length > 0, "Blurb editorial deve existir");
  }

  assert.equal(youtubeLabelFor("y_bdebf4a1823d"), "OpenAI");
});

test("mergeYouTubeFontes integrates YouTube channels as InfluenceRows without duplicates", () => {
  const row = youtubeFonteRow({
    account: "y_bdebf4a1823d",
    title: "OpenAI",
    group: "labs",
    channelId: "UCXZCJLdBC09xxGZ6gcdrc6A",
    blurb: "Conta oficial da OpenAI",
  });
  assert.equal(row.handle, "y_bdebf4a1823d");
  assert.equal(row.name, "OpenAI");
  assert.equal(row.group, "labs");

  const baseX = [{ handle: "openai", name: "OpenAI X", group: "labs" }];
  const mergedAi = mergeYouTubeFontes(baseX, "ai");
  assert.ok(mergedAi.length > baseX.length);

  const ytOpenAi = mergedAi.find((r) => r.handle === "y_bdebf4a1823d");
  assert.ok(ytOpenAi, "Canal OpenAI deve estar presente");
  assert.equal(ytOpenAi.name, "OpenAI");
  assert.equal(ytOpenAi.group, "labs");
  assert.match(ytOpenAi.bio, /OpenAI/);
  assert.match(ytOpenAi.siteUrl, /https:\/\/www\.youtube\.com\/channel\/UC/);
  assert.match(ytOpenAi.avatar, /google\.com\/s2\/favicons/);

  // Sem duplicação
  const twice = mergeYouTubeFontes(mergedAi, "ai");
  assert.equal(twice.length, mergedAi.length);
});

test("youtubeExtrasFor returns section-scoped channels", () => {
  const aiExtras = youtubeExtrasFor("ai");
  assert.ok(aiExtras.every((e) => e.section === "ai"));
  assert.ok(aiExtras.some((e) => e.name === "Google DeepMind"));

  const techExtras = youtubeExtrasFor("tech");
  assert.ok(techExtras.every((e) => e.section === "tech"));
  assert.ok(techExtras.some((e) => e.name === "Fireship"));

  const brExtras = youtubeExtrasFor("brasil");
  assert.ok(brExtras.every((e) => e.section === "brasil"));
  assert.ok(brExtras.some((e) => e.name === "Manual do Mundo"));
});
