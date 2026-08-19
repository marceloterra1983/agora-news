import type { LlmSubscriptionAuth } from "./llm-oauth-policy.mjs";

export const CLAUDE_OAUTH_CLIENT_ID: string;
export const CLAUDE_OAUTH_AUTHORIZE: string;
export const CLAUDE_OAUTH_TOKEN: string;
export const CLAUDE_OAUTH_REDIRECT: string;
export const CLAUDE_OAUTH_SCOPE: string;

export type LlmOauthPending = {
  provider: "anthropic";
  state: string;
  codeVerifier: string;
};

export type LlmOauthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: string | null;
};

export function claudeOauthClientId(env?: Record<string, string | undefined>): string;
export function createPkce(entropy?: () => Buffer): { verifier: string; challenge: string };
export function startClaudeOauth(env?: NodeJS.ProcessEnv): {
  authorizeUrl: string;
  pending: LlmOauthPending;
};
export function parseOauthCallbackInput(raw: string): { code: string; state: string };
export function tokenExchangeRequest(input: {
  code: string;
  codeVerifier: string;
  state?: string;
  clientId?: string;
  redirectUri?: string;
}): { url: string; init: RequestInit };
export function tokenRefreshRequest(input: {
  refreshToken: string;
  clientId?: string;
}): { url: string; init: RequestInit };
export function tokenRevokeRequest(input: {
  token: string;
  clientId?: string;
}): { url: string; init: RequestInit };
export function parseOauthTokenResponse(json: unknown, nowMs?: number): LlmOauthTokens;
export function refreshOauthAccess(input: {
  refreshToken: string;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
}): Promise<{ ok: false } | ({ ok: true } & LlmOauthTokens)>;
export function subscriptionAuthFor(provider: string): LlmSubscriptionAuth;
