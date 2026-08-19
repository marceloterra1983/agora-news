import {
  classifyLlmHttpStatus,
  envLlmKey,
  llmWarningFor,
  resolveLlmRuntime,
  type LlmSource,
  type LlmStatus,
} from "./llm-accounts.mjs";
import { askProviderLineWithRefresh } from "./llm-client.mjs";

export type GrokLineResult = {
  line: string;
  status: LlmStatus | "none";
  source: LlmSource;
  warning: string | null;
};

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
  if (!runtime.key && !(runtime.authKind === "oauth" && runtime.refreshToken)) {
    return {
      line: "",
      status: "none",
      source: "none",
      warning: llmWarningFor("none", { hasAccount: false, hasEnv, authKind: runtime.authKind }),
    };
  }

  const fail = async (httpStatus: number): Promise<GrokLineResult> => {
    const status = classifyLlmHttpStatus(httpStatus);
    await persistStatus(opts?.userId, runtime, status);
    return {
      line: "",
      status,
      source: runtime.source,
      warning: llmWarningFor(status, {
        hasAccount: runtime.source === "account",
        hasEnv,
        authKind: runtime.authKind,
      }),
    };
  };

  try {
    const asked = await askProviderLineWithRefresh({
      provider: runtime.provider,
      model: runtime.model,
      key: runtime.key,
      prompt,
      authKind: runtime.authKind || "api",
      refreshToken: runtime.refreshToken || "",
      persistTokens: async (tokens) => {
        if (!opts?.userId || !runtime.accountId) return;
        const { applyOwnerLlmCommand } = await import("./llm-store.server");
        await applyOwnerLlmCommand(opts.userId, {
          type: "tokens",
          accountId: runtime.accountId,
          key: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresAt: tokens.expiresAt,
        });
      },
    });
    if (asked.line) {
      await persistStatus(opts?.userId, runtime, "ok");
      return { line: asked.line, status: "ok", source: runtime.source, warning: null };
    }
    if (asked.status === "auth" || asked.status === "quota") {
      return fail(asked.httpStatus || (asked.status === "auth" ? 401 : 429));
    }
  } catch {
    await persistStatus(opts?.userId, runtime, "error");
    return {
      line: "",
      status: "error",
      source: runtime.source,
      warning: llmWarningFor("error", {
        hasAccount: runtime.source === "account",
        hasEnv,
        authKind: runtime.authKind,
      }),
    };
  }

  await persistStatus(opts?.userId, runtime, "error");
  return {
    line: "",
    status: "error",
    source: runtime.source,
    warning: llmWarningFor("error", {
      hasAccount: runtime.source === "account",
      hasEnv,
      authKind: runtime.authKind,
    }),
  };
}
