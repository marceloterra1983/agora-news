export function unavailable(t, message) {
  if (process.env.CI_REQUIRED_SMOKES === "1") throw new Error(message);
  t.skip(message);
}

export function resolveSmokeUrl(raw = process.env.NEWS_SMOKE_URL) {
  const trimmed = String(raw || "").trim().replace(/\/$/, "");
  if (!trimmed) return { base: "", reason: "NEWS_SMOKE_URL ausente" };
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return { base: "", reason: "NEWS_SMOKE_URL inválida" };
  }
  if (url.port === "3080" && process.env.NEWS_SMOKE_ALLOW_PROD !== "1") {
    return { base: "", reason: "NEWS_SMOKE_URL aponta para produção :3080" };
  }
  return { base: trimmed, reason: "" };
}

export function liveSmokeUrl(t) {
  const { base, reason } = resolveSmokeUrl();
  if (!base) {
    unavailable(t, reason);
    return "";
  }
  return base;
}
