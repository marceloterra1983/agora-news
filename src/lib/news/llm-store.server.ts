/** Server-only. Keys stay in user_prefs._llm and never ride CloudPrefs to the client. */
import {
  applyLlmCommand,
  LLM_PREFS_KEY,
  parseLlmStore,
  type LlmCommand,
  type LlmStore,
} from "./llm-accounts.mjs";
import { readUserPrefsRaw, writeUserPrefsRaw } from "./prefs-store.server";

export async function readLlmStore(userId: string): Promise<LlmStore> {
  const raw = await readUserPrefsRaw(userId);
  return parseLlmStore(raw?.[LLM_PREFS_KEY]);
}

export async function writeLlmStore(userId: string, store: LlmStore): Promise<LlmStore> {
  const raw = (await readUserPrefsRaw(userId)) || {};
  raw[LLM_PREFS_KEY] = store;
  await writeUserPrefsRaw(userId, raw);
  return store;
}

export async function applyOwnerLlmCommand(userId: string, command: LlmCommand): Promise<LlmStore> {
  const uid = userId.trim();
  if (!uid) throw new Error("prefs_owner_required");
  return writeLlmStore(uid, applyLlmCommand(await readLlmStore(uid), command));
}
