/** Redis (se houver) → memória. */

function env(name: string): string {
  if (typeof process === "undefined" || !process.env) return "";
  return process.env[name] ?? "";
}

const REDIS_ENV_PAIRS = [
  ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
  ["REDIS_REST_URL", "REDIS_REST_TOKEN"],
] as const;

function redisRequested(): boolean {
  return REDIS_ENV_PAIRS.some(([url, token]) => env(url) || env(token));
}

function configuredRest(): { url: string; token: string } | null {
  let configured: { url: string; token: string } | null = null;
  for (const [urlName, tokenName] of REDIS_ENV_PAIRS) {
    const url = env(urlName).replace(/\/$/, "");
    const token = env(tokenName);
    if (!url && !token) continue;
    if (!url || !token) return null;
    configured ??= { url, token };
  }
  if (
    configured?.url.includes("127.0.0.1") ||
    configured?.url.includes("localhost")
  ) {
    return null;
  }
  return configured;
}

type Mem = { value: string; exp: number };
const memory = new Map<string, Mem>();

function memGet(key: string): string | null {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.exp && hit.exp < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

function memSet(key: string, value: string, ttlSec?: number) {
  memory.set(key, {
    value,
    exp: ttlSec && ttlSec > 0 ? Date.now() + ttlSec * 1000 : 0,
  });
}

let liveRest: { url: string; token: string } | null | undefined;
let liveAt = 0;

async function rest(): Promise<{ url: string; token: string } | null> {
  if (liveRest && Date.now() - liveAt < 60_000) return liveRest;
  // negação recente: não re-probe a cada request
  if (liveRest === null && Date.now() - liveAt < 15_000) return null;
  const cfg = configuredRest();
  if (!cfg) {
    liveRest = null;
    liveAt = Date.now();
    return null;
  }
  try {
    const probe = await fetch(`${cfg.url}/ping`, {
      headers: { Authorization: `Bearer ${cfg.token}` },
      signal: AbortSignal.timeout(600),
    });
    if (probe.ok) {
      liveRest = cfg;
      liveAt = Date.now();
      return cfg;
    }
    if (cfg.url.includes("upstash.io") || cfg.url.includes("vercel-storage")) {
      liveRest = cfg;
      liveAt = Date.now();
      return cfg;
    }
  } catch {
    if (cfg.url.includes("upstash.io") || cfg.url.includes("vercel-storage")) {
      liveRest = cfg;
      liveAt = Date.now();
      return cfg;
    }
  }
  liveRest = null;
  liveAt = Date.now();
  return null;
}

export function redisConfigured(): boolean {
  if (liveRest) return true;
  return redisRequested();
}

export function cacheBackend(): "redis" | "memory" {
  if (liveRest) return "redis";
  return "memory";
}

type RedisReply = { result?: unknown; error?: string };

async function redisCmd(cmd: Array<string | number>): Promise<unknown> {
  const cfg = await rest();
  if (!cfg) throw new Error("redis_unavailable");
  let res: Response;
  try {
    res = await fetch(cfg.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cmd),
      signal: AbortSignal.timeout(2_000),
    });
  } catch {
    throw new Error("redis_unavailable");
  }
  if (!res.ok) throw new Error("redis_unavailable");
  let body: RedisReply;
  try {
    body = (await res.json()) as RedisReply;
  } catch {
    throw new Error("redis_unavailable");
  }
  if (body.error || !("result" in body)) throw new Error("redis_unavailable");
  return body.result ?? null;
}

/**
 * GET prioritiza memória (0 ms).
 * Redis só se configurado de verdade.
 */
export async function cacheGet(key: string): Promise<string | null> {
  const mem = memGet(key);
  if (mem) return mem;

  try {
    const out = await redisCmd(["GET", key]);
    if (typeof out === "string") {
      memSet(key, out, 60);
      return out;
    }
  } catch {
    /* next */
  }

  return null;
}

export async function cacheSet(key: string, value: string, ttlSec = 60): Promise<void> {
  memSet(key, value, ttlSec);
  try {
    await redisCmd(["SET", key, value, "EX", String(ttlSec)]);
  } catch {
    /* memory already set */
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  for (const key of keys) memory.delete(key);
  if (!keys.length) return;
  try {
    await redisCmd(["DEL", ...keys]);
  } catch {
    /* ignore */
  }
}

export async function cacheSetNx(key: string, value: string, ttlSec: number): Promise<boolean> {
  if (redisConfigured()) {
    try {
      const out = await redisCmd(["SET", key, value, "EX", String(ttlSec), "NX"]);
      if (out === "OK") return true;
      if (out === null) return false;
    } catch {
      throw new Error("redis_lease_unavailable");
    }
    throw new Error("redis_lease_unavailable");
  }
  if (memGet(key)) return false;
  memSet(key, value, ttlSec);
  return true;
}

const RENEW_LEASE =
  'if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("EXPIRE", KEYS[1], ARGV[2]) end return 0';
const RELEASE_LEASE =
  'if redis.call("GET", KEYS[1]) == ARGV[1] then return redis.call("DEL", KEYS[1]) end return 0';

export async function renewCacheLease(
  key: string,
  token: string,
  ttlSec: number,
): Promise<boolean> {
  if (redisConfigured()) {
    try {
      if (!(await rest())) return false;
      return Number(
        await redisCmd(["EVAL", RENEW_LEASE, "1", key, token, String(ttlSec)]),
      ) === 1;
    } catch {
      return false;
    }
  }
  if (memGet(key) !== token) return false;
  memSet(key, token, ttlSec);
  return true;
}

export async function releaseCacheLease(
  key: string,
  token: string,
): Promise<boolean> {
  if (redisConfigured()) {
    try {
      if (!(await rest())) return false;
      return Number(
        await redisCmd(["EVAL", RELEASE_LEASE, "1", key, token]),
      ) === 1;
    } catch {
      return false;
    }
  }
  if (memGet(key) !== token) return false;
  memory.delete(key);
  return true;
}

export async function cacheGetJson<T>(key: string): Promise<T | null> {
  const raw = await cacheGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function cacheSetJson(key: string, value: unknown, ttlSec = 60): Promise<void> {
  await cacheSet(key, JSON.stringify(value), ttlSec);
}

export const CACHE_KEYS = {
  lock: "agora:v2:lock:ingest",
  newest: "agora:v2:newest",
  scanCursor: "agora:v2:scan",
  rssEtag: "agora:v3:rss:",
};

export function resetCacheProbe() {
  liveRest = undefined;
  liveAt = 0;
}
