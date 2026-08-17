import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("THEME_BOOT_SCRIPT creates theme-color when the meta is missing", () => {
  const src = readFileSync(join(root, "src/lib/news/theme.ts"), "utf8");
  assert.match(src, /THEME_BOOT_SCRIPT/);
  assert.match(src, /createElement\(["']meta["']\)|document\.head\.appendChild/);
  assert.match(src, /#12100e/);
  assert.match(src, /#f2eee4/);
});

test("secondary back links use the 44px tap target", () => {
  for (const rel of [
    "src/routes/login.tsx",
    "src/routes/salvos.tsx",
    "src/routes/instalar.tsx",
    "src/routes/referencias.tsx",
  ]) {
    const src = readFileSync(join(root, rel), "utf8");
    assert.match(src, /size-\[44px\]/, rel);
    assert.doesNotMatch(src, /size-8 place-items-center rounded-full border/, rel);
  }
});

test("app menu closes when focus leaves the box", () => {
  const src = readFileSync(join(root, "src/components/news/app-menu.tsx"), "utf8");
  assert.match(src, /focusout|onBlur/);
  assert.match(src, /relatedTarget/);
  assert.match(src, /setOpen\(false\)/);
});
