import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  catalogModelsFor,
  defaultModelFor,
  modelOptionsFor,
} from "../src/lib/news/llm-accounts.mjs";
import { chatRequests, listProviderModels, validationRequest } from "../src/lib/news/llm-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

function ids(provider) {
  return catalogModelsFor(provider).map((row) => row.id);
}

test("catalog per provider only returns that provider's production chat IDs", () => {
  const openai = ids("openai");
  const anthropic = ids("anthropic");
  const xai = ids("xai");

  assert.ok(openai.length >= 4);
  assert.ok(anthropic.length >= 3);
  assert.ok(xai.length >= 1);

  for (const id of openai) {
    assert.match(id, /^(gpt-|o[1-9])/);
    assert.doesNotMatch(id, /claude|grok|gemini|mistral|deepseek/i);
    assert.doesNotMatch(id, /embedding|tts|whisper|dall-e/i);
  }
  for (const id of anthropic) {
    assert.match(id, /^claude-/);
    assert.doesNotMatch(id, /gpt-|grok|gemini/i);
  }
  for (const id of xai) {
    assert.match(id, /^grok-/);
    assert.doesNotMatch(id, /imagine|voice|video/i);
    assert.doesNotMatch(id, /gpt-|claude|gemini/i);
  }

  assert.ok(openai.includes("gpt-4.1-mini"));
  assert.ok(openai.includes("gpt-4.1"));
  assert.ok(openai.includes("gpt-4o-mini"));
  assert.ok(openai.includes("gpt-4o"));
  assert.ok(anthropic.includes("claude-sonnet-4-5"));
  assert.ok(anthropic.includes("claude-opus-4-5"));
  assert.ok(anthropic.includes("claude-haiku-4-5"));
  assert.ok(xai.includes("grok-4.5"));
  assert.ok(xai.includes("grok-4.6"));
  assert.ok(xai.includes("grok-4.3"));

  for (const provider of ["openai", "anthropic", "xai"]) {
    for (const row of catalogModelsFor(provider)) {
      assert.ok(row.id);
      assert.ok(row.label);
      assert.notEqual(row.label, row.id);
    }
  }
});

test("changing provider resets to that provider's default model", () => {
  assert.equal(defaultModelFor("openai"), "gpt-4.1-mini");
  assert.equal(defaultModelFor("anthropic"), "claude-sonnet-4-5");
  assert.equal(defaultModelFor("xai"), "grok-4.5");
  assert.ok(ids("openai").includes(defaultModelFor("openai")));
  assert.ok(ids("anthropic").includes(defaultModelFor("anthropic")));
  assert.ok(ids("xai").includes(defaultModelFor("xai")));
});

test("saved model outside the catalog still appears as an extra option", () => {
  const extra = modelOptionsFor("openai", "ft:gpt-4.1-mini:personal:old");
  assert.ok(extra.some((row) => row.id === "gpt-4.1-mini"));
  assert.ok(extra.some((row) => row.id === "ft:gpt-4.1-mini:personal:old"));
  const known = modelOptionsFor("xai", "grok-4.5");
  assert.equal(known.filter((row) => row.id === "grok-4.5").length, 1);
});

test("settings model field is a native select of existing models, not free text", () => {
  const ui = readdirSync(join(root, "src/components/news"))
    .filter((name) => name.startsWith("llm-"))
    .map((name) => read(`src/components/news/${name}`))
    .join("\n");
  assert.match(ui, /aria-label=["']Modelo["']/);
  assert.match(ui, /<select[\s\S]*aria-label=["']Modelo["']|aria-label=["']Modelo["'][\s\S]*<select/);
  assert.match(ui, /modelOptionsFor/);
  assert.match(ui, /setModel\(defaultModelFor\(next\)\)/);
  assert.doesNotMatch(ui, /placeholder=\{defaultModelFor\(provider\)\}/);
  assert.doesNotMatch(ui, /Gemini|Mistral|DeepSeek/i);
});

test("listProviderModels uses catalog without key and when live listing fails", async () => {
  const noKey = await listProviderModels({ provider: "openai", key: "" });
  assert.equal(noKey.source, "catalog");
  assert.deepEqual(
    noKey.models.map((row) => row.id),
    ids("openai"),
  );

  const failed = await listProviderModels({
    provider: "anthropic",
    key: "ant-x",
    fetchImpl: async () => {
      throw new Error("network");
    },
  });
  assert.equal(failed.source, "catalog");
  assert.ok(failed.models.some((row) => row.id === "claude-sonnet-4-5"));
});

test("listProviderModels keeps only useful chat models from a mocked live list", async () => {
  const live = await listProviderModels({
    provider: "openai",
    key: "sk-live",
    selectedId: "my-old-ft",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          { id: "gpt-4.1" },
          { id: "text-embedding-3-small" },
          { id: "tts-1" },
          { id: "whisper-1" },
          { id: "dall-e-3" },
          { id: "gpt-4o-mini" },
        ],
      }),
    }),
  });
  assert.equal(live.source, "live");
  const liveIds = live.models.map((row) => row.id);
  assert.ok(liveIds.includes("gpt-4.1"));
  assert.ok(liveIds.includes("gpt-4o-mini"));
  assert.ok(liveIds.includes("gpt-4.1-mini"));
  assert.ok(liveIds.includes("my-old-ft"));
  assert.equal(liveIds.includes("text-embedding-3-small"), false);
  assert.equal(liveIds.includes("tts-1"), false);
  assert.equal(liveIds.includes("whisper-1"), false);
  assert.equal(liveIds.includes("dall-e-3"), false);
});

test("validate and ask send the selected model, not a hardcoded default", () => {
  const openaiVal = validationRequest("openai", "sk", "gpt-4o");
  assert.match(String(openaiVal.init.body || ""), /"gpt-4o"/);
  const claudeVal = validationRequest("anthropic", "ant", "claude-opus-4-5");
  assert.match(String(claudeVal.init.body || ""), /claude-opus-4-5/);
  const grokVal = validationRequest("xai", "xai-key", "grok-4.6");
  assert.match(String(grokVal.init.body || ""), /"grok-4.6"/);

  const [openaiChat] = chatRequests("openai", "gpt-4o", "sk", "quem");
  assert.match(String(openaiChat.init.body), /"gpt-4o"/);
  const [claudeChat] = chatRequests("anthropic", "claude-haiku-4-5", "ant", "quem");
  assert.match(String(claudeChat.init.body), /claude-haiku-4-5/);
  const [grokChat] = chatRequests("xai", "grok-4.3", "xai-key", "quem");
  assert.match(String(grokChat.init.body), /"grok-4.3"/);
});

test("ask runtime passes account.model into askProviderLine", () => {
  const ask = read("src/lib/news/llm-ask.ts");
  const server = read("src/lib/news/llm-server.ts");
  assert.match(ask, /model:\s*runtime\.model/);
  assert.doesNotMatch(ask, /model:\s*["'](?:gpt-|claude-|grok-)/);
  assert.match(server, /validateLlmKey\([\s\S]*model:\s*data\.model/);
  assert.match(server, /listLlmModels|listProviderModels/);
});
