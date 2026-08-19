import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  applyLlmCommand,
  classifyLlmHttpStatus,
  envLlmKey,
  llmWarningFor,
  maskKey,
  mergePrefsPreservingLlm,
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

test("resolveLlmRuntime prefers the owner active account over env", () => {
  const env = { XAI_API_KEY: "env-key-zzzz", GROK_API_KEY: "" };
  const fromAccount = resolveLlmRuntime({ store, env, userId: "owner-1" });
  assert.equal(fromAccount.source, "account");
  assert.equal(fromAccount.key, secret);
  assert.equal(fromAccount.model, "grok-4.5");
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
    label: "xAI trabalho",
    key: "other-key-wxyz",
    id: "acc-2",
  });
  assert.equal(two.activeAccountId, "acc-1");
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

test("settings expose the IA accounts section without echoing the key", () => {
  const page = read("src/routes/configuracoes.tsx");
  const ui = read("src/components/news/llm-accounts-settings.tsx");
  assert.match(page, /LlmAccountsSettings/);
  assert.match(ui, /Contas de IA/);
  assert.match(ui, /Usar esta/);
  assert.match(ui, /type=["']password["']/);
  assert.doesNotMatch(ui, /account\.key\b/);
  assert.match(ui, /keyHint/);
});

test("askGrok resolves owner/env via resolver, not process.env alone", () => {
  const ask = read("src/lib/news/llm-ask.ts");
  const summary = read("src/lib/news/summary-line.ts");
  assert.match(ask, /resolveLlmRuntime/);
  assert.match(summary, /askGrokLine/);
  assert.match(summary, /from ["']\.\/llm-ask["']/);
  assert.doesNotMatch(summary, /process\.env\.XAI_API_KEY/);
  assert.doesNotMatch(ask, /console\.(log|info|debug).*key/i);
});
