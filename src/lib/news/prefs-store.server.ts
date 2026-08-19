/** Server-only. Vite must not ship this to the browser — keep the `.server` suffix. */
import { adminHeaders, SUPABASE_URL } from "./admin";
import { mergePrefsPreservingLlm, stripLlmFromPrefs } from "./llm-accounts.mjs";
import type { CloudPrefs } from "./prefs-server";

export async function readUserPrefsRaw(
  userId: string,
): Promise<Record<string, unknown> | null> {
  const uid = userId.trim();
  if (!uid) throw new Error("prefs_owner_required");
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_prefs?user_id=eq.${encodeURIComponent(uid)}&select=prefs&limit=1`,
    { headers: adminHeaders(), signal: AbortSignal.timeout(5_000) },
  );
  if (!res.ok) throw new Error(`prefs_read_${res.status}`);
  const rows = (await res.json()) as Array<{ prefs?: unknown }>;
  if (!Array.isArray(rows)) throw new Error("prefs_read_invalid");
  const prefs = rows[0]?.prefs;
  if (prefs === undefined) return null;
  if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) {
    throw new Error("prefs_read_invalid");
  }
  return prefs as Record<string, unknown>;
}

export async function writeUserPrefsRaw(
  userId: string,
  prefs: Record<string, unknown>,
): Promise<void> {
  const uid = userId.trim();
  if (!uid) throw new Error("prefs_owner_required");
  if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) {
    throw new Error("prefs_write_invalid");
  }
  if (JSON.stringify(prefs).length > 262_144) {
    throw new Error("prefs_write_too_large");
  }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_prefs?on_conflict=user_id`,
    {
      method: "POST",
      headers: {
        ...adminHeaders(),
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        user_id: uid,
        prefs,
        updated_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(8_000),
    },
  );
  if (!res.ok) throw new Error(`prefs_write_${res.status}`);
}

export async function readUserPrefs(
  userId: string,
): Promise<CloudPrefs | null> {
  const raw = await readUserPrefsRaw(userId);
  if (!raw) return null;
  return stripLlmFromPrefs(raw) as CloudPrefs;
}

export async function writeUserPrefs(
  userId: string,
  prefs: CloudPrefs,
): Promise<void> {
  if (!prefs || typeof prefs !== "object" || Array.isArray(prefs)) {
    throw new Error("prefs_write_invalid");
  }
  const existing = await readUserPrefsRaw(userId);
  await writeUserPrefsRaw(
    userId,
    mergePrefsPreservingLlm(prefs as Record<string, unknown>, existing),
  );
}
