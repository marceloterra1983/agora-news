import type { LlmProvider } from "./llm-accounts.mjs";

export type LlmSubscriptionAuth = {
  available: boolean;
  reason: string | null;
  hint?: string;
};

export function subscriptionAuthFor(provider: LlmProvider | string): LlmSubscriptionAuth;
