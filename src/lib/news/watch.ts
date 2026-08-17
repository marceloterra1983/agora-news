import { adminHeaders, SUPABASE_URL } from "./admin";

export type WatchAccount = {
  handle: string;
  name: string;
  avatar: string | null;
  summary: string;
  followers: number;
  section: string;
};

function norm(value: string): string {
  return String(value || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
}

function watchFromRow(row: Partial<WatchAccount>): WatchAccount | null {
  const handle = norm(row.handle || "");
  if (!handle) return null;
  return {
    handle,
    name: String(row.name || handle),
    avatar: row.avatar || null,
    summary: String(row.summary || ""),
    followers: Number(row.followers) || 0,
    section: String(row.section || "ai"),
  };
}

async function listWatches(filter = ""): Promise<WatchAccount[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_watches?${filter}select=handle,name,avatar,summary,followers,section&order=updated_at.desc&limit=500`,
    { headers: adminHeaders(), signal: AbortSignal.timeout(6_000) },
  );
  if (!res.ok) throw new Error(`watch_read_${res.status}`);
  const rows = (await res.json()) as Array<Partial<WatchAccount>>;
  if (!Array.isArray(rows)) throw new Error("watch_read_invalid");
  return rows
    .map(watchFromRow)
    .filter((row): row is WatchAccount => Boolean(row));
}

export async function listUserWatchAccounts(
  userId: string,
): Promise<WatchAccount[]> {
  const uid = userId.trim();
  if (!uid) return [];
  return listWatches(`user_id=eq.${encodeURIComponent(uid)}&`);
}

/** Server-only union for cron/ingest. Ownership is never returned to clients. */
export async function listAllWatchAccounts(): Promise<WatchAccount[]> {
  const rows = await listWatches();
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = row.handle.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function registerWatch(
  userId: string,
  input: WatchAccount,
): Promise<boolean> {
  const uid = userId.trim();
  const handle = norm(input.handle);
  if (!uid || !/^[A-Za-z0-9_]{1,15}$/.test(handle)) return false;
  const section = input.section.trim().toLowerCase() || "ai";
  if (!["ai", "tech", "brasil"].includes(section)) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_watches?on_conflict=user_id,section,handle`,
      {
        method: "POST",
        headers: {
          ...adminHeaders(),
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          user_id: uid,
          section,
          handle,
          name: input.name || handle,
          avatar: input.avatar || null,
          summary: input.summary || "",
          followers: Number(input.followers) || 0,
          updated_at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(6_000),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function unregisterWatch(
  userId: string,
  handle: string,
): Promise<boolean> {
  const uid = userId.trim();
  const key = norm(handle);
  if (!uid || !key) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_watches?user_id=eq.${encodeURIComponent(uid)}&handle=eq.${encodeURIComponent(key)}`,
      {
        method: "DELETE",
        headers: adminHeaders(),
        signal: AbortSignal.timeout(6_000),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}
