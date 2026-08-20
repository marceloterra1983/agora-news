import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { mergeCloudPrefs } from "../src/lib/news/prefs-merge.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const NEWER = "2026-08-20T15:00:00.000Z";
const OLDER = "2026-08-20T12:00:00.000Z";

function withStorage(t) {
  const values = new Map();
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, String(value));
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
  const prev = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage, dispatchEvent() {} },
  });
  t.after(() => {
    if (prev) Object.defineProperty(globalThis, "window", prev);
    else delete globalThis.window;
  });
  return values;
}

async function loadFontes(t) {
  withStorage(t);
  const { createServer } = await import("vite");
  const server = await createServer({
    configFile: false,
    logLevel: "silent",
    resolve: { alias: { "@": join(root, "src") } },
    server: { middlewareMode: true },
  });
  t.after(() => server.close());
  return server.ssrLoadModule(`/src/lib/news/fontes-prefs.ts?account=${Date.now()}`);
}

test("newer cloud snapshot replaces local star disabled notify even if dirty", () => {
  const next = mergeCloudPrefs(
    {
      starred: ["remote-star"],
      disabled: ["remote-off"],
      notify: ["remote-bell"],
      groups: { remote: "ia" },
      fontesRev: { starred: NEWER, disabled: NEWER, notify: NEWER, groups: NEWER },
      updatedAt: NEWER,
    },
    {
      starred: ["local-star"],
      disabled: ["local-off"],
      notify: ["local-bell"],
      groups: { local: "ia" },
      fontesRev: { starred: OLDER, disabled: OLDER, notify: OLDER, groups: OLDER },
    },
    true,
  );
  assert.deepEqual(next.starred, ["remote-star"]);
  assert.deepEqual(next.disabled, ["remote-off"]);
  assert.deepEqual(next.notify, ["remote-bell"]);
  assert.deepEqual(next.groups, { remote: "ia" });
});

test("older cloud snapshot does not wipe dirty local star disabled notify", () => {
  const next = mergeCloudPrefs(
    {
      starred: [],
      disabled: [],
      notify: [],
      groups: {},
      fontesRev: { starred: OLDER, disabled: OLDER, notify: OLDER, groups: OLDER },
      updatedAt: OLDER,
    },
    {
      starred: ["theo"],
      disabled: ["theo"],
      notify: ["theo"],
      groups: { theo: "ia" },
      fontesRev: { starred: NEWER, disabled: NEWER, notify: NEWER, groups: NEWER },
    },
    true,
  );
  assert.deepEqual(next.starred, ["theo"]);
  assert.deepEqual(next.disabled, ["theo"]);
  assert.deepEqual(next.notify, ["theo"]);
  assert.deepEqual(next.groups, { theo: "ia" });
});

test("stale clean pull keeps local lists with a newer field rev", () => {
  const next = mergeCloudPrefs(
    { disabled: [], starred: [], notify: [], updatedAt: OLDER },
    {
      disabled: ["theo"],
      starred: ["theo"],
      notify: ["theo"],
      fontesRev: { disabled: NEWER, starred: NEWER, notify: NEWER },
    },
    false,
  );
  assert.deepEqual(next.disabled, ["theo"]);
  assert.deepEqual(next.starred, ["theo"]);
  assert.deepEqual(next.notify, ["theo"]);
});

test("per-field LWW keeps a newer local pause and a newer remote star", () => {
  const next = mergeCloudPrefs(
    {
      starred: ["remote"],
      disabled: [],
      fontesRev: { starred: NEWER, disabled: OLDER },
    },
    {
      starred: [],
      disabled: ["theo"],
      fontesRev: { starred: OLDER, disabled: NEWER },
    },
    true,
  );
  assert.deepEqual(next.starred, ["remote"]);
  assert.deepEqual(next.disabled, ["theo"]);
});

test("toggle dirties prefs, bumps field rev, and the sync hook pushes", async (t) => {
  const fontes = await loadFontes(t);
  assert.equal(fontes.toggleDisabled("theo"), true);
  assert.equal(fontes.toggleStar("karpathy"), true);
  assert.equal(fontes.isFontesPrefsDirty(), true);
  const rev = fontes.getFontesRev();
  assert.ok(Date.parse(rev.disabled) > 0);
  assert.ok(Date.parse(rev.starred) > 0);

  const hook = read("src/components/news/prefs-sync.tsx");
  assert.match(hook, /agora-fontes-prefs/);
  assert.match(hook, /pushCloudPrefs/);
  assert.match(hook, /fromRemote/);
  assert.match(hook, /isFontesPrefsDirty/);
  const sync = read("src/lib/news/prefs-sync.ts");
  assert.match(sync, /snapshotPrefs\(\)/);
  assert.match(sync, /savePrefs/);
  assert.match(sync, /fontesRev/);
  assert.match(sync, /fromRemote:\s*true/);
});

test("CloudPrefs type snapshot and store persist star disabled notify", () => {
  const server = read("src/lib/news/prefs-server.ts");
  assert.match(server, /starred\?:/);
  assert.match(server, /disabled\?:/);
  assert.match(server, /notify\?:/);
  assert.match(server, /fontesRev\?:/);

  const sync = read("src/lib/news/prefs-sync.ts");
  assert.match(sync, /starred:\s*getStarred/);
  assert.match(sync, /disabled:\s*getDisabled/);
  assert.match(sync, /notify:\s*getNotifyHandles/);
  assert.match(sync, /fontesRev:/);
  assert.match(sync, /agora-fontes-starred-v1/);
  assert.match(sync, /agora-fontes-disabled-v1/);
  assert.match(sync, /agora-fontes-notify-v1/);

  const store = read("src/lib/news/prefs-store.server.ts");
  assert.match(store, /select=prefs,updated_at/);
  assert.match(store, /updatedAt/);
  assert.match(store, /fontesRev/);
  assert.doesNotMatch(store, /delete (next|prefs|rest)\.(starred|disabled|notify)/);
});
