import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  decodeRssBody,
  parseFeedXml,
  textHasReplacement,
} from "../src/lib/news/rss-parse.mjs";
import { rssIdsToSkip } from "../src/lib/news/rss-ingest-core.mjs";
import { rssPostId } from "../src/lib/news/rss-id.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

function latin1Rss() {
  return [
    `<?xml version="1.0" encoding="ISO-8859-1"?>`,
    `<rss version="2.0"><channel>`,
    `<title>UOL Economia</title>`,
    `<item>`,
    `<title><![CDATA[CMN eleva em R$ 3 bilhões limite de empréstimos]]></title>`,
    `<link>https://economia.uol.com.br/cmn</link>`,
    `<guid>https://economia.uol.com.br/cmn</guid>`,
    `<description><![CDATA[O CMN (Conselho Monetário Nacional) elevou em R$ 3 bilhões o limite para estados, Distrito Federal e municípios tomarem empréstimos.]]></description>`,
    `<pubDate>Thu, 27 Aug 2026 19:56:13 -0300</pubDate>`,
    `</item></channel></rss>`,
  ].join("");
}

function latin1Bytes() {
  return Buffer.from(latin1Rss(), "latin1");
}

test("ISO-8859-1 header keeps bilhões and Monetário, not U+FFFD", () => {
  const xml = decodeRssBody(latin1Bytes(), "text/xml;charset=ISO-8859-1");
  assert.match(xml, /bilhões/);
  assert.match(xml, /Monetário/);
  assert.match(xml, /municípios/);
  assert.equal(xml.includes("\uFFFD"), false);
  const items = parseFeedXml(xml, "https://rss.uol.com.br/feed/economia.xml");
  assert.equal(items.length, 1);
  assert.match(items[0].summary, /Conselho Monetário Nacional/);
  assert.equal(textHasReplacement(items[0].summary), false);
});

test("xml encoding declaration is enough when Content-Type has no charset", () => {
  const xml = decodeRssBody(latin1Bytes(), "text/xml");
  assert.match(xml, /empréstimos/);
  assert.equal(xml.includes("\uFFFD"), false);
});

test("valid UTF-8 is not reinterpreted as Latin-1", () => {
  const utf8 = Buffer.from(latin1Rss(), "utf8");
  const xml = decodeRssBody(utf8, "application/xml; charset=UTF-8");
  assert.match(xml, /bilhões/);
  assert.equal(xml.includes("\uFFFD"), false);
});

test("UTF-8 mis-decode of the same bytes is the production bug", () => {
  const broken = latin1Bytes().toString("utf8");
  assert.equal(broken.includes("\uFFFD"), true);
  assert.equal(broken.includes("bilhões"), false);
  assert.equal(textHasReplacement(broken), true);
});

test("known poisoned ids are rewritten; clean known ids stay skipped", () => {
  const id = rssPostId("https://economia.uol.com.br/cmn");
  const extra = rssPostId("https://economia.uol.com.br/old");
  const stale = rssPostId("https://economia.uol.com.br/stale");
  const skip = rssIdsToSkip([id, extra, stale], {
    known: new Set([id, extra]),
    poisoned: new Set([id]),
    latest: new Set([id]),
  });
  assert.equal(skip.has(id), false);
  assert.equal(skip.has(extra), true);
  assert.equal(skip.has(stale), true);
});

test("ingest and resolve decode the body bytes, not res.text()", () => {
  const ingest = read("src/lib/news/rss-ingest.ts");
  const resolve = read("src/lib/news/rss-resolve.ts");
  const core = read("src/lib/news/rss-ingest-core.mjs");
  assert.match(ingest, /decodeRssBody/);
  assert.match(ingest, /arrayBuffer/);
  assert.match(ingest, /rssIdsToSkip/);
  assert.match(ingest, /idsWithReplacement/);
  assert.match(resolve, /decodeRssBody/);
  assert.match(resolve, /arrayBuffer/);
  assert.doesNotMatch(ingest, /await res\.text\(\)/);
  assert.doesNotMatch(resolve, /await res\.text\(\)/);
  assert.match(core, /export function rssIdsToSkip/);
});
