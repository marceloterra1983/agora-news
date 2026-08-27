import assert from "node:assert/strict";
import test from "node:test";
import { RSS_SEED, rssExtrasFor } from "../src/lib/news/rss-catalog.mjs";
import { rssAccountId } from "../src/lib/news/rss-id.mjs";
import { isReservedGroup } from "../src/lib/news/catalog-taxonomy.mjs";

const REQUIRED = [
  { url: "https://openai.com/news/rss.xml", title: "OpenAI", section: "ai", group: "labs" },
  { url: "https://huggingface.co/blog/feed.xml", title: "Hugging Face", section: "ai", group: "labs" },
  { url: "https://deepmind.google/blog/rss.xml", title: "Google DeepMind", section: "ai", group: "labs" },
  {
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/",
    title: "MIT Technology Review AI",
    section: "ai",
    group: "imprensa",
  },
  { url: "https://importai.substack.com/feed", title: "Import AI", section: "ai", group: "imprensa" },
  { url: "https://simonwillison.net/atom/everything/", title: "Simon Willison", section: "ai", group: "builders" },
  { url: "https://www.theverge.com/rss/index.xml", title: "The Verge", section: "tech", group: "tech-imprensa" },
  { url: "https://feeds.arstechnica.com/arstechnica/index", title: "Ars Technica", section: "tech", group: "tech-imprensa" },
  { url: "https://techcrunch.com/feed/", title: "TechCrunch", section: "tech", group: "tech-imprensa" },
  { url: "https://www.wired.com/feed/rss", title: "WIRED", section: "tech", group: "tech-imprensa" },
  { url: "https://krebsonsecurity.com/feed/", title: "KrebsOnSecurity", section: "tech", group: "tech-seguranca" },
  { url: "https://github.blog/feed/", title: "GitHub Blog", section: "tech", group: "tech-devs" },
  { url: "https://rss.tecmundo.com.br/feed", title: "TecMundo", section: "brasil", group: "br-jornais" },
  { url: "https://g1.globo.com/rss/g1/", title: "g1", section: "brasil", group: "br-jornais" },
  {
    url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml",
    title: "Folha",
    section: "brasil",
    group: "br-jornais",
  },
  { url: "https://feeds.bbci.co.uk/portuguese/rss.xml", title: "BBC News Brasil", section: "brasil", group: "br-jornais" },
  { url: "https://www.poder360.com.br/feed/", title: "Poder360", section: "brasil", group: "br-politica" },
  {
    url: "https://feeds.folha.uol.com.br/mercado/rss091.xml",
    title: "Folha Mercado",
    section: "brasil",
    group: "br-economia",
  },
  { url: "https://canaltech.com.br/rss/", title: "Canaltech", section: "brasil", group: "br-jornais" },
];

test("RSS_SEED has the 19 editorial feeds with stable ids", () => {
  assert.equal(RSS_SEED.length, 19);
  const urls = new Set();
  const accounts = new Set();
  for (const row of RSS_SEED) {
    assert.ok(row.url.startsWith("https://"), row.url);
    assert.equal(row.account, rssAccountId(row.url), row.title);
    assert.ok(isReservedGroup(row.group), `${row.title} ${row.group}`);
    assert.ok(!urls.has(row.url), row.url);
    assert.ok(!accounts.has(row.account), row.account);
    urls.add(row.url);
    accounts.add(row.account);
  }
});

test("incluir list is present with section and group", () => {
  for (const want of REQUIRED) {
    const hit = RSS_SEED.find((row) => row.url === want.url);
    assert.ok(hit, want.url);
    assert.equal(hit.title, want.title);
    assert.equal(hit.section, want.section);
    assert.equal(hit.group, want.group);
  }
});

test("rssExtrasFor exposes seed handles per section", () => {
  assert.equal(rssExtrasFor("ai").length, 6);
  assert.equal(rssExtrasFor("tech").length, 6);
  assert.equal(rssExtrasFor("brasil").length, 7);
  assert.ok(rssExtrasFor("ai").some((row) => row.name === "Google DeepMind" && row.group === "labs"));
  assert.ok(rssExtrasFor("tech").some((row) => row.name === "KrebsOnSecurity" && row.group === "tech-seguranca"));
  assert.ok(rssExtrasFor("brasil").some((row) => row.name === "Poder360" && row.group === "br-politica"));
});
