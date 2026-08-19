/** Contas OpenAI / Claude / Grok do owner. Cron sem sessão usa só o env Grok. */

export {
  catalogModelsFor,
  LLM_MODEL_CATALOG,
  mergeModelOptions,
  modelOptionsFor,
} from "./llm-models.mjs";

export {
  DEFAULT_MODELS,
  DEFAULT_XAI_MODEL,
  defaultModelFor,
  emptyLlmStore,
  isLlmProvider,
  LLM_PREFS_KEY,
  LLM_PROVIDER_LABELS,
  LLM_PROVIDERS,
  parseLlmStore,
  providerLabel,
} from "./llm-accounts-parse.mjs";

import {
  asStatus,
  clip,
  defaultModelFor,
  DEFAULT_XAI_MODEL,
  isLlmProvider,
  LLM_PREFS_KEY,
  parseLlmStore,
} from "./llm-accounts-parse.mjs";

export function persistValidatedStatus(status) {
  return status === "ok" || status === "quota";
}

export function maskKey(key) {
  const k = String(key || "").trim();
  if (!k) return "";
  return `…${k.slice(-4)}`;
}

export function envLlmKey(env = {}) {
  return String(env.XAI_API_KEY || env.GROK_API_KEY || "").trim();
}

export function publicLlmPrefs(store, env = {}) {
  const parsed = parseLlmStore(store);
  return {
    activeAccountId: parsed.activeAccountId,
    accounts: parsed.accounts.map(({ key: _key, refreshToken: _refresh, ...row }) => ({
      ...row,
      keyHint: maskKey(_key || _refresh),
    })),
    envFallback: Boolean(envLlmKey(env)),
    envStatus: parsed.envStatus,
    envCheckedAt: parsed.envCheckedAt,
  };
}

/**
 * Com userId: conta ativa do owner (qualquer um dos 3), senão env Grok.
 * Sem userId (cron/ingest): só env. Não inventar multi-tenant no cron.
 */
export function resolveLlmRuntime({ store, env = {}, userId = "" } = {}) {
  const parsed = parseLlmStore(store);
  if (userId) {
    const active = parsed.accounts.find((a) => a.id === parsed.activeAccountId);
    if (active && (active.key || (active.authKind === "oauth" && active.refreshToken))) {
      return {
        source: "account",
        provider: active.provider,
        key: active.key,
        model: active.model,
        accountId: active.id,
        authKind: active.authKind,
        refreshToken: active.refreshToken,
        expiresAt: active.expiresAt,
      };
    }
  }
  const key = envLlmKey(env);
  if (key) {
    return {
      source: "env",
      provider: "xai",
      key,
      model: DEFAULT_XAI_MODEL,
      accountId: null,
      authKind: "api",
      refreshToken: "",
      expiresAt: null,
    };
  }
  return {
    source: "none",
    provider: "xai",
    key: "",
    model: DEFAULT_XAI_MODEL,
    accountId: null,
    authKind: "api",
    refreshToken: "",
    expiresAt: null,
  };
}

export function classifyLlmHttpStatus(status) {
  const n = Number(status);
  if (n === 401 || n === 403) return "auth";
  if (n === 429 || n === 402) return "quota";
  if (n >= 400) return "error";
  return "ok";
}

export function llmWarningFor(status, { hasAccount = false, hasEnv = false, authKind = "api" } = {}) {
  if (status === "auth") {
    if (authKind === "oauth") {
      return "A assinatura de IA foi recusada ou expirou. Reconecte em Configurações.";
    }
    return "A conta de IA foi recusada (chave inválida ou sem permissão). Troque a chave em Configurações.";
  }
  if (status === "quota") {
    return "A conta de IA estourou o limite ou a assinatura expirou. Troque de conta em Configurações.";
  }
  if (status === "none") {
    if (!hasAccount && !hasEnv) {
      return "Nenhuma conta de IA cadastrada e o servidor não tem chave. Cadastre OpenAI, Claude ou Grok em Configurações.";
    }
    return "Nenhuma chave de IA disponível agora. Cadastre ou selecione uma conta em Configurações.";
  }
  return "A conta de IA falhou agora. Tente de novo ou troque de conta em Configurações.";
}

export function stripLlmFromPrefs(prefs) {
  if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) return prefs;
  const next = { ...prefs };
  delete next[LLM_PREFS_KEY];
  return next;
}

