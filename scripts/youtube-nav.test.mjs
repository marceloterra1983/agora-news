import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const appMenu = readFileSync(join(root, "src/components/news/app-menu.tsx"), "utf8");

test("AppMenu contains Vídeos link", () => {
  assert.match(appMenu, /Vídeos/);
  assert.match(appMenu, /to="\/videos"/);
  assert.match(appMenu, /<Video className/);
});

test("AppMenu imports Video icon", () => {
  assert.match(appMenu, /Video,?\s+X,?\s+\} from "lucide-react"/s);
});
