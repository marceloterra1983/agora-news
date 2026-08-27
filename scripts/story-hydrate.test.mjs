import assert from "node:assert/strict";
import test from "node:test";
import { hydrateStoryBody } from "../src/lib/news/translate-pt.mjs";

const EN = "There is no way to do this without the models and their tests.";
const PT = "Não há como fazer isso sem os modelos e os testes deles.";

test("hydrateStoryBody replaces persisted English with a fresh Portuguese body", async () => {
  const body = await hydrateStoryBody(EN, EN, async () => PT);
  assert.equal(body, PT);
});

test("hydrateStoryBody keeps the body when translation still fails", async () => {
  const body = await hydrateStoryBody(EN, EN, async () => "");
  assert.equal(body, EN);
});
