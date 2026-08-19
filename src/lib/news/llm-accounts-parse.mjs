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

export function emptyLlmStore() {
  return {
    activeAccountId: null,
    accounts: [],
    envStatus: null,
    envCheckedAt: null,
    pendingOauth: null,
  };
}

export function clip(value, max) {
  return String(value || "").trim().slice(0, max);
}

export function asStatus(status) {
  return status === "auth" || status === "quota" || status === "error" || status === "ok" ? status : "ok";
}

function asAuthKind(value) {
  return value === "oauth" ? "oauth" : "api";
}

function asAccount(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = clip(raw.id, 64);
  const key = String(raw.key || "").trim();
  const refreshToken = String(raw.refreshToken || "").trim();
  const authKind = asAuthKind(raw.authKind);
  if (!id) return null;
  if (authKind === "api" && !key) return null;
  if (authKind === "oauth" && !key && !refreshToken) return null;
  if (raw.provider && !isLlmProvider(raw.provider)) return null;
  const provider = isLlmProvider(raw.provider) ? raw.provider : "xai";
  return {
    id,
    label: clip(raw.label, 48) || providerLabel(provider),
    provider,
    model: clip(raw.model, 64) || defaultModelFor(provider),
    authKind,
    key,
    refreshToken,
    expiresAt: typeof raw.expiresAt === "string" ? raw.expiresAt : null,
    status: asStatus(raw.status),
    checkedAt: typeof raw.checkedAt === "string" ? raw.checkedAt : null,
  };
}

function asPendingOauth(raw) {
  if (!raw || typeof raw !== "object") return null;
  const state = clip(raw.state, 128);
  const codeVerifier = String(raw.codeVerifier || "").trim();
  if (!state || !codeVerifier || !isLlmProvider(raw.provider)) return null;
  return {
    provider: raw.provider,
    state,
    codeVerifier,
    label: clip(raw.label, 48),
    model: clip(raw.model, 64),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : null,
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
    pendingOauth: asPendingOauth(raw.pendingOauth),
  };
}
