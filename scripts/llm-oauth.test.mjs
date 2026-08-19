import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  applyLlmCommand,
  emptyLlmStore,
  mergePrefsPreservingLlm,
  parseLlmStore,
  publicLlmPrefs,
  resolveLlmRuntime,
  stripLlmFromPrefs,
} from "../src/lib/news/llm-accounts.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

function llmUiSource() {
  const dir = join(root, "src/components/news");
  return readdirSync(dir)
    .filter((name) => name.startsWith("llm-"))
    .map((name) => read(`src/components/news/${name}`))
    .join("\n");
}

function llmLibSource() {
  return [
    "src/lib/news/llm-accounts.mjs",
    "src/lib/news/llm-client.mjs",
    "src/lib/news/llm-ask.ts",
    "src/lib/news/llm-server.ts",
    "src/lib/news/llm-oauth.mjs",
    "src/lib/news/llm-oauth-policy.mjs",
  ]
    .map((rel) => {
      try {
        return read(rel);
      } catch {
        return "";
      }
    })
    .join("\n");
}

const access = "sk-ant-oat01-access-zzzz";
const refresh = "sk-ant-ort01-refresh-yyyy";
const oauthStore = {
  activeAccountId: "oa-1",
  accounts: [
    {
      id: "oa-1",
      label: "Claude Pro",
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      authKind: "oauth",
      key: access,
      refreshToken: refresh,
      expiresAt: "2026-08-19T12:00:00.000Z",
      status: "ok",
      checkedAt: null,
    },
  ],
};

test("oauth account keeps authKind through parse, merge and strip", () => {
  const parsed = parseLlmStore(oauthStore);
  assert.equal(parsed.accounts[0].authKind, "oauth");
  assert.equal(parsed.accounts[0].refreshToken, refresh);
  assert.equal(parsed.accounts[0].key, access);

  const apiLegacy = parseLlmStore({
    activeAccountId: "a1",
    accounts: [{ id: "a1", label: "Key", provider: "openai", model: "gpt-4.1-mini", key: "sk-live-abcd" }],
  });
  assert.equal(apiLegacy.accounts[0].authKind, "api");

  const merged = mergePrefsPreservingLlm({ theme: "dark" }, { _llm: oauthStore });
  assert.equal(merged._llm.accounts[0].authKind, "oauth");
  assert.equal(merged._llm.accounts[0].refreshToken, refresh);
  assert.equal(Object.hasOwn(stripLlmFromPrefs(merged), "_llm"), false);
});

test("public prefs hint masks the token and never leak refresh or access", () => {
  const pub = publicLlmPrefs(oauthStore, {});
  assert.equal(pub.accounts[0].authKind, "oauth");
  assert.equal(pub.accounts[0].keyHint, "…zzzz");
  assert.equal(pub.accounts[0].key, undefined);
  assert.equal(pub.accounts[0].refreshToken, undefined);
  const blob = JSON.stringify(pub);
  assert.equal(blob.includes(access), false);
  assert.equal(blob.includes(refresh), false);
  assert.equal(blob.includes("yyyy"), false);
});

test("resolveLlmRuntime exposes oauth access and refresh for the owner", () => {
  const runtime = resolveLlmRuntime({ store: oauthStore, env: {}, userId: "owner-1" });
  assert.equal(runtime.source, "account");
  assert.equal(runtime.authKind, "oauth");
  assert.equal(runtime.key, access);
  assert.equal(runtime.refreshToken, refresh);
  assert.equal(runtime.provider, "anthropic");
});

test("upsert oauth account does not require an API key field name", () => {
  const next = applyLlmCommand(emptyLlmStore(), {
    type: "upsert",
    label: "Claude Pro",
    provider: "anthropic",
    authKind: "oauth",
    key: access,
    refreshToken: refresh,
    status: "ok",
  });
  assert.equal(next.accounts[0].authKind, "oauth");
  assert.equal(next.accounts[0].refreshToken, refresh);
  const listed = publicLlmPrefs(next, {});
  assert.equal(listed.accounts[0].authKind, "oauth");
  assert.equal(listed.accounts[0].keyHint, "…zzzz");
});

test("pending oauth verifier stays on the store and never reaches public prefs", () => {
  const pending = applyLlmCommand(emptyLlmStore(), {
    type: "oauth-pending",
    provider: "anthropic",
    state: "st-1",
    codeVerifier: "pkce-verifier-secret",
    label: "Claude Pro",
    model: "claude-sonnet-4-5",
  });
  assert.equal(pending.pendingOauth.codeVerifier, "pkce-verifier-secret");
  const pub = publicLlmPrefs(pending, {});
  assert.equal(JSON.stringify(pub).includes("pkce-verifier-secret"), false);
  assert.equal(pub.pendingOauth, undefined);
});

