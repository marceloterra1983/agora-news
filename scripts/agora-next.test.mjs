import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { packMediaLabel, unpackMediaLabel } from "../src/lib/news/story-media-meta.mjs";
import { rotateFrom } from "../src/lib/news/ingest-scan-core.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");
const lines = (rel) => read(rel).split("\n").length;

test("pack/unpack media_label keeps quote and video on the second line", () => {
  const packed = packMediaLabel("Citação", {
    quoted: { id: "1", handle: "ylecun", kind: "quote" },
    assets: [{ type: "video", url: "https://x.com/v.mp4" }],
  });
  assert.match(packed, /^Citação\n/);
  const { label, meta } = unpackMediaLabel(packed);
  assert.equal(label, "Citação");
  assert.equal(meta.quoted.handle, "ylecun");
  assert.equal(meta.assets[0].type, "video");
  assert.deepEqual(unpackMediaLabel("Foto"), { label: "Foto", meta: null });
});

test("first open persists the hydrated PT body", () => {
  const news = read("src/lib/news/server-news.ts");
  assert.match(news, /persistHydratedBody/);
  assert.match(news, /hydrated\.body !== \(base\.body/);
  const persist = read("src/lib/news/story-persist.ts");
  assert.match(persist, /translation_pt: text/);
  assert.match(persist, /pickStoredPt/);
  assert.match(persist, /packMediaLabel/);
  assert.match(persist, /written\.ok/);
});

test("scan cursor rotates the catalog and newest covers every section", () => {
  const { start, rotated } = rotateFrom(["a", "b", "c", "d"], 2);
  assert.equal(start, 2);
  assert.deepEqual(rotated, ["c", "d", "a", "b"]);
  const scan = read("src/lib/news/ingest-scan.ts");
  assert.match(scan, /CACHE_KEYS\.scanCursor/);
  assert.match(scan, /listKnownSections\(\)/);
  assert.match(read("src/lib/news/ingest.ts"), /handlesToScan/);
  assert.match(read("src/lib/news/ingest.ts"), /latestByAccount/);
});

test("list select includes translation_pt so search sees the body", () => {
  const src = read("src/lib/news/supabase.ts");
  assert.match(src, /LIST_SELECT[\s\S]*translation_pt/);
  assert.match(src, /body = \(p\.translation_pt \|\| p\.content/);
  assert.match(read("src/lib/news/feed.ts"), /s\.body\.toLowerCase\(\)\.includes\(needle\)/);
});

test("fontes catalog filter uses matchProfiles", () => {
  const sort = read("src/lib/news/fontes-sort.ts");
  assert.match(sort, /export function filterFontesRows/);
  assert.match(sort, /matchProfiles/);
  const page = read("src/routes/fontes.tsx");
  assert.match(page, /filterFontesRows/);
  assert.match(page, /Filtrar no catálogo/);
});

test("cloud extras [] clears the device list and pull applies theme", () => {
  const sync = read("src/lib/news/prefs-sync.ts");
  assert.match(sync, /Array\.isArray\(prefs\.extras\)/);
  assert.match(sync, /replaceExtraFontes/);
  assert.match(sync, /applyTheme/);
  assert.match(sync, /applySettings/);
  assert.match(sync, /agora-theme/);
  assert.match(read("src/lib/news/extra-fontes.ts"), /export function replaceExtraFontes/);
});

test("authenticated GET /api/push returns saved and handles without the table", () => {
  const route = read("src/routes/api/push.ts");
  assert.match(route, /getPushForUser/);
  assert.match(route, /saved: mine\.saved/);
  assert.match(route, /handles: mine\.handles/);
  assert.doesNotMatch(route, /listPushSubs|listPushTable/);
  const server = read("src/lib/news/push-server.ts");
  const start = server.indexOf("export async function getPushForUser");
  const end = server.indexOf("export async function savePushSub");
  const mine = server.slice(start, end);
  assert.match(mine, /user_id=eq\./);
  assert.match(mine, /select=handles/);
  assert.doesNotMatch(mine, /endpoint/);
});

test("login shows signed-in state and settings copy mentions the cloud", () => {
  const login = read("src/routes/login.tsx");
  assert.match(login, /useCurrentUserState/);
  assert.match(login, /SignedInPanel|Você já entrou/);
  assert.match(login, /signOut/);
  const settings = read("src/routes/configuracoes.tsx");
  assert.match(settings, /sobem para a nuvem/);
  assert.match(settings, /sino ligado em Fontes/);
  assert.match(settings, /from "@\/components\/news\/settings-ui"/);
  assert.doesNotMatch(settings, /Vale só neste aparelho/);
});

test("ingest logs scanned/gtxFail/written and retries 429", () => {
  const ingest = read("src/lib/news/ingest.ts");
  assert.match(ingest, /gtxFail/);
  assert.match(ingest, /logTiming\("ingest"/);
  assert.match(ingest, /written\.count/);
  assert.match(read("src/lib/news/translate-pt.mjs"), /status === 429/);
  assert.ok(lines("src/lib/news/ingest.ts") <= 320, `ingest.ts is ${lines("src/lib/news/ingest.ts")}`);
  assert.ok(lines("src/lib/news/influence.ts") <= 300, `influence.ts is ${lines("src/lib/news/influence.ts")}`);
});

test("influence dropped dead following/tweets/score fields", () => {
  const src = read("src/lib/news/influence.ts");
  assert.doesNotMatch(src, /following: number/);
  assert.doesNotMatch(src, /tweets: number/);
  assert.doesNotMatch(src, /score: number/);
  assert.match(src, /from "\.\/fontes-last"/);
  assert.match(src, /fromFeed\.id === last\.id/);
});

test("next/later extracted modules stay under line budgets", () => {
  assert.ok(lines("src/routes/fontes.tsx") <= 300, `fontes.tsx is ${lines("src/routes/fontes.tsx")}`);
  assert.ok(lines("src/routes/configuracoes.tsx") <= 300, `configuracoes.tsx is ${lines("src/routes/configuracoes.tsx")}`);
  assert.ok(lines("src/routes/login.tsx") <= 300, `login.tsx is ${lines("src/routes/login.tsx")}`);
  for (const rel of [
    "src/components/news/settings-ui.tsx",
    "src/lib/news/fontes-last.ts",
    "src/lib/news/ingest-scan.ts",
    "src/lib/news/ingest-scan-core.mjs",
    "src/lib/news/ingest-fetch.ts",
    "src/lib/news/story-persist.ts",
    "src/lib/news/story-media-meta.mjs",
    "src/lib/news/fontes-sort.ts",
    "src/lib/news/server-news.ts",
    "src/lib/news/groups.ts",
  ]) {
    assert.ok(lines(rel) <= 200, `${rel} is ${lines(rel)}`);
  }
});
