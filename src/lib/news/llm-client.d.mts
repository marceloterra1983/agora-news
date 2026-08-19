import type { LlmAuthKind, LlmProvider, LlmStatus } from "./llm-accounts.mjs";

export const LLM_SYSTEM: string;
export const CLAUDE_CODE_IDENTITY: string;

export type LlmValidateResult = {
  status: LlmStatus;
  persist: boolean;
  warning: string | null;
};

export type LlmAskResult = {
  line: string;
  status: LlmStatus;
  httpStatus: number;
};

export type LlmModelOption = { id: string; label: string };

export type LlmModelListResult = {
  source: "catalog" | "live";
  models: LlmModelOption[];
};

export function validateWarningFor(status: LlmStatus | string): string | null;
export function providerAuthHeaders(
  provider: LlmProvider | string,
  key: string,
  authKind?: LlmAuthKind | string,
): Record<string, string>;
export function modelsListRequest(
  provider: LlmProvider | string,
  key: string,
  authKind?: LlmAuthKind | string,
): { url: string; init: RequestInit };
export function validationRequest(
  provider: LlmProvider | string,
  key: string,
  model?: string,
  authKind?: LlmAuthKind | string,
): { url: string; init: RequestInit };
export function listProviderModels(input: {
  provider: LlmProvider | string;
  key?: string;
  selectedId?: string;
  authKind?: LlmAuthKind | string;
  fetchImpl?: typeof fetch;
}): Promise<LlmModelListResult>;
export function chatRequests(
  provider: LlmProvider | string,
  model: string,
  key: string,
  prompt: string,
  system?: string,
  authKind?: LlmAuthKind | string,
): Array<{ url: string; init: RequestInit }>;
export function validateLlmKey(input: {
  provider: LlmProvider | string;
  key: string;
  model?: string;
  authKind?: LlmAuthKind | string;
  fetchImpl?: typeof fetch;
}): Promise<LlmValidateResult>;
export function askProviderLine(input: {
  provider: LlmProvider | string;
  model: string;
  key: string;
  prompt: string;
  fetchImpl?: typeof fetch;
  system?: string;
  authKind?: LlmAuthKind | string;
}): Promise<LlmAskResult>;
export function askProviderLineWithRefresh(input: {
  provider: LlmProvider | string;
  model: string;
  key: string;
  prompt: string;
  fetchImpl?: typeof fetch;
  system?: string;
  authKind?: LlmAuthKind | string;
  refreshToken?: string;
  persistTokens?: (tokens: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string | null;
  }) => Promise<void> | void;
}): Promise<LlmAskResult>;
