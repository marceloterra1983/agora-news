import assert from "node:assert/strict";
import test from "node:test";
import {
  clipOneLine,
  extractLlmText,
  extractMatchesPerson,
  looksPortuguese,
  plausibleSummary,
} from "../src/lib/news/summary-core.mjs";

test("clipOneLine strips urls/hashtags and cuts at a sentence or 160 chars", () => {
  assert.equal(clipOneLine("  Olá.  Mundo.  "), "Olá.");
  assert.equal(clipOneLine('https://x.com/a #tag "Oi"'), "Oi");
  const long = `${"palavra ".repeat(30)}fim`;
  const clipped = clipOneLine(long);
  assert.ok(clipped.length <= 160);
  assert.match(clipped, /…$/);
});

test("looksPortuguese detects accents and common particles", () => {
  assert.equal(looksPortuguese("pesquisa de inteligência"), true);
  assert.equal(looksPortuguese("hello world this is english"), false);
});

test("extractMatchesPerson requires handle or enough name tokens", () => {
  assert.equal(extractMatchesPerson("Sam Altman", "sama", "Sam Altman", "CEO da OpenAI"), true);
  assert.equal(extractMatchesPerson("Sam Altman", "sama", "Outra pessoa", "texto sem nome"), false);
  assert.equal(extractMatchesPerson("Lex", "lexfridman", "Talk with @lexfridman", "podcast"), true);
});

test("plausibleSummary rejects invented prestige and the lex leak", () => {
  assert.equal(plausibleSummary("Pesquisa em IA.", "OpenAI", "OpenAI", "AI lab"), true);
  assert.equal(plausibleSummary("Fonte acompanhada no feed.", "OpenAI", "OpenAI", ""), false);
  assert.equal(plausibleSummary("Amigo do Lex Fridman.", "Ada", "ada", "math"), false);
  assert.equal(plausibleSummary("Ganhou o Prêmio Nobel.", "Ada", "ada", "math"), false);
});

test("extractLlmText reads chat and responses payloads", () => {
  assert.equal(extractLlmText({ choices: [{ message: { content: "  uma linha  " } }] }), "  uma linha  ");
  assert.equal(
    extractLlmText({ output: [{ content: [{ text: "pt1" }, { text: "pt2" }] }] }),
    "pt1\npt2",
  );
  assert.equal(extractLlmText({}), "");
});