export function mergePrefsPreservingLlm(incoming, existing) {
  const next = { ...incoming };
  if (
    existing &&
    typeof existing === "object" &&
    Object.hasOwn(existing, LLM_PREFS_KEY) &&
    !Object.hasOwn(incoming, LLM_PREFS_KEY)
  ) {
    next[LLM_PREFS_KEY] = existing[LLM_PREFS_KEY];
  }
  return next;
}

function withActive(store) {
  if (store.activeAccountId && store.accounts.some((a) => a.id === store.activeAccountId)) {
    return store;
  }
  return { ...store, activeAccountId: store.accounts[0]?.id || null };
}

export function persistLlmAccountThenList(store, command, env = {}) {
  return publicLlmPrefs(applyLlmCommand(store, command), env);
}

export function applyLlmCommand(store, command) {
  const current = parseLlmStore(store);
  if (command.type === "upsert") {
    const key = String(command.key || "").trim();
    const id = clip(command.id, 64) || globalThis.crypto.randomUUID();
    const prev = current.accounts.find((a) => a.id === id);
    if (!prev && !key) throw new Error("llm_key_required");
    const label = clip(command.label, 48);
    if (!label) throw new Error("llm_label_required");
    if (command.provider != null && command.provider !== "" && !isLlmProvider(command.provider)) {
      throw new Error("llm_provider_invalid");
    }
    const provider = isLlmProvider(command.provider) ? command.provider : prev?.provider || "xai";
    const authKind =
      command.authKind === "oauth" || command.authKind === "api"
        ? command.authKind
        : prev?.authKind === "oauth"
          ? "oauth"
          : "api";
    const refreshToken =
      command.refreshToken != null && String(command.refreshToken).trim()
        ? String(command.refreshToken).trim()
        : prev?.refreshToken || "";
    const nextAccount = {
      id,
      label,
      provider,
      authKind,
      model: clip(command.model, 64) || prev?.model || defaultModelFor(provider),
      key: key || prev.key,
      refreshToken,
      expiresAt: command.expiresAt !== undefined ? command.expiresAt : prev?.expiresAt || null,
      status: command.status ? asStatus(command.status) : key && key !== prev?.key ? "ok" : prev?.status || "ok",
      checkedAt: key && key !== prev?.key ? new Date().toISOString() : prev?.checkedAt || null,
    };
    const accounts = prev
      ? current.accounts.map((a) => (a.id === id ? nextAccount : a))
      : [...current.accounts, nextAccount];
    return withActive({ ...current, accounts, activeAccountId: current.activeAccountId || id });
  }
  if (command.type === "delete") {
    const accounts = current.accounts.filter((a) => a.id !== command.id);
    const activeAccountId =
      current.activeAccountId === command.id ? accounts[0]?.id || null : current.activeAccountId;
    return { ...current, accounts, activeAccountId };
  }
  if (command.type === "select") {
    if (command.id && !current.accounts.some((a) => a.id === command.id)) {
      throw new Error("llm_account_missing");
    }
    return { ...current, activeAccountId: command.id || null };
  }
  if (command.type === "status") {
    const checkedAt = command.checkedAt || new Date().toISOString();
    if (command.target === "env") {
      return { ...current, envStatus: command.status, envCheckedAt: checkedAt };
    }
    return {
      ...current,
      accounts: current.accounts.map((a) =>
        a.id === command.accountId ? { ...a, status: command.status, checkedAt } : a,
      ),
    };
  }
  if (command.type === "oauth-pending") {
    if (!isLlmProvider(command.provider)) throw new Error("llm_provider_invalid");
    const state = clip(command.state, 128);
    const codeVerifier = String(command.codeVerifier || "").trim();
    if (!state || !codeVerifier) throw new Error("llm_oauth_pending");
    return {
      ...current,
      pendingOauth: {
        provider: command.provider,
        state,
        codeVerifier,
        label: clip(command.label, 48),
        model: clip(command.model, 64) || defaultModelFor(command.provider),
        createdAt: command.createdAt || new Date().toISOString(),
      },
    };
  }
  if (command.type === "oauth-clear-pending") {
    return { ...current, pendingOauth: null };
  }
  if (command.type === "tokens") {
    return {
      ...current,
      accounts: current.accounts.map((a) =>
        a.id === command.accountId
          ? {
              ...a,
              key: String(command.key || a.key).trim() || a.key,
              refreshToken: String(command.refreshToken || a.refreshToken || "").trim() || a.refreshToken,
              expiresAt: command.expiresAt !== undefined ? command.expiresAt : a.expiresAt,
            }
          : a,
      ),
    };
  }
  throw new Error("llm_command_unknown");
}
