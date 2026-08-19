import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import {
  defaultModelFor,
  isLlmProvider,
  publicLlmPrefs,
  type LlmPrefsPublic,
  type LlmProvider,
  type LlmUpsertResult,
} from "./llm-accounts.mjs";

function envSnapshot() {
  return {
    XAI_API_KEY: process.env.XAI_API_KEY,
    GROK_API_KEY: process.env.GROK_API_KEY,
  };
}

async function assertSpendAllowed(userId: string): Promise<void> {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { cronSecret, spendKeyAllowed } = await import("./write-guard");
  const request = getRequest();
  const headers = request?.headers;
  const site = headers?.get("sec-fetch-site") || "";
  const authorization = headers?.get("authorization") || "";
  if (!spendKeyAllowed({ site, userId, authorization }, { cronSecret: cronSecret() })) {
    throw new Error("llm_spend_denied");
  }
}

function withValidate(
  prefs: LlmPrefsPublic,
  saved: boolean,
  validateStatus: LlmUpsertResult["validateStatus"],
  validateWarning: string | null,
): LlmUpsertResult {
  return { ...prefs, saved, validateStatus, validateWarning };
}

export const listLlmAccounts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LlmPrefsPublic> => {
    const { readLlmStore } = await import("./llm-store.server");
    return publicLlmPrefs(await readLlmStore(context.userId), envSnapshot());
  });

export const upsertLlmAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string; label: string; key?: string; model?: string; provider?: string }) => {
    const providerRaw = String(input.provider || "").trim();
    if (providerRaw && !isLlmProvider(providerRaw)) {
      throw new Error("llm_provider_invalid");
    }
    const provider = (isLlmProvider(providerRaw) ? providerRaw : "xai") as LlmProvider;
    return {
      id: String(input.id || "").trim() || undefined,
      label: String(input.label || "").trim(),
      key: String(input.key || "").trim() || undefined,
      model: String(input.model || "").trim() || defaultModelFor(provider),
      provider,
    };
  })
  .handler(async ({ data, context }): Promise<LlmUpsertResult> => {
    await assertSpendAllowed(context.userId);
    const { applyOwnerLlmCommand, readLlmStore } = await import("./llm-store.server");
    const { validateLlmKey } = await import("./llm-client.mjs");
    if (!data.key) {
      throw new Error("llm_key_required");
    }
    const checked = await validateLlmKey({
      provider: data.provider,
      key: data.key,
      model: data.model,
    });
    if (!checked.persist) {
      const store = await readLlmStore(context.userId);
      return withValidate(publicLlmPrefs(store, envSnapshot()), false, checked.status, checked.warning);
    }
    const store = await applyOwnerLlmCommand(context.userId, {
      type: "upsert",
      ...data,
      status: checked.status,
    });
    return withValidate(publicLlmPrefs(store, envSnapshot()), true, checked.status, checked.warning);
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
