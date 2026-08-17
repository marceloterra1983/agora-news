import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { adminHeaders, SUPABASE_URL } from "./admin";
import type { ExtraFonte } from "./extra-fontes";
import type { CustomGroup } from "./groups";

export type SectionPrefsSlice = {
  groups?: Record<string, string>;
  customGroups?: CustomGroup[];
};

export type CloudPrefs = {
  starred?: string[];
  disabled?: string[];
  notify?: string[];
  extras?: ExtraFonte[];
  settings?: object;
  theme?: string;
  groups?: Record<string, string>;
  customGroups?: CustomGroup[];
  bySection?: Record<string, SectionPrefsSlice>;
};

export async function readUserPrefs(
  userId: string,
): Promise<CloudPrefs | null> {
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
  return prefs as CloudPrefs;
}

export async function writeUserPrefs(
  userId: string,
  prefs: CloudPrefs,
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

export const loadPrefs = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => readUserPrefs(context.userId));

export const savePrefs = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { prefs: CloudPrefs }) => ({
    prefs: input.prefs || {},
  }))
  .handler(async ({ data, context }) => {
    await writeUserPrefs(context.userId, data.prefs);
    return { ok: true };
  });
