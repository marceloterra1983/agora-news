import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { groupOrderFor } from "../src/lib/news/catalog-taxonomy.mjs";
import { catalogFor } from "../src/lib/news/section-catalog.mjs";
import {
  YOUTUBE_SEED,
  youtubeExtrasFor,
  youtubeGroupOf,
} from "../src/lib/news/youtube-catalog.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

test("youtubeGroupOf returns the seed group, not Outros", () => {
  assert.equal(youtubeGroupOf("y_7bf15e60ce27"), "agentes"); // Maestros da IA
  assert.equal(youtubeGroupOf("y_c2559941c3af"), "modelos"); // QuantBrasil
  assert.equal(youtubeGroupOf("y_f01f6dfb789c"), "tech-devs"); // Waldemar Neto
  assert.equal(youtubeGroupOf("y_dea25cfeb371"), "commodities"); // PrimosAgro
  assert.equal(youtubeGroupOf("y_aa92dc0a0287"), "br-analise"); // Deltan
  assert.equal(youtubeGroupOf("y_deadbeefdead"), "");
});

test("groupOf consults youtubeGroupOf before falling back to novos", () => {
  const prefs = read("src/lib/news/fontes-prefs.ts");
  assert.match(prefs, /youtubeGroupOf/);
  assert.match(prefs, /rssGroupOf\(handle, loadRssFeeds\(\)\)/);
  const tag = read("src/components/news/group-tag.tsx");
  assert.match(tag, /groupOf\(handle\)/);
});

test("every YouTube seed group belongs to its section taxonomy", () => {
  for (const row of YOUTUBE_SEED) {
    const allowed = groupOrderFor(row.section);
    assert.ok(
      allowed.includes(row.group),
      `${row.title} group=${row.group} is not in ${row.section} taxonomy`,
    );
  }
});

test("catalogFor remaps a YouTube group that does not exist in the section to novos", () => {
  const catalog = catalogFor("brasil", {
    extras: [
      {
        handle: "y_aaaaaaaaaaaa",
        name: "Ghost",
        section: "brasil",
        group: "tech-devs",
      },
    ],
  });
  assert.equal(catalog.members.find((m) => m.handle === "y_aaaaaaaaaaaa")?.group, "novos");
  assert.deepEqual(catalog.handles, ["y_aaaaaaaaaaaa"]);
  assert.equal(catalog.groupIds.includes("tech-devs"), false);
});

test("brasil YouTube extras land on Brasil groups", () => {
  const extras = youtubeExtrasFor("brasil");
  const allowed = new Set(groupOrderFor("brasil"));
  assert.ok(extras.some((row) => row.handle === "y_aa92dc0a0287" && row.group === "br-analise"));
  assert.ok(extras.every((row) => row.section === "brasil"));
  for (const row of extras) {
    assert.ok(allowed.has(row.group), `${row.name} → ${row.group}`);
  }
});

test("podcasts and mercados YouTube extras land on their taxonomies", () => {
  const pods = youtubeExtrasFor("podcasts");
  const merc = youtubeExtrasFor("mercados");
  assert.ok(pods.length >= 4);
  assert.ok(merc.length >= 2);
  assert.ok(pods.some((row) => row.name === "Flow Podcast" && row.group === "entrevistas"));
  assert.ok(merc.some((row) => row.handle === "y_dea25cfeb371" && row.group === "commodities"));
  for (const row of pods) {
    assert.ok(groupOrderFor("podcasts").includes(row.group), row.name);
  }
  for (const row of merc) {
    assert.ok(groupOrderFor("mercados").includes(row.group), row.name);
  }
});
