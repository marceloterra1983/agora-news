import type { LlmAccountPublic, LlmPrefsPublic, LlmProvider, LlmAuthKind, LlmUpsertResult } from "./llm-accounts.mjs";

export type LlmSlot = {
  provider: LlmProvider;
  account: LlmAccountPublic | null;
  connected: boolean;
};

export function defaultAccountLabel(provider: string, authKind?: LlmAuthKind | string): string;
export function modelLabelFor(provider: string, modelId: string): string;
export function connectionLine(account: LlmAccountPublic | null | undefined): string;
export function slotsFromPublic(prefs: LlmPrefsPublic | null | undefined): LlmSlot[];
export function activeChoices(prefs: LlmPrefsPublic | null | undefined): LlmAccountPublic[];
export function settingsBanner(prefs: LlmPrefsPublic | null | undefined): string;
export function saveFeedback(result: Pick<LlmUpsertResult, "saved" | "validateWarning"> | null | undefined): {
  ok: boolean;
  text: string;
};
