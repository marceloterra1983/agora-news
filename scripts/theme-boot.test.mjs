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

test("save, remove-interest, load-more and batch-move use 44px targets", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const read = (rel) => readFileSync(join(root, rel), "utf8");
  const card = read("src/components/news/story-card.tsx");
  const save = card.slice(card.indexOf("Salvar matéria"));
  assert.match(save, /tapIcon|size-\[44px\]/);
  assert.doesNotMatch(save.slice(0, 400), /size-8 /);

  const interests = read("src/components/news/buscar-interests.tsx");
  const remove = interests.slice(interests.indexOf("Remover @"));
  assert.match(remove, /tapIcon|size-\[44px\]/);
  assert.doesNotMatch(remove.slice(0, 350), /size-8 /);

  const feed = read("src/components/news/feed.tsx");
  const more = feed.slice(feed.indexOf("mais 12 horas"));
  assert.match(more, /min-h-\[44px\]|tapIcon|size-\[44px\]/);
  assert.doesNotMatch(more.slice(0, 350), /size-10 /);

  const batch = read("src/components/news/fontes-batch-bar.tsx");
  assert.match(batch, /min-h-\[44px\]/);
  assert.doesNotMatch(batch, /className="h-7 /);
});

test("buscar uses useExtraFontes and login focuses email after error", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const read = (rel) => readFileSync(join(root, rel), "utf8");
  const buscar = read("src/routes/buscar.tsx");
  assert.match(buscar, /useExtraFontes/);
  assert.doesNotMatch(buscar, /syncExtraFontes\s*\(/);
  assert.doesNotMatch(buscar, /fontesTick/);

  const login = read("src/routes/login.tsx");
  const signInPanel = login.slice(
    login.indexOf("function SignInPanel()"),
    login.indexOf("function SignUpPanel()"),
  );
  const signUpPanel = login.slice(login.indexOf("function SignUpPanel()"));
  assert.equal(
    (login.match(/emailRef\.current\?\.focus\(\)/g) ?? []).length,
    2,
    "SignIn and SignUp must focus email after auth error",
  );
  for (const [name, panel] of [
    ["SignInPanel", signInPanel],
    ["SignUpPanel", signUpPanel],
  ]) {
    assert.match(panel, /useRef/, name);
    assert.match(panel, /emailRef/, name);
    assert.match(panel, /emailRef\.current\?\.focus\(\)/, name);
  }
});

test("app menu closes when focus leaves the box", () => {
  const src = readFileSync(join(root, "src/components/news/app-menu.tsx"), "utf8");
  assert.match(src, /focusout|onBlur/);
  assert.match(src, /relatedTarget/);
  assert.match(src, /setOpen\(false\)/);
});
