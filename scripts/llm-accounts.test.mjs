import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  applyLlmCommand,
  classifyLlmHttpStatus,
  defaultModelFor,
  envLlmKey,
  LLM_PROVIDERS,
  llmWarningFor,
  maskKey,
  emptyLlmStore,
  mergePrefsPreservingLlm,
  persistValidatedStatus,
  publicLlmPrefs,
  resolveLlmRuntime,
  stripLlmFromPrefs,
} from "../src/lib/news/llm-accounts.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

const secret = "xai-secret-key-abcd";
const store = {
  activeAccountId: "acc-1",
  accounts: [
    {
      id: "acc-1",
      label: "xAI pessoal",
      provider: "xai",
      model: "grok-4.5",
      key: secret,
      status: "ok",
      checkedAt: null,
    },
  ],
  envStatus: null,
  envCheckedAt: null,
};

test("maskKey never returns the full secret", () => {
  assert.equal(maskKey(secret), "…abcd");
  assert.equal(maskKey(""), "");
  assert.ok(!maskKey(secret).includes("secret"));
});

test("resolveLlmRuntime returns provider, model and key of the active account", () => {
  const openaiStore = {
    activeAccountId: "o1",
    accounts: [
      {
        id: "o1",
        label: "OpenAI barata",
        provider: "openai",
        model: "gpt-4.1-mini",
        key: "sk-live-zzzz",
        status: "ok",
        checkedAt: null,
      },
    ],
  };
  const fromOpenAi = resolveLlmRuntime({
    store: openaiStore,
    env: { XAI_API_KEY: "env-key-zzzz" },
    userId: "owner-1",
  });
  assert.equal(fromOpenAi.source, "account");
  assert.equal(fromOpenAi.provider, "openai");
  assert.equal(fromOpenAi.model, "gpt-4.1-mini");
  assert.equal(fromOpenAi.key, "sk-live-zzzz");
  assert.equal(fromOpenAi.accountId, "o1");

  const claude = applyLlmCommand(openaiStore, {
    type: "upsert",
    id: "c1",
    label: "Claude",
    key: "ant-key-yyyy",
    provider: "anthropic",
  });
  const selected = applyLlmCommand(claude, { type: "select", id: "c1" });
  const fromClaude = resolveLlmRuntime({
    store: selected,
    env: { XAI_API_KEY: "env-key-zzzz" },
    userId: "owner-1",
  });
  assert.equal(fromClaude.provider, "anthropic");
  assert.equal(fromClaude.model, "claude-sonnet-4-5");
  assert.equal(fromClaude.key, "ant-key-yyyy");

  const cronEnv = resolveLlmRuntime({
    store: selected,
    env: { XAI_API_KEY: "env-key-zzzz" },
    userId: "",
  });
  assert.equal(cronEnv.source, "env");
  assert.equal(cronEnv.provider, "xai");
  assert.equal(cronEnv.key, "env-key-zzzz");
  assert.equal(cronEnv.model, "grok-4.5");
});

test("resolveLlmRuntime prefers the owner active account over env", () => {
  const env = { XAI_API_KEY: "env-key-zzzz", GROK_API_KEY: "" };
  const fromAccount = resolveLlmRuntime({ store, env, userId: "owner-1" });
  assert.equal(fromAccount.source, "account");
  assert.equal(fromAccount.key, secret);
  assert.equal(fromAccount.model, "grok-4.5");
  assert.equal(fromAccount.provider, "xai");
  assert.equal(fromAccount.accountId, "acc-1");

  const fromEnv = resolveLlmRuntime({ store, env, userId: "" });
  assert.equal(fromEnv.source, "env");
  assert.equal(fromEnv.key, "env-key-zzzz");
  assert.equal(fromEnv.accountId, null);

  const grokOnly = resolveLlmRuntime({
    store: { activeAccountId: null, accounts: [] },
    env: { GROK_API_KEY: "grok-env-yy" },
    userId: "owner-1",
  });
  assert.equal(grokOnly.source, "env");
  assert.equal(grokOnly.key, "grok-env-yy");

  const none = resolveLlmRuntime({
    store: { activeAccountId: null, accounts: [] },
    env: {},
    userId: "owner-1",
  });
  assert.equal(none.source, "none");
  assert.equal(none.key, "");
});

