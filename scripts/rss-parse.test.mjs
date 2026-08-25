import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { rssAccountId, rssPostId } from "../src/lib/news/rss-id.mjs";
import { parseFeedXml } from "../src/lib/news/rss-parse.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = (name) => readFileSync(join(root, "scripts/fixtures/rss", name), "utf8");

test("parses rss2 and atom and ignores garbage", () => {
  const rss = parseFeedXml(fixture("rss2.xml"), "https://example.com/rss.xml");
  assert.equal(rss.length, 2);
  assert.equal(rss[0].title, "Primeiro item");
  assert.equal(rss[0].link, "https://example.com/one");
  const atom = parseFeedXml(fixture("atom.xml"), "https://example.com/atom.xml");
  assert.equal(atom.length, 2);
  assert.equal(atom[0].link, "https://example.com/atom-one");
  assert.deepEqual(parseFeedXml(fixture("garbage.xml"), "https://x"), []);
  assert.deepEqual(parseFeedXml(fixture("empty.xml"), "https://x"), []);
});

test("ids are stable and fit the X handle filter", () => {
  const a = rssAccountId("https://www.theverge.com/rss/index.xml");
  const b = rssAccountId("https://theverge.com/rss/index.xml");
  assert.equal(a, b);
  assert.match(a, /^r_[a-f0-9]{12}$/);
  assert.equal(a.length, 14);
  assert.equal(rssPostId("https://example.com/one"), rssPostId("https://example.com/one"));
  assert.match(rssPostId("https://example.com/one"), /^rss_[a-f0-9]{24}$/);
});
