/** Catálogo estático de IDs reais. Lista ao vivo (com key) completa o restante. */

export const LLM_MODEL_CATALOG = {
  openai: [
    { id: "gpt-4.1-mini", label: "GPT-4.1 mini" },
    { id: "gpt-4.1", label: "GPT-4.1" },
    { id: "gpt-4.1-nano", label: "GPT-4.1 nano" },
    { id: "gpt-4o-mini", label: "GPT-4o mini" },
    { id: "gpt-4o", label: "GPT-4o" },
  ],
  anthropic: [
    { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
    { id: "claude-opus-4-5", label: "Claude Opus 4.5" },
    { id: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
    { id: "claude-sonnet-5", label: "Claude Sonnet 5" },
    { id: "claude-opus-5", label: "Claude Opus 5" },
  ],
  xai: [
    { id: "grok-4.5", label: "Grok 4.5" },
    { id: "grok-4.6", label: "Grok 4.6" },
    { id: "grok-4.3", label: "Grok 4.3" },
  ],
};

const SKIP_MODEL = /embedding|tts|whisper|dall-e|dalle|transcribe|moderation|imagine|voice|video|image/;

export function catalogModelsFor(provider) {
  return LLM_MODEL_CATALOG[provider] || [];
}

export function isUsefulChatModel(provider, id) {
  const value = String(id || "").trim();
  if (!value || SKIP_MODEL.test(value.toLowerCase())) return false;
  if (provider === "openai") return /^(gpt-|o[1-9]|chatgpt-)/i.test(value);
  if (provider === "anthropic") return /^claude-/i.test(value);
  if (provider === "xai") return /^grok-/i.test(value);
  return false;
}

export function parseRemoteModelIds(provider, payload) {
  const rows = payload && typeof payload === "object" && Array.isArray(payload.data) ? payload.data : [];
  const ids = [];
  for (const row of rows) {
    const id = String(row?.id || "").trim();
    if (isUsefulChatModel(provider, id)) ids.push(id);
  }
  return ids;
}

export function mergeModelOptions(provider, remoteIds = [], selectedId = "") {
  const catalog = catalogModelsFor(provider);
  const seen = new Set(catalog.map((row) => row.id));
  const extras = [];
  for (const id of remoteIds) {
    const next = String(id || "").trim();
    if (!next || seen.has(next) || !isUsefulChatModel(provider, next)) continue;
    extras.push({ id: next, label: next });
    seen.add(next);
  }
  const selected = String(selectedId || "").trim();
  if (selected && !seen.has(selected)) extras.push({ id: selected, label: selected });
  return [...catalog, ...extras];
}

export function modelOptionsFor(provider, selectedId = "") {
  return mergeModelOptions(provider, [], selectedId);
}
