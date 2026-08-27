import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  mergeRssFontes,
  rssAvatarUrl,
  rssBlurb,
  rssExtrasFor,
  rssFonteRow,
  rssSiteHref,
} from "../src/lib/news/rss-catalog.mjs";
import { lastPostHref } from "../src/lib/news/last-post-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("rssAvatarUrl and rssBlurb use the site host", () => {
  const url = "https://openai.com/news/rss.xml";
  assert.match(rssAvatarUrl(url), /openai\.com/);
  assert.match(rssBlurb(url, "OpenAI"), /openai\.com/);
  assert.equal(rssSiteHref("r_bea4293d5edd"), "https://openai.com");
});

test("rssFonteRow fills avatar, group and blurb for a seed site", () => {
  const openai = rssExtrasFor("ai").map(rssFonteRow).find((row) => row.handle === "r_bea4293d5edd");
  assert.ok(openai, "OpenAI seed missing");
  assert.equal(openai.name, "OpenAI");
  assert.equal(openai.group, "labs");
  assert.ok(openai.avatar);
  assert.match(openai.bio || "", /openai\.com/);
  assert.equal(rssExtrasFor("ai").length, 6);
  assert.match(read("src/lib/news/fontes-sort.ts"), /rssFonteRow|rssExtrasFor/);
});

test("mergeRssFontes adds owned feeds without duplicating the seed", () => {
  const base = rssExtrasFor("brasil").map(rssFonteRow);
  const owned = [
    {
      url: "https://example.com/feed.xml",
      title: "Meu site",
      section: "brasil",
      group: "novos",
      account: "r_aaaaaaaaaaaa",
    },
  ];
  const merged = mergeRssFontes(base, owned, "brasil");
  assert.equal(merged.filter((row) => row.handle === "r_9c68d283ae03").length, 1);
  const extra = merged.find((row) => row.handle === "r_aaaaaaaaaaaa");
  assert.ok(extra);
  assert.equal(extra.name, "Meu site");
  assert.ok(extra.avatar);
});

test("lastPostHref for r_* stays in-app", () => {
  assert.equal(lastPostHref("r_9c68d283ae03", "rss_deadbeef", false), "/materia/rss_deadbeef");
  assert.equal(lastPostHref("r_9c68d283ae03", "rss_deadbeef", true), "/materia/rss_deadbeef");
  assert.equal(lastPostHref("r_9c68d283ae03", "", false), "");
});

test("Fontes mixes RSS into the main list", () => {
  const fontes = read("src/routes/fontes.tsx");
  const sites = read("src/components/news/fontes-sites.tsx");
  const influence = read("src/lib/news/influence.ts");
  const card = read("src/components/news/fonte-profile-card.tsx");
  assert.match(fontes, /mergeRssFontes/);
  assert.match(fontes, /seedFontes/);
  assert.match(influence, /rssExtrasFor|rssFonteRow/);
  assert.match(card, /data-fonte-action=["']rss["']/);
  assert.doesNotMatch(sites, /seed\.map/);
});
