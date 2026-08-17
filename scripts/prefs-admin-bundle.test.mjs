import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const FORBIDDEN = [
  "adminHeaders",
  "missing_supabase_secret_key",
  "SUPABASE_SECRET_KEY",
  "sb_secret",
];

test("prefs-sync imports only server-fn stubs, never admin or owner I/O", () => {
  const sync = read("src/lib/news/prefs-sync.ts");
  assert.match(sync, /from ["']\.\/prefs-server["']/);
  assert.match(sync, /loadPrefs/);
  assert.match(sync, /savePrefs/);
  assert.doesNotMatch(sync, /from ["']\.\/admin["']/);
  assert.doesNotMatch(sync, /readUserPrefs|writeUserPrefs|adminHeaders/);
});

test("browser assets never ship adminHeaders or the Supabase secret env name", () => {
  if (process.env.CI_ARTIFACT_GATES !== "1") return;
  const assets = join(root, ".output/public/assets");
  assert.equal(existsSync(assets), true, "execute npm run build before this gate");
  const files = readdirSync(assets).filter((name) => name.endsWith(".js"));
  assert.ok(files.length > 0, "client asset dir is empty");
  const leaks = [];
  for (const name of files) {
    const src = readFileSync(join(assets, name), "utf8");
    for (const needle of FORBIDDEN) {
      if (src.includes(needle)) leaks.push(`${name}: ${needle}`);
    }
  }
  assert.deepEqual(leaks, []);
});