test("envLlmKey reads XAI then GROK and public prefs hide the key", () => {
  assert.equal(envLlmKey({ XAI_API_KEY: "aa", GROK_API_KEY: "bb" }), "aa");
  assert.equal(envLlmKey({ GROK_API_KEY: "bb" }), "bb");
  const pub = publicLlmPrefs(store, { XAI_API_KEY: "env-key" });
  assert.equal(pub.accounts[0].keyHint, "…abcd");
  assert.equal(pub.accounts[0].key, undefined);
  assert.equal(pub.envFallback, true);
  assert.equal(JSON.stringify(pub).includes(secret), false);
});

test("delete active account promotes another or clears", () => {
  const two = applyLlmCommand(store, {
    type: "upsert",
    label: "OpenAI",
    key: "other-key-wxyz",
    id: "acc-2",
    provider: "openai",
  });
  assert.equal(two.activeAccountId, "acc-1");
  assert.equal(two.accounts.length, 2);
  const afterDeleteActive = applyLlmCommand(two, { type: "delete", id: "acc-1" });
  assert.equal(afterDeleteActive.activeAccountId, "acc-2");
  assert.equal(afterDeleteActive.accounts.length, 1);

  const empty = applyLlmCommand(afterDeleteActive, { type: "delete", id: "acc-2" });
  assert.equal(empty.activeAccountId, null);
  assert.equal(empty.accounts.length, 0);
});

test("select and status stay on the store without exposing keys in warnings", () => {
  const selected = applyLlmCommand(store, { type: "select", id: "acc-1" });
  assert.equal(selected.activeAccountId, "acc-1");
  const marked = applyLlmCommand(selected, {
    type: "status",
    target: "account",
    accountId: "acc-1",
    status: "quota",
    checkedAt: "2026-08-18T00:00:00.000Z",
  });
  assert.equal(marked.accounts[0].status, "quota");
  assert.equal(classifyLlmHttpStatus(401), "auth");
  assert.equal(classifyLlmHttpStatus(403), "auth");
  assert.equal(classifyLlmHttpStatus(429), "quota");
  assert.equal(classifyLlmHttpStatus(402), "quota");
  assert.equal(classifyLlmHttpStatus(500), "error");
  assert.equal(classifyLlmHttpStatus(200), "ok");
  const warning = llmWarningFor("quota", { hasAccount: true, hasEnv: false });
  assert.match(warning, /limite|expirou|assinatura/i);
  assert.equal(warning.includes(secret), false);
});

test("prefs merge keeps _llm secrets and strip removes them from the client blob", () => {
  const existing = { theme: "dark", _llm: store };
  const incoming = { theme: "light", starred: ["a"] };
  const merged = mergePrefsPreservingLlm(incoming, existing);
  assert.equal(merged.theme, "light");
  assert.deepEqual(merged._llm, store);
  assert.deepEqual(stripLlmFromPrefs(merged), { theme: "light", starred: ["a"] });
  assert.equal(Object.hasOwn(stripLlmFromPrefs(merged), "_llm"), false);
  const wipeAttempt = mergePrefsPreservingLlm({ theme: "light", _llm: { accounts: [] } }, existing);
  assert.deepEqual(wipeAttempt._llm, store);
});

test("allowed providers are only OpenAI, Claude and Grok with defaults", () => {
  assert.deepEqual(LLM_PROVIDERS, ["openai", "anthropic", "xai"]);
  assert.equal(defaultModelFor("openai"), "gpt-4.1-mini");
  assert.equal(defaultModelFor("anthropic"), "claude-sonnet-4-5");
  assert.equal(defaultModelFor("xai"), "grok-4.5");
  assert.throws(
    () =>
      applyLlmCommand(store, {
        type: "upsert",
        label: "Gemini",
        key: "gem-key",
        provider: "gemini",
      }),
    /llm_provider/,
  );
});

test("validation persist policy: 401 does not save, 429 saves as quota", () => {
  assert.equal(classifyLlmHttpStatus(401), "auth");
  assert.equal(classifyLlmHttpStatus(403), "auth");
  assert.equal(classifyLlmHttpStatus(429), "quota");
  assert.equal(persistValidatedStatus("auth"), false);
  assert.equal(persistValidatedStatus("error"), false);
  assert.equal(persistValidatedStatus("quota"), true);
  assert.equal(persistValidatedStatus("ok"), true);
});

