import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  applyLlmCommand,
  emptyLlmStore,
  LLM_PROVIDERS,
  mergePrefsPreservingLlm,
  persistLlmAccountThenList,
  publicLlmPrefs,
} from "../src/lib/news/llm-accounts.mjs";
import {
  activeChoices,
  defaultAccountLabel,
  saveFeedback,
  settingsBanner,
  slotsFromPublic,
} from "../src/lib/news/llm-slots.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

function llmUiSource() {
  const dir = join(root, "src/components/news");
  return readdirSync(dir)
    .filter((name) => name.startsWith("llm-"))
    .map((name) => read(`src/components/news/${name}`))
    .join("\n");
}

function prefsWith(accounts, extra = {}) {
  return publicLlmPrefs(
    {
      activeAccountId: accounts[0]?.id || null,
      accounts,
      envStatus: null,
      envCheckedAt: null,
      pendingOauth: null,
    },
    extra.env || {},
  );
}

test("slots expose one row per provider and keep a single account each", () => {
  const store = applyLlmCommand(emptyLlmStore(), {
    type: "upsert",
    id: "o1",
    label: "OpenAI",
    key: "sk-live-abcd",
    provider: "openai",
    model: "gpt-4.1-mini",
    status: "ok",
  });
  const listed = publicLlmPrefs(store, {});
  const slots = slotsFromPublic(listed);
  assert.deepEqual(
    slots.map((row) => row.provider),
    LLM_PROVIDERS,
  );
  assert.equal(slots.filter((row) => row.connected).length, 1);
  assert.equal(slots.find((row) => row.provider === "openai")?.account?.keyHint, "…abcd");
  assert.equal(slots.find((row) => row.provider === "anthropic")?.connected, false);

  const replaced = applyLlmCommand(store, {
    type: "upsert",
    label: "OpenAI",
    key: "sk-live-wxyz",
    provider: "openai",
    status: "ok",
  });
  assert.equal(replaced.accounts.length, 1);
  assert.equal(replaced.accounts[0].key, "sk-live-wxyz");
  assert.equal(replaced.accounts[0].id, "o1");
});

test("active selection lists only usable connections", () => {
  const store = applyLlmCommand(emptyLlmStore(), {
    type: "upsert",
    id: "o1",
    label: "OpenAI",
    key: "sk-ok-abcd",
    provider: "openai",
    status: "ok",
  });
  const withFail = applyLlmCommand(store, {
    type: "upsert",
    id: "c1",
    label: "Claude",
    key: "ant-bad",
    provider: "anthropic",
    status: "auth",
  });
  const pub = publicLlmPrefs(withFail, {});
  const choices = activeChoices(pub);
  assert.equal(choices.length, 1);
  assert.equal(choices[0].provider, "openai");
  const selected = applyLlmCommand(withFail, { type: "select", id: "o1" });
  assert.equal(selected.activeAccountId, "o1");
});

test("banner disappears when a valid account or env exists", () => {
  const empty = prefsWith([], {});
  assert.match(settingsBanner(empty), /Nenhuma conta/i);

  const withEnv = prefsWith([], { env: { XAI_API_KEY: "env-xxxx" } });
  assert.equal(settingsBanner(withEnv), "");

  const ok = prefsWith([
    {
      id: "o1",
      label: "OpenAI",
      provider: "openai",
      model: "gpt-4.1-mini",
      key: "sk-ok-abcd",
      status: "ok",
      authKind: "api",
    },
  ]);
  assert.equal(settingsBanner(ok), "");
});

test("save feedback is explicit in PT-BR and hydrate helper returns the new list", () => {
  const listed = persistLlmAccountThenList(emptyLlmStore(), {
    type: "upsert",
    label: "Pessoal",
    key: "sk-test-abcd",
    provider: "openai",
    model: "gpt-4.1-mini",
    status: "ok",
  });
  assert.ok(listed.accounts.length > 0);
  assert.equal(listed.accounts[0].keyHint, "…abcd");
  assert.equal(listed.activeAccountId, listed.accounts[0].id);

  const ok = saveFeedback({
    ...listed,
    saved: true,
    validateStatus: "ok",
    validateWarning: null,
  });
  assert.equal(ok.ok, true);
  assert.match(ok.text, /gravada|conectado/i);

  const fail = saveFeedback({
    ...listed,
    saved: false,
    validateStatus: "auth",
    validateWarning: "A chave foi recusada (inválida ou sem permissão). Nada foi cadastrado.",
  });
  assert.equal(fail.ok, false);
  assert.match(fail.text, /recusada|cadastrado/i);
});

test("oauth and api kinds stay on the slot store", () => {
  const oauth = applyLlmCommand(emptyLlmStore(), {
    type: "upsert",
    label: defaultAccountLabel("anthropic", "oauth"),
    provider: "anthropic",
    authKind: "oauth",
    key: "sk-ant-oat01-zzzz",
    refreshToken: "sk-ant-ort01-yyyy",
    status: "ok",
  });
  assert.equal(oauth.accounts[0].authKind, "oauth");
  const pub = publicLlmPrefs(oauth, {});
  const slot = slotsFromPublic(pub).find((row) => row.provider === "anthropic");
  assert.equal(slot?.account?.authKind, "oauth");
  assert.equal(slot?.account?.keyHint, "…zzzz");
  assert.equal(JSON.stringify(pub).includes("yyyy"), false);
});

test("incoming empty _llm must not wipe the server secret blob", () => {
  const existing = {
    theme: "dark",
    _llm: {
      activeAccountId: "o1",
      accounts: [{ id: "o1", label: "OpenAI", provider: "openai", model: "gpt-4.1-mini", key: "sk-keep-abcd" }],
    },
  };
  const merged = mergePrefsPreservingLlm({ theme: "light", _llm: { accounts: [] } }, existing);
  assert.equal(merged.theme, "light");
  assert.equal(merged._llm.accounts[0].key, "sk-keep-abcd");
});

test("settings UI is three provider slots, not a login form", () => {
  const ui = llmUiSource();
  const settings = read("src/components/news/llm-accounts-settings.tsx");
  const server = read("src/lib/news/llm-server.ts");
  assert.match(ui, /Agora usando/);
  assert.match(ui, /Conectar com API/);
  assert.match(ui, /Conectar assinatura/);
  assert.match(ui, /Desconectar/);
  assert.match(ui, /name=["']agora-llm-key["']/);
  assert.match(ui, /autoComplete=["']off["']/);
  assert.doesNotMatch(ui, /new-password/);
  assert.doesNotMatch(ui, /type=["']email["']/);
  assert.doesNotMatch(ui, /placeholder=["'][^"']*@[^"']*["']/);
  assert.match(ui, /placeholder=["']Pessoal["']/);
  assert.match(ui, /name=["']agora-llm-label["']/);
  assert.match(ui, /Cole o código/);
  assert.match(ui, />1\.</);
  assert.match(settings, /listLlmAccounts/);
  assert.match(settings, /upsertLlmAccount[\s\S]*listLlmAccounts|listLlmAccounts/);
  assert.match(server, /startLlmOauth|completeLlmOauth/);
  assert.doesNotMatch(ui, /chatgpt\.com\/login/);
  assert.doesNotMatch(ui, /document\.cookie/);
  assert.doesNotMatch(`${ui}\n${server}`, /fetch\([^)]*chatgpt\.com/i);
});
