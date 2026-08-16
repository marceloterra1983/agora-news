import { PAGE_SIZE } from "./page-size.mjs";
import { rotateFrom } from "./ingest-scan-core.mjs";
import { profilesFor } from "./profiles";
import { listKnownSections } from "./sections";
import { listWatchAccounts } from "./watch";
import { SUPABASE_ANON_KEY, SUPABASE_POSTS_URL } from "./supabase";
import { CACHE_KEYS, cacheGetJson, cacheSetJson } from "./cache";

const AUTH = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

function take(list: string[], room: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const handle of list) {
    const key = handle.toLowerCase();
    if (!handle || seen.has(key)) continue;
    seen.add(key);
    out.push(handle);
    if (out.length >= room) break;
  }
  return out;
}

/** Prefixo rotativo: a cauda do catálogo entra no próximo cron. */
export async function handlesToScan(limit: number): Promise<{ catalog: string[]; extra: string[] }> {
  const catalog = listKnownSections().flatMap((s) =>
    profilesFor(s).map((p) => p.handle.replace(/^@/, "")),
  );
  const extra = (await listWatchAccounts()).map((w) => w.handle.replace(/^@/, ""));
  const extras = take(extra, Math.min(16, limit));
  const cursor = Number((await cacheGetJson<number>(CACHE_KEYS.scanCursor)) || 0);
  const { start, rotated } = rotateFrom(catalog, cursor);
  const mains = take(
    rotated.filter((h) => !extras.some((e) => e.toLowerCase() === h.toLowerCase())),
    Math.max(0, limit - extras.length),
  );
  if (catalog.length) {
    void cacheSetJson(CACHE_KEYS.scanCursor, (start + mains.length) % catalog.length, 86_400);
  }
  return { catalog: mains, extra: extras };
}

/** Newest por seção — Tech/Brasil entram no skip de 10 min. */
export async function latestByAccount(): Promise<Map<string, number>> {
  const cached = await cacheGetJson<Array<[string, number]>>(CACHE_KEYS.newest);
  if (cached?.length) return new Map(cached);
  const out = new Map<string, number>();
  try {
    for (const section of listKnownSections()) {
      const res = await fetch(
        `${SUPABASE_POSTS_URL}?select=account,posted_at&category=eq.${section}&order=posted_at.desc&limit=${PAGE_SIZE * 2}`,
        { headers: AUTH, signal: AbortSignal.timeout(5_000) },
      );
      if (!res.ok) continue;
      const rows = (await res.json()) as Array<{ account?: string; posted_at?: string }>;
      for (const row of rows) {
        const key = (row.account || "").replace(/^@+/, "").toLowerCase();
        if (!key || out.has(key)) continue;
        const at = Date.parse(row.posted_at || "");
        if (Number.isFinite(at)) out.set(key, at);
      }
    }
    if (out.size) void cacheSetJson(CACHE_KEYS.newest, [...out.entries()], 60);
  } catch {
    /* scan everyone */
  }
  return out;
}
