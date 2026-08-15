/** Redis (se houver) → memória. Cloud KV em posts só como fallback lento. */

function env(name: string): string {
  if (typeof process === "undefined" || !process.env) return "";
  return process.env[name] ?? "";
}

function configuredRest(): { url: string; token: string } | null {
  const url = (
    env("UPSTASH_REDIS_REST_URL") ||
    env("KV_REST_API_URL") ||
    env("REDIS_REST_URL") ||
    ""
  ).replace(/\/$/, "");
  const token =
    env("UPSTASH_REDIS_REST_TOKEN") || env("KV_REST_API_TOKEN") || env("REDIS_REST_TOKEN") || "";
  // sem URL real (não usar 127.0.0.1 — só atrasa o probe)
  if (!url || url.includes("127.0.0.1") || url.includes("localhost")) return null;
  if (!token) return null;
  return { url, token };
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
  return Boolean(configuredRest());
}

export function cacheBackend(): "redis" | "memory" {
  if (liveRest) return "redis";
  return "memory";
}

type RedisReply = { result?: unknown; error?: string };

async function redisCmd(cmd: Array<string | number>): Promise<unknown> {
  const cfg = await rest();
  if (!cfg) return null;
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
    signal: AbortSignal.timeout(2_000),
  });
  if (!res.ok) return null;
  const body = (await res.json()) as RedisReply;
  if (body.error) return null;
  return body.result ?? null;
}

function kvId(key: string) {
  return `kv_${key.replace(/[^a-zA-Z0-9_:-]/g, "_").slice(0, 80)}`;
}

/** Cloud KV em posts — só usado como último recurso (não no hot path). */
async function cloudGet(key: string): Promise<string | null> {
  try {
    const url = "https://uqcaodtgrkphuhdkchyh.supabase.co";
    const anon =
      env("SUPABASE_ANON_KEY") ||
      env("VITE_SUPABASE_ANON_KEY") ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxY2FvZHRncmtwaHVoZGtjaHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3MjQ2NjksImV4cCI6MjEwMjMwMDY2OX0.95RVq-3SbT8KpQn8u-cH7lr4LWJvSOTcn5IQxmLhFt8";
    const id = kvId(key);
    const res = await fetch(
      `${url}/rest/v1/posts?post_id=eq.${encodeURIComponent(id)}&select=content,posted_at,media_label&limit=1`,
      {
        headers: { apikey: anon, Authorization: `Bearer ${anon}`, Accept: "application/json" },
        signal: AbortSignal.timeout(2_500),
      },
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<
      { content?: string; posted_at?: string; media_label?: string }
    >;
    const row = rows[0];
    if (!row?.content) return null;
    const ttl = Number(row.media_label) || 0;
    const at = Date.parse(row.posted_at || "");
    if (ttl && Number.isFinite(at) && Date.now() - at > ttl * 1000) return null;
    return row.content;
  } catch {
    return null;
  }
}

async function cloudDel(key: string): Promise<void> {
  try {
    const url = "https://uqcaodtgrkphuhdkchyh.supabase.co";
    const service =
      env("SUPABASE_SERVICE_ROLE_KEY") ||
      env("SUPABASE_SERVICE_KEY") ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVxY2FvZHRncmtwaHVoZGtjaHloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjcyNDY2OSwiZXhwIjoyMTAyMzAwNjY5fQ.DbpfcPf3X0dFQ4UqaSmLVmw17b4nupGN8kGKYmyfhgg";
    const id = kvId(key);
    await fetch(`${url}/rest/v1/posts?post_id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        apikey: service,
        Authorization: `Bearer ${service}`,
      },
      signal: AbortSignal.timeout(3_000),
    });
  } catch {
    /* ignore */
  }
}

/**
 * GET prioritiza memória (0 ms).
 * Redis só se configurado de verdade.
 * Cloud KV só se opts.cloud — evita 50–150 ms no hot path do feed.
 */
export async function cacheGet(key: string, opts?: { cloud?: boolean }): Promise<string | null> {
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

  if (opts?.cloud) {
    const cloud = await cloudGet(key);
    if (cloud) {
      memSet(key, cloud, 45);
      return cloud;
    }
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
  await Promise.all(keys.map((k) => cloudDel(k)));
}

export async function cacheSetNx(key: string, value: string, ttlSec: number): Promise<boolean> {
  try {
    if (await rest()) {
      const out = await redisCmd(["SET", key, value, "EX", String(ttlSec), "NX"]);
      return out === "OK";
    }
  } catch {
    /* fall through */
  }
  if (memGet(key)) return false;
  memSet(key, value, ttlSec);
  return true;
}

export async function cacheGetJson<T>(key: string, opts?: { cloud?: boolean }): Promise<T | null> {
  const raw = await cacheGet(key, opts);
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
  list: (category: string, limit: number) => `agora:v2:list:${category}:${limit}`,
  lock: "agora:v2:lock:ingest",
  newest: "agora:v2:newest",
};

export async function invalidateNewsCache() {
  const keys = [
    CACHE_KEYS.list("ai", 24),
    CACHE_KEYS.list("ai", 40),
    CACHE_KEYS.list("tech", 24),
    CACHE_KEYS.list("tech", 40),
    CACHE_KEYS.list("brasil", 24),
    CACHE_KEYS.list("brasil", 40),
    CACHE_KEYS.newest,
  ];
  await cacheDel(...keys);
}

export function resetCacheProbe() {
  liveRest = undefined;
  liveAt = 0;
}
