type WriteKind = "app" | "ingest" | "ops";

function cronSecret(): string {
  if (typeof process === "undefined" || !process.env) return "";
  return (process.env.CRON_SECRET || process.env.INGEST_SECRET || "").trim();
}

/** Mesma regra de scripts/write-guard.mjs — manter os dois alinhados. */
export function requestWriteAllowed(kind: WriteKind, request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site === "cross-site" || site === "same-site") return false;
  if (kind === "app") return site === "same-origin";

  if (kind === "ops") return site === "same-origin";

  const secret = cronSecret();
  const auth = request.headers.get("authorization") || "";
  return Boolean(secret) && auth === `Bearer ${secret}`;
}

export function denyWrite(kind: WriteKind): Response {
  const status = kind === "ingest" ? 401 : 403;
  return Response.json({ ok: false, error: "forbidden" }, { status });
}
