import type { LlmProvider } from "./llm-accounts.mjs";

export type LlmModelOption = { id: string; label: string };

export const LLM_MODEL_CATALOG: Record<LlmProvider, readonly LlmModelOption[]>;

export function catalogModelsFor(provider: string): LlmModelOption[];
export function isUsefulChatModel(provider: string, id: string): boolean;
export function parseRemoteModelIds(provider: string, payload: unknown): string[];
export function mergeModelOptions(provider: string, remoteIds?: string[], selectedId?: string): LlmModelOption[];
export function modelOptionsFor(provider: string, selectedId?: string): LlmModelOption[];
