import {
  classifyLlmHttpStatus,
  defaultModelFor,
  persistValidatedStatus,
} from "./llm-accounts.mjs";
import { clipOneLine, extractLlmText } from "./summary-core.mjs";

export const LLM_SYSTEM =
  "Você resume quem é uma conta do X. Use SOMENTE os dados do usuário. Não invente cargo, empresa, país ou formação. Se a bio for vaga, reformule só o que ela diz. Uma frase em português do Brasil, no máximo 160 caracteres. Sem aspas, emoji, hashtag ou @.";

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

export function validationRequest(provider, key, model) {
  if (provider === "openai") {
    return {
      url: "https://api.openai.com/v1/models",
      init: { method: "GET", headers: { Authorization: `Bearer ${key}` } },
    };
  }
  if (provider === "anthropic") {
    return {
      url: "https://api.anthropic.com/v1/messages",
      init: {
        method: "POST",
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || defaultModelFor("anthropic"),
          max_tokens: 1,
          messages: [{ role: "user", content: "ok" }],
        }),
      },
    };
  }
  return {
    url: "https://api.x.ai/v1/models",
    init: { method: "GET", headers: { Authorization: `Bearer ${key}` } },
  };
}

export function chatRequests(provider, model, key, prompt, system = LLM_SYSTEM) {
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
        init: {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify(openaiShape),
        },
      },
    ];
  }
  if (provider === "anthropic") {
    return [
      {
        url: "https://api.anthropic.com/v1/messages",
        init: {
          method: "POST",
          headers: {
            "x-api-key": key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            max_tokens: 90,
            temperature: 0,
            system,
            messages: [{ role: "user", content: prompt }],
          }),
        },
      },
    ];
  }
  return [
    {
      url: "https://api.x.ai/v1/chat/completions",
      init: {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify(openaiShape),
      },
    },
    {
      url: "https://api.x.ai/v1/responses",
      init: {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
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

export async function validateLlmKey({ provider, key, model, fetchImpl = fetch }) {
  try {
    const { url, init } = validationRequest(provider, key, model);
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
}) {
  const reqs = chatRequests(provider, model, key, prompt, system);
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
      const line = clipOneLine(extractLlmText(await res.json()));
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