test("write-guard: LLM account mutations are owner-authenticated server fns", () => {
  const src = read("src/lib/news/llm-server.ts");
  assert.match(src, /authMiddleware/);
  assert.match(src, /context\.userId/);
  assert.match(src, /upsertLlmAccount|saveLlmAccount/);
  assert.match(src, /deleteLlmAccount/);
  assert.match(src, /selectLlmAccount/);
  assert.doesNotMatch(src, /adminHeaders|SUPABASE_SECRET_KEY/);
  assert.doesNotMatch(src, /localStorage/);
});

test("settings slots pick the active account without an email-like label", () => {
  const page = read("src/routes/configuracoes.tsx");
  const ui = readdirSync(join(root, "src/components/news"))
    .filter((name) => name.startsWith("llm-"))
    .map((name) => read(`src/components/news/${name}`))
    .join("\n");
  assert.match(page, /LlmAccountsSettings/);
  assert.match(ui, /Agora usando/);
  assert.match(ui, /Conectar com API/);
  assert.match(ui, /id=["']ia["']/);
  assert.match(ui, /type=["']text["']/);
  assert.doesNotMatch(ui, /type=["']email["']/);
  assert.doesNotMatch(ui, /placeholder=["'][^"']*@[^"']*["']/);
  assert.match(ui, /placeholder=["']Pessoal["']/);
  assert.match(ui, /name=["']agora-llm-label["']/);
  assert.match(ui, /name=["']agora-llm-key["']/);
  assert.match(ui, /autoComplete=["']off["']/);
  assert.doesNotMatch(ui, /new-password/);
  assert.doesNotMatch(ui, /account\.key\b/);
  assert.match(ui, /keyHint/);
  assert.match(ui, /OpenAI/);
  assert.match(ui, /Claude/);
  assert.match(ui, /Grok/);
  assert.match(ui, /aria-label=["']Modelo["']/);
  assert.match(ui, /modelOptionsFor/);
  assert.doesNotMatch(ui, /placeholder=\{defaultModelFor\(provider\)\}/);
  assert.doesNotMatch(ui, /Gemini|Mistral|DeepSeek|Cohere|Groq\b/i);
});

test("upsert then list returns the saved account without live fetch", async () => {
  const { persistLlmAccountThenList } = await import("../src/lib/news/llm-accounts.mjs");
  const listed = persistLlmAccountThenList(emptyLlmStore(), {
    type: "upsert",
    label: "Pessoal",
    key: "sk-test-abcd",
    provider: "openai",
    model: "gpt-4.1-mini",
    status: "ok",
  });
  assert.ok(listed.accounts.length > 0);
  assert.equal(listed.accounts[0].label, "Pessoal");
  assert.equal(listed.accounts[0].provider, "openai");
  assert.equal(listed.accounts[0].model, "gpt-4.1-mini");
  assert.equal(listed.accounts[0].keyHint, "…abcd");
  assert.equal(listed.activeAccountId, listed.accounts[0].id);
  assert.equal(listed.accounts[0].key, undefined);
});

test("askGrok resolves owner/env via resolver, not process.env alone", () => {
  const ask = read("src/lib/news/llm-ask.ts");
  const client = read("src/lib/news/llm-client.mjs");
  const summary = read("src/lib/news/summary-line.ts");
  const server = read("src/lib/news/llm-server.ts");
  assert.match(ask, /resolveLlmRuntime/);
  assert.match(ask, /askProviderLine|llm-client/);
  assert.match(summary, /askGrokLine/);
  assert.match(summary, /from ["']\.\/llm-ask["']/);
  assert.doesNotMatch(summary, /process\.env\.XAI_API_KEY/);
  assert.doesNotMatch(ask, /console\.(log|info|debug).*key/i);
  assert.match(client, /https:\/\/api\.openai\.com\/v1\/chat\/completions/);
  assert.match(client, /https:\/\/api\.anthropic\.com\/v1\/messages/);
  assert.match(client, /https:\/\/api\.x\.ai/);
  assert.match(client, /x-api-key/);
  assert.match(client, /anthropic-version/);
  assert.doesNotMatch(client, /generativelanguage\.googleapis|mistral|deepseek|OPENAI_API_KEY|ANTHROPIC_API_KEY/i);
  assert.match(server, /spendKeyAllowed/);
  assert.match(server, /validateLlmKey/);
  assert.doesNotMatch(server, /OPENAI_API_KEY|ANTHROPIC_API_KEY/);
});
