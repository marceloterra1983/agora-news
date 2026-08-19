/** Contas OpenAI / Claude / Grok do owner. Cron sem sessão usa só o env Grok. */

export const LLM_PREFS_KEY = "_llm";
export const LLM_PROVIDERS = ["openai", "anthropic", "xai"];
export const LLM_PROVIDER_LABELS = { openai: "OpenAI", anthropic: "Claude", xai: "Grok" };
export const DEFAULT_MODELS = {
  openai: "gpt-4.1-mini",
  anthropic: "claude-sonnet-4-5",
  xai: "grok-4.5",
};
export const DEFAULT_XAI_MODEL = DEFAULT_MODELS.xai;

export function isLlmProvider(value) {
  return LLM_PROVIDERS.includes(value);
}

export function defaultModelFor(provider) {
  return DEFAULT_MODELS[provider] || DEFAULT_XAI_MODEL;
}

export function providerLabel(provider) {
  return LLM_PROVIDER_LABELS[provider] || LLM_PROVIDER_LABELS.xai;
}

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

export function emptyLlmStore() {
  return { activeAccountId: null, accounts: [], envStatus: null, envCheckedAt: null };
}

function clip(value, max) {
  return String(value || "").trim().slice(0, max);
}

function asStatus(status) {
  return status === "auth" || status === "quota" || status === "error" || status === "ok" ? status : "ok";
}

function asAccount(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = clip(raw.id, 64);
  const key = String(raw.key || "").trim();
  if (!id || !key) return null;
  if (raw.provider && !isLlmProvider(raw.provider)) return null;
  const provider = isLlmProvider(raw.provider) ? raw.provider : "xai";
  return {
    id,
    label: clip(raw.label, 48) || providerLabel(provider),
    provider,
    model: clip(raw.model, 64) || defaultModelFor(provider),
    key,
    status: asStatus(raw.status),
    checkedAt: typeof raw.checkedAt === "string" ? raw.checkedAt : null,
  };
}

export function parseLlmStore(raw) {
  const empty = emptyLlmStore();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return empty;
  const accounts = Array.isArray(raw.accounts)
    ? raw.accounts.map(asAccount).filter(Boolean)
    : [];
  const active = clip(raw.activeAccountId, 64);
  const envStatus = raw.envStatus;
  return {
    activeAccountId: accounts.some((a) => a.id === active) ? active : accounts[0]?.id || null,
    accounts,
    envStatus:
      envStatus === "auth" || envStatus === "quota" || envStatus === "error" || envStatus === "ok"
        ? envStatus
        : null,
    envCheckedAt: typeof raw.envCheckedAt === "string" ? raw.envCheckedAt : null,
  };
}

export function publicLlmPrefs(store, env = {}) {
  const parsed = parseLlmStore(store);
  return {
    activeAccountId: parsed.activeAccountId,
    accounts: parsed.accounts.map(({ key: _key, ...row }) => ({
      ...row,
      keyHint: maskKey(_key),
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
    if (active?.key) {
      return {
        source: "account",
        provider: active.provider,
        key: active.key,
        model: active.model,
        accountId: active.id,
      };
    }
  }
  const key = envLlmKey(env);
  if (key) return { source: "env", provider: "xai", key, model: DEFAULT_XAI_MODEL, accountId: null };
  return { source: "none", provider: "xai", key: "", model: DEFAULT_XAI_MODEL, accountId: null };
}

export function classifyLlmHttpStatus(status) {
  const n = Number(status);
  if (n === 401 || n === 403) return "auth";
  if (n === 429 || n === 402) return "quota";
  if (n >= 400) return "error";
  return "ok";
}

export function llmWarningFor(status, { hasAccount = false, hasEnv = false } = {}) {
  if (status === "auth") {
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
    const nextAccount = {
      id,
      label,
      provider,
      model: clip(command.model, 64) || prev?.model || defaultModelFor(provider),
      key: key || prev.key,
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
  throw new Error("llm_command_unknown");
}
