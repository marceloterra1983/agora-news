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
import type { LlmModelListResult } from "./llm-client.mjs";
import { defaultAccountLabel } from "./llm-slots.mjs";
import { subscriptionAuthFor } from "./llm-oauth-policy.mjs";

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

export const listLlmModels = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { provider?: string; key?: string; selectedId?: string }) => {
    const providerRaw = String(input.provider || "").trim();
    if (providerRaw && !isLlmProvider(providerRaw)) {
      throw new Error("llm_provider_invalid");
    }
    return {
      provider: (isLlmProvider(providerRaw) ? providerRaw : "openai") as LlmProvider,
      key: String(input.key || "").trim(),
      selectedId: String(input.selectedId || "").trim(),
    };
  })
  .handler(async ({ data, context }): Promise<LlmModelListResult> => {
    if (data.key) await assertSpendAllowed(context.userId);
    const { listProviderModels } = await import("./llm-client.mjs");
    return listProviderModels({
      provider: data.provider,
      key: data.key,
      selectedId: data.selectedId,
    });
  });

export const listLlmAccounts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }): Promise<LlmPrefsPublic> => {
    const { readLlmStore } = await import("./llm-store.server");
    return publicLlmPrefs(await readLlmStore(context.userId), envSnapshot());
  });

export const upsertLlmAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { id?: string; label?: string; key?: string; model?: string; provider?: string }) => {
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
    const { applyOwnerLlmCommand, readLlmStore } = await import("./llm-store.server");
    if (!data.key) {
      const current = await readLlmStore(context.userId);
      const prev = current.accounts.find((row) => row.id === data.id || row.provider === data.provider);
      if (!prev) throw new Error("llm_key_required");
      const store = await applyOwnerLlmCommand(context.userId, {
        type: "upsert",
        id: prev.id,
        label: data.label || prev.label,
        provider: prev.provider,
        model: data.model || prev.model,
        authKind: prev.authKind,
        status: prev.status,
      });
      return withValidate(publicLlmPrefs(store, envSnapshot()), true, prev.status, "Modelo atualizado.");
    }
    await assertSpendAllowed(context.userId);
    const { validateLlmKey } = await import("./llm-client.mjs");
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
    const { applyOwnerLlmCommand, readLlmStore } = await import("./llm-store.server");
    const current = await readLlmStore(context.userId);
    const account = current.accounts.find((row) => row.id === data.id);
    if (account?.authKind === "oauth") {
      try {
        const { tokenRevokeRequest } = await import("./llm-oauth.mjs");
        const token = account.refreshToken || account.key;
        if (token) {
          const req = tokenRevokeRequest({ token });
          await fetch(req.url, req.init).catch(() => undefined);
        }
      } catch {
        /* revoke é melhor-esforço; a conta some do store mesmo assim */
      }
    }
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

export const startLlmOauth = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { provider?: string; label?: string; model?: string }) => {
    const providerRaw = String(input.provider || "").trim();
    if (providerRaw && !isLlmProvider(providerRaw)) throw new Error("llm_provider_invalid");
    const provider = (isLlmProvider(providerRaw) ? providerRaw : "anthropic") as LlmProvider;
    return {
      provider,
      label: String(input.label || "").trim(),
      model: String(input.model || "").trim() || defaultModelFor(provider),
    };
  })
  .handler(async ({ data, context }) => {
    const cap = subscriptionAuthFor(data.provider);
    if (!cap.available) {
      return { available: false as const, reason: cap.reason, authorizeUrl: null };
    }
    const label = data.label || defaultAccountLabel(data.provider, "oauth");
    await assertSpendAllowed(context.userId);
    const { startClaudeOauth } = await import("./llm-oauth.mjs");
    const { applyOwnerLlmCommand } = await import("./llm-store.server");
    const started = startClaudeOauth(process.env);
    await applyOwnerLlmCommand(context.userId, {
      type: "oauth-pending",
      provider: data.provider,
      state: started.pending.state,
      codeVerifier: started.pending.codeVerifier,
      label,
      model: data.model,
    });
    return { available: true as const, reason: null, authorizeUrl: started.authorizeUrl };
  });

export const completeLlmOauth = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { code: string }) => ({ code: String(input.code || "").trim() }))
  .handler(async ({ data, context }): Promise<LlmUpsertResult> => {
    await assertSpendAllowed(context.userId);
    const { applyOwnerLlmCommand, readLlmStore } = await import("./llm-store.server");
    const {
      claudeOauthClientId,
      parseOauthCallbackInput,
      parseOauthTokenResponse,
      tokenExchangeRequest,
    } = await import("./llm-oauth.mjs");
    const { validateLlmKey } = await import("./llm-client.mjs");
    const store = await readLlmStore(context.userId);
    const pending = store.pendingOauth;
    if (!pending?.codeVerifier) throw new Error("llm_oauth_pending");
    const parsed = parseOauthCallbackInput(data.code);
    const code = parsed.code;
    if (!code) {
      return withValidate(
        publicLlmPrefs(store, envSnapshot()),
        false,
        "auth",
        "Cole o código ou a URL depois de autorizar.",
      );
    }
    if (parsed.state && parsed.state !== pending.state) throw new Error("llm_oauth_state");
    const req = tokenExchangeRequest({
      code,
      codeVerifier: pending.codeVerifier,
      state: parsed.state || pending.state,
      clientId: claudeOauthClientId(process.env),
    });
    let tokens;
    try {
      const res = await fetch(req.url, req.init);
      tokens = res.ok ? parseOauthTokenResponse(await res.json()) : null;
    } catch {
      tokens = null;
    }
    if (!tokens?.accessToken) {
      return withValidate(
        publicLlmPrefs(store, envSnapshot()),
        false,
        "auth",
        "A Anthropic recusou o código (expirou ou é inválido). Abra a autorização de novo.",
      );
    }
    const checked = await validateLlmKey({
      provider: pending.provider,
      key: tokens.accessToken,
      model: pending.model || defaultModelFor(pending.provider),
      authKind: "oauth",
    });
    if (!checked.persist) {
      return withValidate(publicLlmPrefs(store, envSnapshot()), false, checked.status, checked.warning);
    }
    await applyOwnerLlmCommand(context.userId, {
      type: "upsert",
      label: pending.label || "Claude Pro",
      provider: pending.provider,
      model: pending.model,
      authKind: "oauth",
      key: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      status: checked.status,
    });
    const cleared = await applyOwnerLlmCommand(context.userId, { type: "oauth-clear-pending" });
    return withValidate(publicLlmPrefs(cleared, envSnapshot()), true, checked.status, checked.warning);
  });
