import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { mergeCloudPrefs } from "../src/lib/news/prefs-merge.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

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
  return server.ssrLoadModule(`/src/lib/news/fontes-prefs.ts?dirty=${Date.now()}`);
}

test("stale cloud pull keeps a disabled handle written locally after the snapshot", () => {
  const next = mergeCloudPrefs({ disabled: [] }, { disabled: ["theo"] }, true);
  assert.deepEqual(next.disabled, ["theo"]);
});

test("clean pull still takes the remote disabled list", () => {
  const next = mergeCloudPrefs({ disabled: ["remote"] }, { disabled: [] }, false);
  assert.deepEqual(next.disabled, ["remote"]);
});

test("dirty local un-pause wins over a stale remote disabled list", () => {
  const next = mergeCloudPrefs({ disabled: ["theo"] }, { disabled: [] }, true);
  assert.deepEqual(next.disabled, []);
});

test("toggleDisabled dirties prefs so a later empty snapshot cannot wipe it", async (t) => {
  const fontes = await loadFontes(t);
  assert.equal(fontes.toggleDisabled("theo"), true);
  assert.equal(fontes.isFontesPrefsDirty(), true);
  assert.deepEqual(fontes.getDisabled(), ["theo"]);
  const next = mergeCloudPrefs(
    { disabled: [] },
    { disabled: fontes.getDisabled() },
    fontes.isFontesPrefsDirty(),
  );
  assert.deepEqual(next.disabled, ["theo"]);
});

test("two toggles in the same tick leave a consistent last-write list", async (t) => {
  const fontes = await loadFontes(t);
  assert.equal(fontes.toggleDisabled("theo"), true);
  assert.equal(fontes.toggleDisabled("theo"), false);
  assert.deepEqual(fontes.getDisabled(), []);
  assert.equal(fontes.isFontesPrefsDirty(), true);
  const next = mergeCloudPrefs({ disabled: ["stale"] }, { disabled: fontes.getDisabled() }, true);
  assert.deepEqual(next.disabled, []);
  fontes.clearFontesPrefsDirty();
  assert.equal(fontes.isFontesPrefsDirty(), false);
});

test("cloud pull applies merge before writing local disabled", () => {
  const sync = readFileSync(join(root, "src/lib/news/prefs-sync.ts"), "utf8");
  assert.match(sync, /mergeCloudPrefs/);
  assert.match(sync, /isFontesPrefsDirty/);
  assert.match(sync, /applyRemotePrefs/);
  assert.match(sync, /clearFontesPrefsDirty/);
  const hook = readFileSync(join(root, "src/components/news/prefs-sync.tsx"), "utf8");
  assert.match(hook, /userId/);
  assert.doesNotMatch(hook, /\[user, isPending\]/);
});