test("subscription auth is official OAuth for Claude and API-only for OpenAI/Grok", async () => {
  const { subscriptionAuthFor } = await import("../src/lib/news/llm-oauth-policy.mjs");
  const claude = subscriptionAuthFor("anthropic");
  const openai = subscriptionAuthFor("openai");
  const grok = subscriptionAuthFor("xai");
  assert.equal(claude.available, true);
  assert.equal(openai.available, false);
  assert.match(openai.reason, /Plus|API|chave|platform\.openai/i);
  assert.equal(grok.available, false);
  assert.match(grok.reason, /API|chave|SuperGrok/i);
});

test("Claude authorize URL is official OAuth with PKCE", async () => {
  const { startClaudeOauth, parseOauthCallbackInput, tokenRefreshRequest } = await import(
    "../src/lib/news/llm-oauth.mjs"
  );
  const started = startClaudeOauth();
  const url = new URL(started.authorizeUrl);
  assert.ok(["claude.ai", "platform.claude.com", "console.anthropic.com"].includes(url.hostname));
  assert.match(url.pathname, /oauth/);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.ok(url.searchParams.get("code_challenge"));
  assert.ok(url.searchParams.get("state"));
  assert.ok(started.pending.codeVerifier);
  assert.notEqual(started.pending.codeVerifier, url.searchParams.get("code_challenge"));

  assert.deepEqual(parseOauthCallbackInput("http://localhost:54545/callback?code=abc&state=st"), {
    code: "abc",
    state: "st",
  });
  assert.deepEqual(parseOauthCallbackInput("tok#st2"), { code: "tok", state: "st2" });
  assert.deepEqual(parseOauthCallbackInput("onlycode"), { code: "onlycode", state: "" });

  const refreshReq = tokenRefreshRequest({ refreshToken: "rt-secret", clientId: "cid" });
  assert.equal(refreshReq.url, "https://platform.claude.com/v1/oauth/token");
  assert.match(String(refreshReq.init.body), /refresh_token/);
  assert.doesNotMatch(read("src/lib/news/llm-oauth.mjs"), /console\.(log|info|debug)/);
});

test("oauth 401 refreshes once then succeeds; failed refresh stays auth", async () => {
  const { askProviderLineWithRefresh } = await import("../src/lib/news/llm-client.mjs");
  let chatCalls = 0;
  const persisted = [];
  const ok = await askProviderLineWithRefresh({
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    key: "old-access",
    refreshToken: "old-rt",
    authKind: "oauth",
    prompt: "quem",
    persistTokens: async (tokens) => {
      persisted.push(tokens);
    },
    fetchImpl: async (url) => {
      if (String(url).includes("/oauth/token")) {
        return jsonResponse(200, {
          access_token: "new-access-wwww",
          refresh_token: "new-rt",
          expires_in: 3600,
        });
      }
      chatCalls += 1;
      if (chatCalls === 1) return jsonResponse(401, { error: { type: "authentication_error" } });
      return jsonResponse(200, { content: [{ type: "text", text: "Ok renovado." }] });
    },
  });
  assert.equal(ok.line, "Ok renovado.");
  assert.equal(ok.status, "ok");
  assert.equal(persisted[0].accessToken, "new-access-wwww");

  const failed = await askProviderLineWithRefresh({
    provider: "anthropic",
    model: "claude-sonnet-4-5",
    key: "old-access",
    refreshToken: "old-rt",
    authKind: "oauth",
    prompt: "quem",
    fetchImpl: async (url) => {
      if (String(url).includes("/oauth/token")) return jsonResponse(400, { error: "invalid_grant" });
      return jsonResponse(401, {});
    },
  });
  assert.equal(failed.status, "auth");
  assert.equal(failed.line, "");
});

test("anthropic oauth chat uses Bearer, not x-api-key", async () => {
  const { chatRequests } = await import("../src/lib/news/llm-client.mjs");
  const [req] = chatRequests("anthropic", "claude-sonnet-4-5", "oat-token", "hi", undefined, "oauth");
  assert.equal(req.init.headers.Authorization, "Bearer oat-token");
  assert.equal(req.init.headers["x-api-key"], undefined);
  assert.ok(req.init.headers["anthropic-version"]);
});

test("settings UI offers API and Assinatura without web password or chatgpt login fetch", () => {
  const ui = llmUiSource();
  const lib = llmLibSource();
  const all = `${ui}\n${lib}`;
  assert.match(ui, /Assinatura/);
  assert.match(ui, /API/);
  assert.match(ui, /Conectar/);
  assert.match(ui, /Já autorizei|ja autorizei|já autorizei/i);
  assert.match(read("src/lib/news/llm-server.ts"), /startLlmOauth|completeLlmOauth/);
  assert.doesNotMatch(all, /chatgpt\.com\/login/);
  assert.doesNotMatch(all, /claude\.ai\/login/);
  assert.doesNotMatch(ui, /document\.cookie/);
  assert.doesNotMatch(ui, /senha do ChatGPT|email\+senha|cookie da sessão/i);
  assert.doesNotMatch(all, /fetch\([^)]*chatgpt\.com/i);
});
