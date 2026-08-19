import { createHash, randomBytes } from "node:crypto";
import { subscriptionAuthFor } from "./llm-oauth-policy.mjs";

/** Client id público do Claude Code (não é segredo). Sobrescreva com ANTHROPIC_OAUTH_CLIENT_ID. */
export const CLAUDE_OAUTH_CLIENT_ID = "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
export const CLAUDE_OAUTH_AUTHORIZE = "https://claude.ai/oauth/authorize";
export const CLAUDE_OAUTH_TOKEN = "https://platform.claude.com/v1/oauth/token";
export const CLAUDE_OAUTH_REDIRECT = "http://localhost:54545/callback";
export const CLAUDE_OAUTH_SCOPE =
  "user:profile user:inference user:sessions:claude_code user:mcp_servers user:file_upload";

export function claudeOauthClientId(env = process.env) {
  return String(env.ANTHROPIC_OAUTH_CLIENT_ID || "").trim() || CLAUDE_OAUTH_CLIENT_ID;
}

export function createPkce(entropy = () => randomBytes(32)) {
  const verifier = entropy().toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function startClaudeOauth(env = process.env) {
  const { verifier, challenge } = createPkce();
  const state = randomBytes(16).toString("hex");
  const params = new URLSearchParams({
    code: "true",
    client_id: claudeOauthClientId(env),
    response_type: "code",
    redirect_uri: CLAUDE_OAUTH_REDIRECT,
    scope: CLAUDE_OAUTH_SCOPE,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
  });
  return {
    authorizeUrl: `${CLAUDE_OAUTH_AUTHORIZE}?${params}`,
    pending: { provider: "anthropic", state, codeVerifier: verifier },
  };
}

export function parseOauthCallbackInput(raw) {
  const text = String(raw || "").trim();
  if (!text) return { code: "", state: "" };
  if (/^https?:\/\//i.test(text)) {
    try {
      const url = new URL(text);
      return {
        code: String(url.searchParams.get("code") || "").trim(),
        state: String(url.searchParams.get("state") || "").trim(),
      };
    } catch {
      /* URL inválida: trata como código cru */
    }
  }
  const hash = text.indexOf("#");
  if (hash >= 0) return { code: text.slice(0, hash).trim(), state: text.slice(hash + 1).trim() };
  return { code: text, state: "" };
}

export function tokenExchangeRequest({
  code,
  codeVerifier,
  state,
  clientId = CLAUDE_OAUTH_CLIENT_ID,
  redirectUri = CLAUDE_OAUTH_REDIRECT,
}) {
  return {
    url: CLAUDE_OAUTH_TOKEN,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: codeVerifier,
        state,
      }),
    },
  };
}

export function tokenRefreshRequest({ refreshToken, clientId = CLAUDE_OAUTH_CLIENT_ID }) {
  return {
    url: CLAUDE_OAUTH_TOKEN,
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
      }),
    },
  };
}

export function tokenRevokeRequest({ token, clientId = CLAUDE_OAUTH_CLIENT_ID }) {
  return {
    url: "https://platform.claude.com/v1/oauth/revoke",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, client_id: clientId }),
    },
  };
}

export function parseOauthTokenResponse(json, nowMs = Date.now()) {
  const accessToken = String(json?.access_token || "").trim();
  const refreshToken = String(json?.refresh_token || "").trim();
  const expiresIn = Number(json?.expires_in);
  return {
    accessToken,
    refreshToken,
    expiresAt:
      Number.isFinite(expiresIn) && expiresIn > 0
        ? new Date(nowMs + expiresIn * 1000).toISOString()
        : null,
  };
}

export async function refreshOauthAccess({ refreshToken, fetchImpl = fetch, env = process.env }) {
  if (!String(refreshToken || "").trim()) return { ok: false };
  try {
    const req = tokenRefreshRequest({
      refreshToken,
      clientId: claudeOauthClientId(env),
    });
    const res = await fetchImpl(req.url, req.init);
    if (!res.ok) return { ok: false };
    const tokens = parseOauthTokenResponse(await res.json());
    if (!tokens.accessToken) return { ok: false };
    return { ok: true, ...tokens };
  } catch {
    return { ok: false };
  }
}

export { subscriptionAuthFor };
