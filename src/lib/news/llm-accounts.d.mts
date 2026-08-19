export const LLM_PREFS_KEY: "_llm";
export const DEFAULT_XAI_MODEL: "grok-4.5";

export type LlmProvider = "xai";
export type LlmStatus = "ok" | "auth" | "quota" | "error";
export type LlmSource = "account" | "env" | "none";

export type LlmAccount = {
  id: string;
  label: string;
  provider: LlmProvider;
  model: string;
  key: string;
  status: LlmStatus;
  checkedAt: string | null;
};

export type LlmStore = {
  activeAccountId: string | null;
  accounts: LlmAccount[];
  envStatus: LlmStatus | null;
  envCheckedAt: string | null;
};

export type LlmAccountPublic = Omit<LlmAccount, "key"> & { keyHint: string };

export type LlmPrefsPublic = {
  activeAccountId: string | null;
  accounts: LlmAccountPublic[];
  envFallback: boolean;
  envStatus: LlmStatus | null;
  envCheckedAt: string | null;
};

export type LlmRuntime = {
  source: LlmSource;
  key: string;
  model: string;
  accountId: string | null;
};

export type LlmCommand =
  | { type: "upsert"; id?: string; label: string; key?: string; model?: string }
  | { type: "delete"; id: string }
  | { type: "select"; id: string | null }
  | {
      type: "status";
      target: "account" | "env";
      accountId?: string;
      status: LlmStatus | "none";
      checkedAt?: string;
    };

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
  opts?: { hasAccount?: boolean; hasEnv?: boolean },
): string;
export function stripLlmFromPrefs<T>(prefs: T): T;
export function mergePrefsPreservingLlm<T extends object>(incoming: T, existing: unknown): T & {
  [LLM_PREFS_KEY]?: unknown;
};
export function applyLlmCommand(store: unknown, command: LlmCommand): LlmStore;
