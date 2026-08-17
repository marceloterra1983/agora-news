import webpush from "web-push";
import { adminHeaders, SUPABASE_URL } from "./admin";
import { validPushEndpoint } from "./push-core.mjs";
import { vapidConfig } from "./push-config";

export type PushSub = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  handles: string[];
};

type StoredPush = { userId: string; sub: PushSub };

function subId(endpoint: string) {
  const safe = endpoint.replace(/[^a-zA-Z0-9]/g, "").slice(-48);
  return `push_${safe || "x"}`;
}

function cleanSub(sub: PushSub): PushSub | null {
  if (
    !validPushEndpoint(sub.endpoint) ||
    !sub.keys?.p256dh ||
    !sub.keys.auth ||
    sub.keys.p256dh.length > 512 ||
    sub.keys.auth.length > 512
  ) {
    return null;
  }
  const handles = [
    ...new Set(
      (sub.handles || [])
        .map((handle) => String(handle).replace(/^@+/, "").trim().toLowerCase())
        .filter((handle) => /^[a-z0-9_]{1,15}$/.test(handle)),
    ),
  ].slice(0, 100);
  return { endpoint: sub.endpoint, keys: sub.keys, handles };
}

async function listPushSubs(): Promise<StoredPush[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=not.is.null&select=user_id,endpoint,p256dh,auth,handles&limit=500`,
    { headers: adminHeaders(), signal: AbortSignal.timeout(5_000) },
  );
  if (!res.ok) throw new Error(`push_list_${res.status}`);
  const rows = (await res.json()) as Array<{
    user_id?: string | null;
    endpoint?: string;
    p256dh?: string;
    auth?: string;
    handles?: string[];
  }>;
  if (!Array.isArray(rows)) throw new Error("push_list_invalid");
  const out: StoredPush[] = [];
  for (const row of rows) {
    const userId = String(row.user_id || "").trim();
    const sub = cleanSub({
      endpoint: String(row.endpoint || ""),
      keys: { p256dh: String(row.p256dh || ""), auth: String(row.auth || "") },
      handles: Array.isArray(row.handles) ? row.handles.map(String) : [],
    });
    if (userId && sub) out.push({ userId, sub });
  }
  return out;
}

export async function deletePushSub(
  userId: string,
  endpoint: string,
): Promise<boolean> {
  const uid = userId.trim();
  if (!uid || !validPushEndpoint(endpoint)) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(uid)}&endpoint=eq.${encodeURIComponent(endpoint)}`,
      {
        method: "DELETE",
        headers: adminHeaders(),
        signal: AbortSignal.timeout(5_000),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

/** Só o próprio usuário: { saved, handles } — sem endpoint nem a tabela. */
export async function getPushForUser(
  userId: string,
): Promise<{ saved: boolean; handles: string[] }> {
  const uid = userId.trim();
  if (!uid) throw new Error("push_owner_required");
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(uid)}&select=handles&limit=8`,
    { headers: adminHeaders(), signal: AbortSignal.timeout(5_000) },
  );
  if (!res.ok) throw new Error(`push_read_${res.status}`);
  const rows = (await res.json()) as Array<{ handles?: string[] }>;
  if (!Array.isArray(rows)) throw new Error("push_read_invalid");
  if (!rows.length) return { saved: false, handles: [] };
  const handles = [
    ...new Set(
      rows.flatMap((row) =>
        Array.isArray(row.handles) ? row.handles.map(String) : [],
      ),
    ),
  ];
  return { saved: true, handles };
}

export async function savePushSub(
  userId: string,
  input: PushSub,
): Promise<boolean> {
  const uid = userId.trim();
  const sub = cleanSub(input);
  if (!uid || !sub) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?on_conflict=endpoint`,
      {
        method: "POST",
        headers: {
          ...adminHeaders(),
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          id: subId(sub.endpoint),
          user_id: uid,
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
          handles: sub.handles,
          updated_at: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(8_000),
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendPushForStories(
  stories: Array<{
    id: string;
    source: string;
    title: string;
    sourceLabel?: string;
  }>,
  beforeEffect?: () => Promise<void>,
) {
  if (!stories.length) return 0;
  const { publicKey, privateKey } = vapidConfig();
  webpush.setVapidDetails("mailto:agora@news.app", publicKey, privateKey);
  const subscriptions = await listPushSubs();
  let sent = 0;
  for (const row of subscriptions) {
    const watch = new Set(row.sub.handles);
    const hits = stories
      .filter((story) =>
        watch.has(story.source.replace(/^@/, "").toLowerCase()),
      )
      .slice(0, 3);
    if (!hits.length) continue;
    const story = hits[0];
    await beforeEffect?.();
    try {
      await webpush.sendNotification(
        { endpoint: row.sub.endpoint, keys: row.sub.keys },
        JSON.stringify({
          title: story.sourceLabel || `@${story.source}`,
          body: story.title.slice(0, 140),
          url: `/materia/${encodeURIComponent(story.id)}`,
        }),
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await beforeEffect?.();
        await deletePushSub(row.userId, row.sub.endpoint);
      }
    }
  }
  return sent;
}
