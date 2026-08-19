/** Três provedores como slots. Uma conta por provedor; o ativo é “Agora usando”. */

import { LLM_PROVIDERS, llmWarningFor, providerLabel } from "./llm-accounts.mjs";
import { modelOptionsFor } from "./llm-models.mjs";

export function defaultAccountLabel(provider, authKind = "api") {
  const name = providerLabel(provider);
  return authKind === "oauth" ? `${name} · Assinatura` : name;
}

export function modelLabelFor(provider, modelId) {
  const id = String(modelId || "").trim();
  const hit = modelOptionsFor(provider, id).find((row) => row.id === id);
  return hit?.label || id;
}

export function connectionLine(account) {
  if (!account) return "";
  const kind = account.authKind === "oauth" ? "Assinatura" : "API";
  return `${providerLabel(account.provider)} · ${modelLabelFor(account.provider, account.model)} · ${kind}`;
}

export function slotsFromPublic(prefs) {
  const accounts = prefs?.accounts || [];
  return LLM_PROVIDERS.map((provider) => {
    const account = accounts.find((row) => row.provider === provider) || null;
    return { provider, account, connected: Boolean(account) };
  });
}

export function activeChoices(prefs) {
  return (prefs?.accounts || []).filter((row) => row.status === "ok" || row.status === "quota");
}

export function settingsBanner(prefs) {
  if (!prefs) return "";
  const usable = (prefs.accounts || []).some((row) => row.status === "ok" || row.status === "quota");
  if (usable || prefs.envFallback) return "";
  if ((prefs.accounts || []).length === 0) {
    return llmWarningFor("none", { hasAccount: false, hasEnv: false });
  }
  return "";
}

export function saveFeedback(result) {
  if (result?.saved) {
    return {
      ok: true,
      text: result.validateWarning || "Conectado. A conta foi gravada.",
    };
  }
  return {
    ok: false,
    text: result?.validateWarning || "Não deu para gravar a conta.",
  };
}
