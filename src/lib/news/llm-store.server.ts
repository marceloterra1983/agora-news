/** Server-only. Keys stay in user_prefs._llm and never ride CloudPrefs to the client. */
import {
  applyLlmCommand,
  LLM_PREFS_KEY,
  type LlmCommand,
  type LlmStore,
} from "./llm-accounts.mjs";
import { openLlmStore, sealLlmStore } from "./llm-crypto.server";
import { readUserPrefsRaw, writeUserPrefsRaw } from "./prefs-store.server";

export async function readLlmStore(userId: string): Promise<LlmStore> {
  const uid = userId.trim();
  if (!uid) throw new Error("prefs_owner_required");
  const raw = await readUserPrefsRaw(uid);
  return openLlmStore(raw?.[LLM_PREFS_KEY], uid);
}

export async function writeLlmStore(userId: string, store: LlmStore): Promise<LlmStore> {
  const uid = userId.trim();
  if (!uid) throw new Error("prefs_owner_required");
  const raw = (await readUserPrefsRaw(uid)) || {};
  raw[LLM_PREFS_KEY] = sealLlmStore(store, uid);
  await writeUserPrefsRaw(uid, raw);
  return store;
}

export async function applyOwnerLlmCommand(userId: string, command: LlmCommand): Promise<LlmStore> {
  const uid = userId.trim();
  if (!uid) throw new Error("prefs_owner_required");
  return writeLlmStore(uid, applyLlmCommand(await readLlmStore(uid), command));
}
