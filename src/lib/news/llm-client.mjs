import {
  classifyLlmHttpStatus,
  defaultModelFor,
  persistValidatedStatus,
} from "./llm-accounts.mjs";
import { mergeModelOptions, parseRemoteModelIds } from "./llm-models.mjs";
import { clipOneLine, extractLlmText } from "./summary-core.mjs";

export const LLM_SYSTEM =
  "Você resume quem é uma conta do X. Use SOMENTE os dados do usuário. Não invente cargo, empresa, país ou formação. Se a bio for vaga, reformule só o que ela diz. Uma frase em português do Brasil, no máximo 160 caracteres. Sem aspas, emoji, hashtag ou @.";

/** Tokens OAuth do Claude Code só passam no Messages com este identity block. */
export const CLAUDE_CODE_IDENTITY = "You are Claude Code, Anthropic's official CLI for Claude.";

const TIMEOUT_MS = 14_000;

export function validateWarningFor(status) {
  if (status === "auth") {
    return "A chave foi recusada (inválida ou sem permissão). Nada foi cadastrado.";
  }
  if (status === "quota") {
    return "A conta estourou o limite ou a assinatura. Cadastramos mesmo assim para você trocar depois.";
  }
  if (status === "ok") return null;
  return "Não deu para validar a chave agora (rede ou o provedor falhou). Nada foi cadastrado.";
}

function opus5MinorVersion(id) {
  const match = /^claude-opus-5-(\d+)/i.exec(String(id || ""));
  if (!match) return null;
  if (/^20\d{6}$/.test(match[1])) return null; // snapshot com data herda claude-opus-5
  return Number.parseInt(match[1], 10);
}

function anthropicModelCapabilities(model) {
  const id = String(model || "");
  // ponytail: opus-5-5+, opus-5-N (N>=5), fable-5* e mythos-5* têm pensamento sempre ligado —
  // `thinking:{type:"disabled"}` dá 400 nesses; só opus-5 (+snapshot com data) e sonnet-5 desligam.
  const alwaysOnThinking =
    /^claude-fable-5/i.test(id) ||
    /^claude-mythos-5/i.test(id) ||
    (opus5MinorVersion(id) ?? 0) >= 5;
  const canDisableThinking =
    !alwaysOnThinking &&
    (/^claude-opus-5$/i.test(id) ||
      /^claude-opus-5-20\d{6}(?:-|$)/i.test(id) ||
      /^claude-sonnet-5(?:-|$)/i.test(id));
  const supportsEffort = canDisableThinking || alwaysOnThinking;
  const supportsFallbacks = /^claude-(?:opus-5(?:-|$)|fable-5|mythos-5)/i.test(id);
  return { canDisableThinking, alwaysOnThinking, supportsEffort, supportsFallbacks };
}

function pingBody(provider, model) {
  const modelId = model || defaultModelFor(provider);
  const body = {
    model: modelId,
    max_tokens: 1,
    messages: [{ role: "user", content: "ok" }],
  };
  if (provider === "anthropic") {
    const capabilities = anthropicModelCapabilities(modelId);
    if (capabilities.canDisableThinking) {
      Object.assign(body, {
        thinking: { type: "disabled" },
        output_config: { effort: "low" },
      });
    } else if (capabilities.alwaysOnThinking) {
      // Pensamento conta no max_tokens; sem mínimo garantido no guia, 256 evita o 400.
      Object.assign(body, { max_tokens: 256, output_config: { effort: "low" } });
    }
    if (capabilities.supportsFallbacks) body.fallbacks = "default";
  }
  return JSON.stringify(body);
}

function anthropicMessageHeaders(headers, model) {
  if (!anthropicModelCapabilities(model).supportsFallbacks) return headers;
  return {
    ...headers,
    "anthropic-beta": [
      headers["anthropic-beta"],
      "server-side-fallback-2026-07-01",
    ]
      .filter(Boolean)
      .join(","),
  };
}

export function providerAuthHeaders(provider, key, authKind = "api") {
  if (provider === "anthropic") {
    const headers = { "anthropic-version": "2023-06-01", "Content-Type": "application/json" };
    if (authKind === "oauth") {
      headers.Authorization = `Bearer ${key}`;
      headers["anthropic-beta"] = "oauth-2025-04-20";
      headers["user-agent"] = "claude-cli/1.0.0 (external, agora)";
      headers["x-app"] = "cli";
    } else {
      headers["x-api-key"] = key;
    }
    return headers;
  }
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

export function modelsListRequest(provider, key, authKind = "api") {
  const headers = providerAuthHeaders(provider, key, authKind);
  if (provider === "anthropic") {
    return { url: "https://api.anthropic.com/v1/models", init: { method: "GET", headers } };
  }
  if (provider === "openai") {
    return { url: "https://api.openai.com/v1/models", init: { method: "GET", headers } };
  }
  return { url: "https://api.x.ai/v1/models", init: { method: "GET", headers } };
}

export function validationRequest(provider, key, model, authKind = "api") {
  const headers = providerAuthHeaders(provider, key, authKind);
  if (provider === "anthropic") {
    return {
      url: "https://api.anthropic.com/v1/messages",
      init: {
        method: "POST",
        headers: anthropicMessageHeaders(headers, model || defaultModelFor(provider)),
        body: pingBody(provider, model),
      },
    };
  }
  if (provider === "openai") {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      init: { method: "POST", headers, body: pingBody(provider, model) },
    };
  }
  return {
    url: "https://api.x.ai/v1/chat/completions",
    init: { method: "POST", headers, body: pingBody(provider, model) },
  };
}

