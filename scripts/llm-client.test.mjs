import assert from "node:assert/strict";
import test from "node:test";
import {
  CLAUDE_CODE_IDENTITY,
  askProviderLine,
  chatRequests,
  validationRequest,
  validateLlmKey,
} from "../src/lib/news/llm-client.mjs";

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

const anthropicModelCases = [
  { model: "claude-opus-5", disable: true, alwaysOn: false, chatMax: 90, pingMax: 1, fallbacks: true },
  { model: "claude-opus-5-5", disable: false, alwaysOn: true, chatMax: 2048, pingMax: 256, fallbacks: true },
  { model: "claude-fable-5-1", disable: false, alwaysOn: true, chatMax: 2048, pingMax: 256, fallbacks: true },
  { model: "claude-sonnet-5", disable: true, alwaysOn: false, chatMax: 90, pingMax: 1, fallbacks: false },
  { model: "claude-sonnet-4-5", disable: false, alwaysOn: false, chatMax: 90, pingMax: 1, fallbacks: false },
  { model: "claude-opus-4-5", disable: false, alwaysOn: false, chatMax: 90, pingMax: 1, fallbacks: false },
  { model: "claude-opus-4-7", disable: false, alwaysOn: false, chatMax: 90, pingMax: 1, fallbacks: false },
  { model: "claude-opus-4-8", disable: false, alwaysOn: false, chatMax: 90, pingMax: 1, fallbacks: false },
  { model: "claude-haiku-4-5", disable: false, alwaysOn: false, chatMax: 90, pingMax: 1, fallbacks: false },
  { model: "claude-mythos-5-1", disable: false, alwaysOn: true, chatMax: 2048, pingMax: 256, fallbacks: true },
];

