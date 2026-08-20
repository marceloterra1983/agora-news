import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { resolveSmokeUrl } from "./required-smoke.mjs";

test("sem NEWS_SMOKE_URL o smoke vivo não tem base", () => {
  const got = resolveSmokeUrl("");
  assert.equal(got.base, "");
  assert.match(got.reason, /ausente/i);
});

test("127.0.0.1:3080 é produção e exige override", () => {
  const prev = process.env.NEWS_SMOKE_ALLOW_PROD;
  delete process.env.NEWS_SMOKE_ALLOW_PROD;
  try {
    const got = resolveSmokeUrl("http://127.0.0.1:3080");
    assert.equal(got.base, "");
    assert.match(got.reason, /3080/);
  } finally {
    if (prev === undefined) delete process.env.NEWS_SMOKE_ALLOW_PROD;
    else process.env.NEWS_SMOKE_ALLOW_PROD = prev;
  }
});

test("CI em :3180 passa sem override", () => {
  const got = resolveSmokeUrl("http://127.0.0.1:3180");
  assert.equal(got.base, "http://127.0.0.1:3180");
});

test("ALLOW_PROD=1 libera 3080", () => {
  process.env.NEWS_SMOKE_ALLOW_PROD = "1";
  try {
    const got = resolveSmokeUrl("http://127.0.0.1:3080/");
    assert.equal(got.base, "http://127.0.0.1:3080");
  } finally {
    delete process.env.NEWS_SMOKE_ALLOW_PROD;
  }
});

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("smokes vivos não defaultam para :3080", () => {
  for (const rel of [
    "scripts/fontes-open-card.test.mjs",
    "scripts/fontes-profile-buttons.test.mjs",
    "scripts/fontes-smoke.test.mjs",
    "scripts/accessibility-contract.test.mjs",
    "scripts/simplification-contract.test.mjs",
    "scripts/mobile-ssr-viewport.test.mjs",
  ]) {
    const src = readFileSync(join(root, rel), "utf8");
    assert.doesNotMatch(src, /NEWS_SMOKE_URL \|\| ["']http:\/\/127\.0\.0\.1:3080["']/);
    assert.match(src, /liveSmokeUrl|resolveSmokeUrl/);
  }
});
