import type { LlmProvider, LlmStatus } from "./llm-accounts.mjs";

export const LLM_SYSTEM: string;

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

export function validateWarningFor(status: LlmStatus | string): string | null;
export function validationRequest(
  provider: LlmProvider | string,
  key: string,
  model?: string,
): { url: string; init: RequestInit };
export function chatRequests(
  provider: LlmProvider | string,
  model: string,
  key: string,
  prompt: string,
  system?: string,
): Array<{ url: string; init: RequestInit }>;
export function validateLlmKey(input: {
  provider: LlmProvider | string;
  key: string;
  model?: string;
  fetchImpl?: typeof fetch;
}): Promise<LlmValidateResult>;
export function askProviderLine(input: {
  provider: LlmProvider | string;
  model: string;
  key: string;
  prompt: string;
  fetchImpl?: typeof fetch;
  system?: string;
}): Promise<LlmAskResult>;
