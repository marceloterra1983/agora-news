import { spendKeyAllowed, writeAllowed, writeDenialStatus } from "../../../scripts/write-guard.mjs";

type WriteKind = "app" | "ingest" | "ops";

export { spendKeyAllowed, writeAllowed, writeDenialStatus };

function cronSecret(): string {
  if (typeof process === "undefined" || !process.env) return "";
  return (process.env.CRON_SECRET || process.env.INGEST_SECRET || "").trim();
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
  return Response.json({ ok: false, error: "forbidden" }, { status: writeDenialStatus(kind) });
}

export { cronSecret };
