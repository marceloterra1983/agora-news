import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { publicLlmPrefs, type LlmPrefsPublic } from "./llm-accounts.mjs";

function envSnapshot() {
  return {
    XAI_API_KEY: process.env.XAI_API_KEY,
    GROK_API_KEY: process.env.GROK_API_KEY,
  };
}

export const listLlmAccounts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LlmPrefsPublic> => {
    const { readLlmStore } = await import("./llm-store.server");
    return publicLlmPrefs(await readLlmStore(context.userId), envSnapshot());
  });

export const upsertLlmAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string; label: string; key?: string; model?: string }) => ({
    id: String(input.id || "").trim() || undefined,
    label: String(input.label || "").trim(),
    key: String(input.key || "").trim() || undefined,
    model: String(input.model || "").trim() || undefined,
  }))
  .handler(async ({ data, context }): Promise<LlmPrefsPublic> => {
    const { applyOwnerLlmCommand } = await import("./llm-store.server");
    const store = await applyOwnerLlmCommand(context.userId, { type: "upsert", ...data });
    return publicLlmPrefs(store, envSnapshot());
  });

export const deleteLlmAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string }) => ({ id: String(input.id || "").trim() }))
  .handler(async ({ data, context }): Promise<LlmPrefsPublic> => {
    const { applyOwnerLlmCommand } = await import("./llm-store.server");
    const store = await applyOwnerLlmCommand(context.userId, { type: "delete", id: data.id });
    return publicLlmPrefs(store, envSnapshot());
  });

export const selectLlmAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id: string | null }) => ({
    id: input.id == null ? null : String(input.id).trim() || null,
  }))
  .handler(async ({ data, context }): Promise<LlmPrefsPublic> => {
    const { applyOwnerLlmCommand } = await import("./llm-store.server");
    const store = await applyOwnerLlmCommand(context.userId, { type: "select", id: data.id });
    return publicLlmPrefs(store, envSnapshot());
  });
