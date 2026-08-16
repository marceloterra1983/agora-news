type WriteKind = "app" | "ingest" | "ops";

type WriteHeaders = {
  site?: string | null;
  authorization?: string | null;
  userId?: string | null;
};

type WriteEnv = { cronSecret?: string; userId?: string };

function cronSecret(): string {
  if (typeof process === "undefined" || !process.env) return "";
  return (process.env.CRON_SECRET || process.env.INGEST_SECRET || "").trim();
}

/** Mesma regra de scripts/write-guard.mjs — manter os dois alinhados. */
export function writeAllowed(kind: WriteKind, headers: WriteHeaders, env: WriteEnv = {}): boolean {
  const site = String(headers.site || "");
  if (site === "cross-site" || site === "same-site") return false;

  if (kind === "app") {
    const userId = String(headers.userId || env.userId || "").trim();
    return site === "same-origin" && Boolean(userId);
  }
  if (kind === "ops") return site === "same-origin";

  const secret = String(env.cronSecret || "").trim();
  const auth = String(headers.authorization || "");
  return Boolean(secret) && auth === `Bearer ${secret}`;
}

export function spendKeyAllowed(headers: WriteHeaders, env: WriteEnv = {}): boolean {
  return writeAllowed("app", headers, env) || writeAllowed("ingest", headers, env);
}

export async function requestWriteAllowed(kind: WriteKind, request: Request): Promise<boolean> {
  const site = request.headers.get("sec-fetch-site");
  const authorization = request.headers.get("authorization") || "";
  if (kind === "app") {
    const { userIdFromHeaders } = await import("@/lib/auth/verify.server");
    const userId = await userIdFromHeaders(request.headers);
    return writeAllowed("app", { site, userId, authorization }, { cronSecret: cronSecret() });
  }
  return writeAllowed(kind, { site, authorization }, { cronSecret: cronSecret() });
}

export function denyWrite(kind: WriteKind): Response {
  const status = kind === "ingest" ? 401 : 403;
  return Response.json({ ok: false, error: "forbidden" }, { status });
}

export { cronSecret };
