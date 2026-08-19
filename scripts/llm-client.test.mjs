import assert from "node:assert/strict";
import test from "node:test";
import { askProviderLine, validateLlmKey } from "../src/lib/news/llm-client.mjs";

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

test("validateLlmKey maps 401 to auth and 429 to quota without live fetch", async () => {
  const auth = await validateLlmKey({
    provider: "openai",
    key: "sk-bad",
    model: "gpt-4.1-mini",
    fetchImpl: async () => jsonResponse(401, { error: { message: "invalid" } }),
  });
  assert.equal(auth.status, "auth");
  assert.equal(auth.persist, false);
  assert.match(auth.warning, /recusada|inválida|permissão/i);

  const quota = await validateLlmKey({
    provider: "anthropic",
    key: "ant-limite",
    model: "claude-sonnet-4-5",
    fetchImpl: async () => jsonResponse(429, { error: { message: "rate" } }),
  });
  assert.equal(quota.status, "quota");
  assert.equal(quota.persist, true);
  assert.match(quota.warning, /limite/i);

  const ok = await validateLlmKey({
    provider: "xai",
    key: "xai-ok",
    model: "grok-4.5",
    fetchImpl: async () => jsonResponse(200, { data: [] }),
  });
  assert.equal(ok.status, "ok");
  assert.equal(ok.persist, true);
});

test("askProviderLine hits the three provider endpoints with mock fetch", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), headers: init?.headers || {} });
    return jsonResponse(200, {
      choices: [{ message: { content: "Uma frase curta." } }],
      content: [{ type: "text", text: "Uma frase curta." }],
    });
  };

  const openai = await askProviderLine({
    provider: "openai",
    model: "gpt-4.1-mini",
    key: "sk-test",
    prompt: "quem é",
    fetchImpl,
  });
  const claude = await askProviderLine({
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    key: "ant-test",
    prompt: "quem é",
    fetchImpl,
  });
  const grok = await askProviderLine({
    provider: "xai",
    model: "grok-4.5",
    key: "xai-test",
    prompt: "quem é",
    fetchImpl,
  });

  assert.equal(openai.line, "Uma frase curta.");
  assert.equal(claude.line, "Uma frase curta.");
  assert.equal(grok.line, "Uma frase curta.");
  assert.ok(calls.some((c) => c.url.includes("https://api.openai.com/v1/chat/completions")));
  assert.ok(calls.some((c) => c.url.includes("https://api.anthropic.com/v1/messages")));
  assert.ok(calls.some((c) => c.url.includes("https://api.x.ai")));
  const anthropic = calls.find((c) => c.url.includes("anthropic"));
  assert.equal(anthropic.headers["x-api-key"], "ant-test");
  assert.ok(anthropic.headers["anthropic-version"]);
  const open = calls.find((c) => c.url.includes("openai"));
  assert.match(String(open.headers.Authorization || open.headers.authorization), /Bearer sk-test/);
});