export async function listProviderModels({
  provider,
  key,
  selectedId = "",
  authKind = "api",
  fetchImpl = fetch,
}) {
  const fallback = mergeModelOptions(provider, [], selectedId);
  if (!String(key || "").trim()) return { source: "catalog", models: fallback };
  try {
    const { url, init } = modelsListRequest(provider, key, authKind);
    const res = await fetchImpl(url, withTimeout(init));
    if (!res.ok) return { source: "catalog", models: fallback };
    const remote = parseRemoteModelIds(provider, await res.json());
    if (!remote.length) return { source: "catalog", models: fallback };
    return { source: "live", models: mergeModelOptions(provider, remote, selectedId) };
  } catch {
    return { source: "catalog", models: fallback };
  }
}

export function chatRequests(provider, model, key, prompt, system = LLM_SYSTEM, authKind = "api") {
  const headers = providerAuthHeaders(provider, key, authKind);
  const openaiShape = {
    model,
    max_tokens: 90,
    temperature: 0,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
  };
  if (provider === "openai") {
    return [
      {
        url: "https://api.openai.com/v1/chat/completions",
        init: { method: "POST", headers, body: JSON.stringify(openaiShape) },
      },
    ];
  }
  if (provider === "anthropic") {
    const capabilities = anthropicModelCapabilities(model);
    // Pensamento sempre ligado: omite `thinking` (disabled dá 400); max_tokens cobre
    // pensamento+frase (a frase continua cortada a 160 chars pelo clipOneLine).
    const maxTokens = capabilities.alwaysOnThinking ? 2048 : 90;
    // Temperature nunca vai ao Anthropic: opcional em todos, rejeitado desde o Opus 4.7 (400).
    const effortShape = capabilities.canDisableThinking
      ? { thinking: { type: "disabled" }, output_config: { effort: "low" } }
      : capabilities.alwaysOnThinking
        ? { output_config: { effort: "low" } }
        : {};
    return [
      {
        url: "https://api.anthropic.com/v1/messages",
        init: {
          method: "POST",
          headers: anthropicMessageHeaders(headers, model),
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            ...effortShape,
            ...(capabilities.supportsFallbacks ? { fallbacks: "default" } : {}),
            system:
              authKind === "oauth"
                ? [
                    { type: "text", text: CLAUDE_CODE_IDENTITY },
                    { type: "text", text: system },
                  ]
                : system,
            messages: [{ role: "user", content: prompt }],
          }),
        },
      },
    ];
  }
  return [
    {
      url: "https://api.x.ai/v1/chat/completions",
      init: { method: "POST", headers, body: JSON.stringify(openaiShape) },
    },
    {
      url: "https://api.x.ai/v1/responses",
      init: {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          max_output_tokens: 90,
          input: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      },
    },
  ];
}

function withTimeout(init) {
  return { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) };
}

export async function validateLlmKey({
  provider,
  key,
  model: _model,
  authKind = "api",
  fetchImpl = fetch,
}) {
  if (authKind === "oauth") {
    // Token exchange already proved the subscription. GET /models recusa oat.
    return { status: "ok", persist: true, warning: null };
  }
  try {
    // Chat ping fails on model/body mismatches and looks like "nada cadastrado".
    // GET /models only checks whether the key is accepted.
    const { url, init } = modelsListRequest(provider, key, authKind);
    const res = await fetchImpl(url, withTimeout(init));
    const status = classifyLlmHttpStatus(res.status);
    return { status, persist: persistValidatedStatus(status), warning: validateWarningFor(status) };
  } catch {
    return { status: "error", persist: false, warning: validateWarningFor("error") };
  }
}

export async function askProviderLine({
  provider,
  model,
  key,
  prompt,
  fetchImpl = fetch,
  system = LLM_SYSTEM,
  authKind = "api",
}) {
  const reqs = chatRequests(provider, model, key, prompt, system, authKind);
  let lastStatus = 0;
  for (const req of reqs) {
    try {
      const res = await fetchImpl(req.url, withTimeout(req.init));
      lastStatus = res.status;
      if (!res.ok) {
        const kind = classifyLlmHttpStatus(res.status);
        if (kind === "auth" || kind === "quota") {
          return { line: "", status: kind, httpStatus: res.status };
        }
        continue;
      }
      const response = await res.json();
      if (provider === "anthropic" && response?.stop_reason === "refusal") {
        return { line: "", status: "error", httpStatus: res.status };
      }
      const line = clipOneLine(extractLlmText(response));
      if (line) return { line, status: "ok", httpStatus: res.status };
    } catch {
      /* tenta o próximo endpoint (xAI /responses) */
    }
  }
  return {
    line: "",
    status: lastStatus ? classifyLlmHttpStatus(lastStatus) : "error",
    httpStatus: lastStatus,
  };
}

export async function askProviderLineWithRefresh({
  provider,
  model,
  key,
  prompt,
  fetchImpl = fetch,
  system = LLM_SYSTEM,
  authKind = "api",
  refreshToken = "",
  persistTokens,
}) {
  const first = await askProviderLine({
    provider,
    model,
    key,
    prompt,
    fetchImpl,
    system,
    authKind,
  });
  if (first.status !== "auth" || authKind !== "oauth" || !String(refreshToken || "").trim()) {
    return first;
  }
  const { refreshOauthAccess } = await import("./llm-oauth.mjs");
  const refreshed = await refreshOauthAccess({ refreshToken, fetchImpl });
  if (!refreshed.ok) {
    return { line: "", status: "auth", httpStatus: first.httpStatus || 401 };
  }
  if (persistTokens) await persistTokens(refreshed);
  return askProviderLine({
    provider,
    model,
    key: refreshed.accessToken,
    prompt,
    fetchImpl,
    system,
    authKind: "oauth",
  });
}
