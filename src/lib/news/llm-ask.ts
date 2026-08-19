import {
  classifyLlmHttpStatus,
  envLlmKey,
  llmWarningFor,
  resolveLlmRuntime,
  type LlmSource,
  type LlmStatus,
} from "./llm-accounts.mjs";
import { clipOneLine, extractLlmText } from "./summary-core.mjs";

export type GrokLineResult = {
  line: string;
  status: LlmStatus | "none";
  source: LlmSource;
  warning: string | null;
};

const SYSTEM =
  "Você resume quem é uma conta do X. Use SOMENTE os dados do usuário. Não invente cargo, empresa, país ou formação. Se a bio for vaga, reformule só o que ela diz. Uma frase em português do Brasil, no máximo 160 caracteres. Sem aspas, emoji, hashtag ou @.";

async function persistStatus(
  userId: string | undefined,
  runtime: { source: LlmSource; accountId: string | null },
  status: LlmStatus,
) {
  if (!userId) return;
  const { applyOwnerLlmCommand } = await import("./llm-store.server");
  if (runtime.source === "account" && runtime.accountId) {
    await applyOwnerLlmCommand(userId, {
      type: "status",
      target: "account",
      accountId: runtime.accountId,
      status,
    });
    return;
  }
  if (runtime.source === "env") {
    await applyOwnerLlmCommand(userId, { type: "status", target: "env", status });
  }
}

async function callXai(
  url: string,
  body: unknown,
  key: string,
): Promise<{ status: number; line: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(14_000),
    body: JSON.stringify(body),
  });
  if (!res.ok) return { status: res.status, line: "" };
  const line = clipOneLine(extractLlmText((await res.json()) as Record<string, unknown>));
  return { status: res.status, line };
}

export async function askGrokLine(
  prompt: string,
  opts?: { userId?: string; store?: unknown },
): Promise<GrokLineResult> {
  let store = opts?.store;
  if (opts?.userId && store === undefined) {
    const { readLlmStore } = await import("./llm-store.server");
    store = await readLlmStore(opts.userId);
  }
  const runtime = resolveLlmRuntime({
    store,
    env: process.env,
    userId: opts?.userId || "",
  });
  const hasEnv = Boolean(envLlmKey(process.env));
  if (!runtime.key) {
    return {
      line: "",
      status: "none",
      source: "none",
      warning: llmWarningFor("none", { hasAccount: false, hasEnv }),
    };
  }

  const fail = async (httpStatus: number): Promise<GrokLineResult> => {
    const status = classifyLlmHttpStatus(httpStatus);
    await persistStatus(opts?.userId, runtime, status);
    return {
      line: "",
      status,
      source: runtime.source,
      warning: llmWarningFor(status, { hasAccount: runtime.source === "account", hasEnv }),
    };
  };

  try {
    const chat = await callXai(
      "https://api.x.ai/v1/chat/completions",
      {
        model: runtime.model,
        max_tokens: 90,
        temperature: 0,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      },
      runtime.key,
    );
    if (chat.line) {
      await persistStatus(opts?.userId, runtime, "ok");
      return { line: chat.line, status: "ok", source: runtime.source, warning: null };
    }
    if (chat.status >= 400) {
      const kind = classifyLlmHttpStatus(chat.status);
      if (kind === "auth" || kind === "quota") return fail(chat.status);
    }
  } catch {
    /* tentar /responses */
  }

  try {
    const res = await callXai(
      "https://api.x.ai/v1/responses",
      {
        model: runtime.model,
        max_output_tokens: 90,
        input: [
          { role: "system", content: SYSTEM },
          { role: "user", content: prompt },
        ],
      },
      runtime.key,
    );
    if (res.line) {
      await persistStatus(opts?.userId, runtime, "ok");
      return { line: res.line, status: "ok", source: runtime.source, warning: null };
    }
    if (res.status >= 400) return fail(res.status);
  } catch {
    await persistStatus(opts?.userId, runtime, "error");
    return {
      line: "",
      status: "error",
      source: runtime.source,
      warning: llmWarningFor("error", { hasAccount: runtime.source === "account", hasEnv }),
    };
  }

  await persistStatus(opts?.userId, runtime, "error");
  return {
    line: "",
    status: "error",
    source: runtime.source,
    warning: llmWarningFor("error", { hasAccount: runtime.source === "account", hasEnv }),
  };
}