function expectedAnthropicBeta(authKind, supportsFallbacks) {
  const beta = [
    authKind === "oauth" ? "oauth-2025-04-20" : null,
    supportsFallbacks ? "server-side-fallback-2026-07-01" : null,
  ]
    .filter(Boolean)
    .join(",");
  return beta || undefined;
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

test("oauth validate persists without probing GET /models", async () => {
  const { validateLlmKey } = await import("../src/lib/news/llm-client.mjs");
  let called = 0;
  const ok = await validateLlmKey({
    provider: "anthropic",
    key: "sk-ant-oat01-x",
    model: "claude-sonnet-4-5",
    authKind: "oauth",
    fetchImpl: async () => {
      called += 1;
      return jsonResponse(401, {});
    },
  });
  assert.equal(ok.status, "ok");
  assert.equal(ok.persist, true);
  assert.equal(called, 0);
});

test("oauth anthropic chat sends Claude Code identity and CLI headers", async () => {
  const { CLAUDE_CODE_IDENTITY, chatRequests } = await import("../src/lib/news/llm-client.mjs");
  const [req] = chatRequests("anthropic", "claude-sonnet-4-5", "oat-token", "hi", "resumo", "oauth");
  const body = JSON.parse(String(req.init.body));
  assert.equal(body.system[0].text, CLAUDE_CODE_IDENTITY);
  assert.equal(req.init.headers.Authorization, "Bearer oat-token");
  assert.equal(req.init.headers["x-api-key"], undefined);
  assert.equal(req.init.headers["x-app"], "cli");
  assert.match(String(req.init.headers["user-agent"] || ""), /claude-cli/);
  assert.equal(req.init.headers["anthropic-beta"], "oauth-2025-04-20");
  assert.equal(body.temperature, undefined);
  assert.equal(body.top_p, undefined);
  assert.equal(body.top_k, undefined);
  assert.equal(body.output_config, undefined);
  assert.equal(body.fallbacks, undefined);
});

test("Anthropic chat options follow model family for API and OAuth", () => {
  for (const authKind of ["api", "oauth"]) {
    for (const { model, disable, alwaysOn, chatMax, fallbacks } of anthropicModelCases) {
      const [req] = chatRequests("anthropic", model, "ant-test", "oi", "resumo", authKind);
      const body = JSON.parse(String(req.init.body));
      const expectedBody = {
        model,
        max_tokens: chatMax,
        ...(disable
          ? { thinking: { type: "disabled" }, output_config: { effort: "low" } }
          : alwaysOn
            ? { output_config: { effort: "low" } }
            : {}),
        ...(fallbacks ? { fallbacks: "default" } : {}),
        system:
          authKind === "oauth"
            ? [
                { type: "text", text: CLAUDE_CODE_IDENTITY },
                { type: "text", text: "resumo" },
              ]
            : "resumo",
        messages: [{ role: "user", content: "oi" }],
      };

      assert.deepEqual(body, expectedBody, `${model} ${authKind} chat body`);
      assert.equal(body.temperature, undefined, `${model} ${authKind} never sends temperature`);
      assert.equal(body.top_p, undefined, `${model} ${authKind} never sends top_p`);
      assert.equal(body.top_k, undefined, `${model} ${authKind} never sends top_k`);
      assert.equal(
        req.init.headers["anthropic-beta"],
        expectedAnthropicBeta(authKind, fallbacks),
        `${model} ${authKind} beta header`,
      );
      assert.equal(req.init.headers["x-api-key"], authKind === "api" ? "ant-test" : undefined);
      assert.equal(
        req.init.headers.Authorization,
        authKind === "oauth" ? "Bearer ant-test" : undefined,
      );
    }
  }
});

test("Anthropic validation ping options follow model family for API and OAuth", () => {
  for (const authKind of ["api", "oauth"]) {
    for (const { model, disable, alwaysOn, pingMax, fallbacks } of anthropicModelCases) {
      const req = validationRequest("anthropic", "ant-test", model, authKind);
      const body = JSON.parse(String(req.init.body));
      const expectedBody = {
        model,
        max_tokens: pingMax,
        ...(disable
          ? { thinking: { type: "disabled" }, output_config: { effort: "low" } }
          : alwaysOn
            ? { output_config: { effort: "low" } }
            : {}),
        ...(fallbacks ? { fallbacks: "default" } : {}),
        messages: [{ role: "user", content: "ok" }],
      };

      assert.deepEqual(body, expectedBody, `${model} ${authKind} ping body`);
      assert.equal(body.temperature, undefined, `${model} ${authKind} ping never sends temperature`);
      assert.equal(
        req.init.headers["anthropic-beta"],
        expectedAnthropicBeta(authKind, fallbacks),
        `${model} ${authKind} beta header`,
      );
      assert.equal(req.init.headers["x-api-key"], authKind === "api" ? "ant-test" : undefined);
      assert.equal(
        req.init.headers.Authorization,
        authKind === "oauth" ? "Bearer ant-test" : undefined,
      );
    }
  }
});

test("Anthropic Opus 5 chat disables thinking for the short response budget", () => {
  const [req] = chatRequests("anthropic", "claude-opus-5", "ant-test", "oi", "resumo");
  const body = JSON.parse(String(req.init.body));

  assert.deepEqual(body, {
    model: "claude-opus-5",
    max_tokens: 90,
    thinking: { type: "disabled" },
    output_config: { effort: "low" },
    fallbacks: "default",
    system: "resumo",
    messages: [{ role: "user", content: "oi" }],
  });
  assert.equal(req.init.headers["anthropic-beta"], "server-side-fallback-2026-07-01");
});

test("Anthropic Opus 5.5, Fable and Mythos never send thinking (disabled 400s)", () => {
  for (const model of ["claude-opus-5-5", "claude-fable-5", "claude-fable-5-1", "claude-mythos-5", "claude-mythos-5-1"]) {
    const [chat] = chatRequests("anthropic", model, "ant-test", "oi", "resumo");
    const chatBody = JSON.parse(String(chat.init.body));
    assert.equal(chatBody.thinking, undefined, `${model} chat omits thinking`);
    assert.deepEqual(chatBody.output_config, { effort: "low" });
    assert.equal(chatBody.max_tokens, 2048);
    assert.equal(chatBody.fallbacks, "default");

    const ping = validationRequest("anthropic", "ant-test", model);
    const pingBody = JSON.parse(String(ping.init.body));
    assert.equal(pingBody.thinking, undefined, `${model} ping omits thinking`);
    assert.deepEqual(pingBody.output_config, { effort: "low" });
    assert.equal(pingBody.max_tokens, 256);
    assert.equal(pingBody.fallbacks, "default");
  }
});

test("Anthropic future opus-5-N (N>=5) stays always-on; dated snapshot keeps opus-5", () => {
  const [future] = chatRequests("anthropic", "claude-opus-5-6", "ant-test", "oi", "resumo");
  assert.equal(JSON.parse(String(future.init.body)).thinking, undefined);

  const [dated] = chatRequests("anthropic", "claude-opus-5-20260101", "ant-test", "oi", "resumo");
  assert.deepEqual(JSON.parse(String(dated.init.body)).thinking, { type: "disabled" });
});

test("Anthropic validation ping uses Opus 5 short-output settings and fallback", () => {
  const req = validationRequest("anthropic", "ant-test");
  const body = JSON.parse(String(req.init.body));

  assert.deepEqual(body, {
    model: "claude-opus-5",
    max_tokens: 1,
    thinking: { type: "disabled" },
    output_config: { effort: "low" },
    fallbacks: "default",
    messages: [{ role: "user", content: "ok" }],
  });
  assert.equal(req.init.headers["anthropic-beta"], "server-side-fallback-2026-07-01");
});

test("validateLlmKey checks the key via models list, not a chat ping", async () => {
  const urls = [];
  const ok = await validateLlmKey({
    provider: "openai",
    key: "sk-ok",
    model: "gpt-4.1-mini",
    fetchImpl: async (url) => {
      urls.push(String(url));
      return jsonResponse(200, { data: [] });
    },
  });
  assert.equal(ok.status, "ok");
  assert.equal(ok.persist, true);
  assert.ok(urls.length > 0);
  assert.ok(urls.every((url) => url.includes("/v1/models")));
  assert.equal(
    urls.some((url) => url.includes("chat/completions") || url.includes("/messages")),
    false,
  );
});

test("askProviderLine hits the three provider endpoints with mock fetch", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({
      url: String(url),
      headers: init?.headers || {},
      body: JSON.parse(String(init?.body)),
    });
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
    model: "claude-opus-5",
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
  assert.equal(anthropic.body.model, "claude-opus-5");
  assert.equal(anthropic.body.max_tokens, 90);
  assert.deepEqual(anthropic.body.thinking, { type: "disabled" });
  assert.deepEqual(anthropic.body.output_config, { effort: "low" });
  assert.equal(anthropic.body.fallbacks, "default");
  assert.equal(anthropic.body.temperature, undefined);
  const open = calls.find((c) => c.url.includes("openai"));
  assert.match(String(open.headers.Authorization || open.headers.authorization), /Bearer sk-test/);
  assert.equal(open.body.max_tokens, 90);
  assert.equal(open.body.temperature, 0);
  assert.equal(open.body.thinking, undefined);
  const grokRequest = calls.find((c) => c.url.includes("api.x.ai/v1/chat/completions"));
  assert.equal(grokRequest.body.max_tokens, 90);
  assert.equal(grokRequest.body.temperature, 0);
  assert.equal(grokRequest.body.thinking, undefined);
});

test("askProviderLine handles Anthropic refusal before reading response content", async () => {
  const refusal = { stop_reason: "refusal" };
  Object.defineProperty(refusal, "content", {
    get() {
      throw new Error("refusal content must not be read");
    },
  });

  const result = await askProviderLine({
    provider: "anthropic",
    model: "claude-opus-5",
    key: "ant-test",
    prompt: "conteúdo de segurança",
    fetchImpl: async () => jsonResponse(200, refusal),
  });

  assert.deepEqual(result, { line: "", status: "error", httpStatus: 200 });
});
