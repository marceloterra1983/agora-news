export function unavailable(t, message) {
  if (process.env.CI_REQUIRED_SMOKES === "1") throw new Error(message);
  t.skip(message);
}

function hostnameIsLoopback(hostname) {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "[::1]";
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
  const prodLoopback = hostnameIsLoopback(url.hostname) && url.port === "3080";
  if (prodLoopback && process.env.NEWS_SMOKE_ALLOW_PROD !== "1") {
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
