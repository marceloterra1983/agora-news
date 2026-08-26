import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  settingsFromEventDetail,
  writeSettings,
} from "../src/lib/news/settings.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

function withDom(t) {
  const values = new Map();
  const dataset = {};
  const localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, String(value));
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
  const window = {
    localStorage,
    dispatchEvent() {
      return true;
    },
  };
  const document = { documentElement: { dataset } };
  const prevW = Object.getOwnPropertyDescriptor(globalThis, "window");
  const prevD = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "window", { configurable: true, value: window });
  Object.defineProperty(globalThis, "document", { configurable: true, value: document });
  t.after(() => {
    if (prevW) Object.defineProperty(globalThis, "window", prevW);
    else delete globalThis.window;
    if (prevD) Object.defineProperty(globalThis, "document", prevD);
    else delete globalThis.document;
  });
  return { dataset };
}

test("writeSettings({ showImages: false }) persiste e marca html data-images=off", (t) => {
  const { dataset } = withDom(t);
  const next = writeSettings({ showImages: false });
  assert.equal(next.showImages, false);
  assert.equal(dataset.images, "off");
  assert.equal(JSON.parse(window.localStorage.getItem("agora-settings-v3")).showImages, false);
});

test("evento agora-settings com { fromRemote: true } não apaga showImages", (t) => {
  const { dataset } = withDom(t);
  writeSettings({ showImages: false });
  const next = settingsFromEventDetail({ fromRemote: true });
  assert.equal(next.showImages, false);
  assert.equal(dataset.images, "off");
});

test("hook e sync da nuvem hidratam settings reais, não o envelope fromRemote", () => {
  const hook = read("src/lib/news/use-settings.ts");
  const sync = read("src/lib/news/prefs-sync.ts");
  const page = read("src/routes/configuracoes.tsx");
  assert.match(hook, /settingsFromEventDetail/);
  assert.match(sync, /\.\.\.readSettings\(\)/);
  assert.match(sync, /fromRemote:\s*true/);
  assert.match(page, /title="Mostrar fotos"/);
  assert.match(page, /showImages:\s*!settings\.showImages/);
});
