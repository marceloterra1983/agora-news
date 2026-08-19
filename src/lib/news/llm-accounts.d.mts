export const LLM_PREFS_KEY: "_llm";
export const LLM_PROVIDERS: readonly ["openai", "anthropic", "xai"];
export const LLM_PROVIDER_LABELS: { openai: "OpenAI"; anthropic: "Claude"; xai: "Grok" };
export const DEFAULT_MODELS: { openai: "gpt-4.1-mini"; anthropic: "claude-sonnet-4-5"; xai: "grok-4.5" };
export const DEFAULT_XAI_MODEL: "grok-4.5";

export type LlmProvider = "openai" | "anthropic" | "xai";
export type LlmStatus = "ok" | "auth" | "quota" | "error";
export type LlmSource = "account" | "env" | "none";
export type LlmAuthKind = "api" | "oauth";

export type LlmAccount = {
  id: string;
  label: string;
  provider: LlmProvider;
  model: string;
  authKind: LlmAuthKind;
  key: string;
  refreshToken: string;
  expiresAt: string | null;
  status: LlmStatus;
  checkedAt: string | null;
};

export type LlmPendingOauth = {
  provider: LlmProvider;
  state: string;
  codeVerifier: string;
  label: string;
  model: string;
  createdAt: string | null;
};

export type LlmStore = {
  activeAccountId: string | null;
  accounts: LlmAccount[];
  envStatus: LlmStatus | null;
  envCheckedAt: string | null;
  pendingOauth: LlmPendingOauth | null;
};

export type LlmAccountPublic = Omit<LlmAccount, "key" | "refreshToken"> & { keyHint: string };

export type LlmPrefsPublic = {
  activeAccountId: string | null;
  accounts: LlmAccountPublic[];
  envFallback: boolean;
  envStatus: LlmStatus | null;
  envCheckedAt: string | null;
};

export type LlmUpsertResult = LlmPrefsPublic & {
  saved: boolean;
  validateStatus: LlmStatus;
  validateWarning: string | null;
};

export type LlmRuntime = {
  source: LlmSource;
  provider: LlmProvider;
  key: string;
  model: string;
  accountId: string | null;
  authKind: LlmAuthKind;
  refreshToken: string;
  expiresAt: string | null;
};

export type LlmCommand =
  | {
      type: "upsert";
      id?: string;
      label: string;
      key?: string;
      model?: string;
      provider?: LlmProvider | string;
      authKind?: LlmAuthKind;
      refreshToken?: string;
      expiresAt?: string | null;
      status?: LlmStatus;
    }
  | { type: "delete"; id: string }
  | { type: "select"; id: string | null }
  | {
      type: "status";
      target: "account" | "env";
      accountId?: string;
      status: LlmStatus | "none";
      checkedAt?: string;
    }
  | {
      type: "oauth-pending";
      provider: LlmProvider | string;
      state: string;
      codeVerifier: string;
      label?: string;
      model?: string;
      createdAt?: string;
    }
  | { type: "oauth-clear-pending" }
  | {
      type: "tokens";
      accountId: string;
      key?: string;
      refreshToken?: string;
      expiresAt?: string | null;
    };

export type LlmModelOption = { id: string; label: string };
export const LLM_MODEL_CATALOG: Record<LlmProvider, readonly LlmModelOption[]>;
export function catalogModelsFor(provider: string): LlmModelOption[];
export function mergeModelOptions(provider: string, remoteIds?: string[], selectedId?: string): LlmModelOption[];
export function modelOptionsFor(provider: string, selectedId?: string): LlmModelOption[];
export function isLlmProvider(value: unknown): value is LlmProvider;
export function defaultModelFor(provider: string): string;
export function providerLabel(provider: string): string;
export function persistValidatedStatus(status: LlmStatus | string): boolean;
export function maskKey(key: string): string;
export function envLlmKey(env?: Record<string, string | undefined>): string;
export function emptyLlmStore(): LlmStore;
export function parseLlmStore(raw: unknown): LlmStore;
export function publicLlmPrefs(store: unknown, env?: Record<string, string | undefined>): LlmPrefsPublic;
export function resolveLlmRuntime(input?: {
  store?: unknown;
  env?: Record<string, string | undefined>;
  userId?: string;
}): LlmRuntime;
export function classifyLlmHttpStatus(status: number): LlmStatus;
export function llmWarningFor(
  status: LlmStatus | "none",
  opts?: { hasAccount?: boolean; hasEnv?: boolean; authKind?: LlmAuthKind },
): string;
export function stripLlmFromPrefs<T>(prefs: T): T;
export function mergePrefsPreservingLlm<T extends object>(incoming: T, existing: unknown): T & {
  [LLM_PREFS_KEY]?: unknown;
};
export function persistLlmAccountThenList(
  store: unknown,
  command: LlmCommand,
  env?: Record<string, string | undefined>,
): LlmPrefsPublic;
export function applyLlmCommand(store: unknown, command: LlmCommand): LlmStore;
