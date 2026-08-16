import { createServerFn } from "@tanstack/react-start";
import { fetchLastPost } from "./last-post";
import { allProfiles, blurbFor, profileByHandle } from "./profiles";
import { readStoredProfile } from "./profile-store";
import { clipOneLine } from "./summary-core.mjs";
import { aiKey, oneLineAbout } from "./summary-line";

export const lookupXProfile = createServerFn({ method: "GET" })
  .validator((input: { handle: string }) => ({
    handle: String(input.handle || "")
      .replace(/^@+/, "")
      .trim()
      .slice(0, 15),
  }))
  .handler(async ({ data }) => {
    const handle = data.handle;
    if (!handle || !/^[A-Za-z0-9_]{1,15}$/.test(handle)) {
      return { found: false as const };
    }
    try {
      const [res, lastGuess] = await Promise.all([
        fetch(`https://api.fxtwitter.com/${encodeURIComponent(handle)}`, {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(8_000),
        }),
        fetchLastPost(handle),
      ]);
      if (!res.ok) return { found: false as const };
      const body = (await res.json()) as {
        user?: {
          screen_name?: string;
          name?: string;
          description?: string;
          followers?: number;
          following?: number;
          avatar_url?: string;
          verification?: { verified?: boolean };
        };
      };
      const u = body.user;
      if (!u?.screen_name) return { found: false as const };
      const screen = String(u.screen_name);
      const name = String(u.name || screen);
      const bio = String(u.description || "").trim();
      const avatar =
        typeof u.avatar_url === "string" ? u.avatar_url.replace("_normal.", "_400x400.") : null;
      const lastPost =
        screen.toLowerCase() === handle.toLowerCase() ? lastGuess : await fetchLastPost(screen);
      const stored = profileByHandle(screen) ? null : await readStoredProfile(screen);
      return {
        found: true as const,
        handle: screen,
        name,
        bio,
        summary: profileByHandle(screen)
          ? blurbFor(screen, name)
          : stored?.summary_pt || clipOneLine(bio),
        lastPost,
        followers: Number(u.followers) || 0,
        following: Number(u.following) || 0,
        avatar,
        verified: Boolean(u.verification?.verified),
      };
    } catch {
      return { found: false as const };
    }
  });

export const summarizeProfile = createServerFn({ method: "POST" })
  .validator((input: { handle: string; name: string; bio: string; last?: string }) => ({
    handle: String(input.handle || "")
      .replace(/^@+/, "")
      .trim()
      .slice(0, 15),
    name: String(input.name || "").slice(0, 80),
    bio: String(input.bio || "").slice(0, 400),
    last: String(input.last || "").slice(0, 220),
  }))
  .handler(async ({ data }) => {
    if (!data.handle) return { summary: "" };
    const stored = await readStoredProfile(data.handle);
    const fresh =
      stored?.summary_pt &&
      stored.updated_at &&
      Date.now() - Date.parse(stored.updated_at) < 7 * 24 * 60 * 60_000;
    if (fresh) return { summary: stored.summary_pt, usedLlm: false };
    const { getRequest } = await import("@tanstack/react-start/server");
    const { userIdFromHeaders } = await import("@/lib/auth/verify.server");
    const { cronSecret, spendKeyAllowed } = await import("./write-guard");
    const request = getRequest();
    const headers = request?.headers;
    const userId = headers ? await userIdFromHeaders(headers) : "";
    const site = headers?.get("sec-fetch-site") || "";
    const authorization = headers?.get("authorization") || "";
    if (!spendKeyAllowed({ site, userId, authorization }, { cronSecret: cronSecret() })) {
      return { summary: stored?.summary_pt || "", usedLlm: false };
    }
    const summary = await oneLineAbout(data.handle, data.name || data.handle, data.bio);
    return { summary, usedLlm: Boolean(summary && aiKey()) };
  });

export type FoundProfile = Extract<Awaited<ReturnType<typeof lookupXProfile>>, { found: true }>;

export type XUserHit = {
  handle: string;
  name: string;
  avatar: string | null;
  verified: boolean;
  inFeed: boolean;
};

export const searchXUsers = createServerFn({ method: "GET" })
  .validator((input: { q: string }) => ({
    q: String(input.q || "")
      .replace(/^@+/, "")
      .trim()
      .slice(0, 40),
  }))
  .handler(async ({ data }) => {
    const q = data.q;
    if (q.length < 2) return { users: [] as XUserHit[] };
    try {
      const res = await fetch(`https://api.fxtwitter.com/2/typeahead?q=${encodeURIComponent(q)}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) return { users: [] as XUserHit[] };
      const body = (await res.json()) as {
        users?: Array<{
          screen_name?: string;
          name?: string;
          avatar_url?: string;
          verified?: boolean;
          is_blue_verified?: boolean;
        }>;
      };
      const known = new Set(allProfiles().map((p) => p.handle.toLowerCase()));
      const users: XUserHit[] = [];
      const seen = new Set<string>();
      for (const u of body.users ?? []) {
        const handle = String(u.screen_name || "").replace(/^@+/, "");
        if (!handle || seen.has(handle.toLowerCase())) continue;
        seen.add(handle.toLowerCase());
        users.push({
          handle,
          name: String(u.name || handle),
          avatar: typeof u.avatar_url === "string" ? u.avatar_url : null,
          verified: Boolean(u.verified || u.is_blue_verified),
          inFeed: known.has(handle.toLowerCase()),
        });
      }
      return { users };
    } catch {
      return { users: [] as XUserHit[] };
    }
  });
