import webpush from "web-push";
import { VAPID_PUBLIC_KEY } from "./vapid-public";
import { adminHeaders, deletePost, SUPABASE_URL } from "./admin";
import { cloudKvListPrefix, cloudKvSet } from "./cloud-kv";

const VAPID_PRIVATE_KEY = "2Dyn3rcPYyBgCXhA5hl5XHqfn-KFHROrQZJ__Wq7S78";
const PUSH_TTL = 60 * 60 * 24 * 365;

webpush.setVapidDetails("mailto:agora@news.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export type PushSub = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  handles: string[];
  userId?: string;
};

function subId(endpoint: string) {
  const safe = endpoint.replace(/[^a-zA-Z0-9]/g, "").slice(-48);
  return `push_${safe || "x"}`;
}

function parseSub(raw: string): PushSub | null {
  try {
    const sub = JSON.parse(raw) as PushSub;
    if (!sub?.endpoint || !sub.keys?.p256dh) return null;
    return sub;
  } catch {
    return null;
  }
}

async function upsertPushTable(id: string, sub: PushSub): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?on_conflict=id`, {
      method: "POST",
      headers: {
        ...adminHeaders(),
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        handles: sub.handles || [],
        user_id: sub.userId || null,
        updated_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(8_000),
    });
    return res.ok || res.status === 201;
  } catch {
    return false;
  }
}

async function listPushTable(): Promise<Array<{ id: string; sub: PushSub }> | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth,handles,user_id&limit=200`,
      { headers: adminHeaders(), signal: AbortSignal.timeout(5_000) },
    );
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok) return null;
    const rows = (await res.json()) as Array<{
      id?: string;
      endpoint?: string;
      p256dh?: string;
      auth?: string;
      handles?: string[];
      user_id?: string | null;
    }>;
    return rows
      .filter((r) => r.id && r.endpoint && r.p256dh && r.auth)
      .map((r) => ({
        id: String(r.id),
        sub: {
          endpoint: String(r.endpoint),
          keys: { p256dh: String(r.p256dh), auth: String(r.auth) },
          handles: Array.isArray(r.handles) ? r.handles.map(String) : [],
          userId: r.user_id || undefined,
        },
      }));
  } catch {
    return null;
  }
}

async function listLegacyPushPosts(): Promise<Array<{ id: string; sub: PushSub }>> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/posts?category=eq.push&select=post_id,content&limit=200`,
      { headers: adminHeaders(), signal: AbortSignal.timeout(5_000) },
    );
    if (!res.ok) return [];
    const rows = (await res.json()) as Array<{ post_id?: string; content?: string }>;
    const out: Array<{ id: string; sub: PushSub }> = [];
    for (const row of rows) {
      if (!row.post_id || !row.content) continue;
      const sub = parseSub(row.content);
      if (sub) out.push({ id: String(row.post_id), sub });
    }
    return out;
  } catch {
    return [];
  }
}

async function listKvPush(): Promise<Array<{ id: string; sub: PushSub }>> {
  const rows = await cloudKvListPrefix("push:");
  const out: Array<{ id: string; sub: PushSub }> = [];
  for (const row of rows) {
    const sub = parseSub(row.content);
    if (sub) out.push({ id: row.id, sub });
  }
  return out;
}

async function listPushSubs(): Promise<Array<{ id: string; sub: PushSub }>> {
  const table = await listPushTable();
  const extras = [...(await listKvPush()), ...(await listLegacyPushPosts())];
  if (table) {
    for (const row of extras) {
      const tableId = row.id.startsWith("kv_push:") ? row.id.slice("kv_push:".length) : row.id;
      const ok = await upsertPushTable(tableId, row.sub);
      if (ok) await deletePost(row.id);
    }
    const again = await listPushTable();
    return again ?? [...table, ...extras];
  }
  return extras;
}

export async function savePushSub(sub: PushSub) {
  const id = subId(sub.endpoint);
  const tableOk = await upsertPushTable(id, sub);
  if (tableOk) return;
  await cloudKvSet(`push:${id}`, JSON.stringify(sub), PUSH_TTL);
}

export async function sendPushForStories(
  stories: Array<{ id: string; source: string; title: string; sourceLabel?: string }>,
) {
  if (!stories.length) return 0;
  const extras = await listPushSubs();
  let sent = 0;
  const payloadStories = stories.slice(0, 3);
  for (const row of extras) {
    const sub = row.sub;
    if (!sub?.endpoint || !sub.keys?.p256dh) continue;
    const watch = new Set((sub.handles || []).map((h) => h.toLowerCase()));
    const hits = payloadStories.filter((s) => watch.has(s.source.replace(/^@/, "").toLowerCase()));
    if (!hits.length) continue;
    const story = hits[0];
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify({
          title: story.sourceLabel || `@${story.source}`,
          body: story.title.slice(0, 140),
          url: `/materia/${encodeURIComponent(story.id)}`,
        }),
      );
      sent += 1;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await deletePost(row.id);
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(row.id)}`, {
            method: "DELETE",
            headers: adminHeaders(),
            signal: AbortSignal.timeout(5_000),
          });
        } catch {
          /* table may be absent */
        }
      }
    }
  }
  return sent;
}
