import webpush from "web-push";
import { VAPID_PUBLIC_KEY } from "./vapid-public";
import { upsertPosts, deletePost } from "./admin";
import { cloudKvList } from "./cloud-kv";

const VAPID_PRIVATE_KEY = "2Dyn3rcPYyBgCXhA5hl5XHqfn-KFHROrQZJ__Wq7S78";

webpush.setVapidDetails("mailto:agora@news.app", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export type PushSub = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  handles: string[];
};

function subId(endpoint: string) {
  const safe = endpoint.replace(/[^a-zA-Z0-9]/g, "").slice(-48);
  return `push_${safe || "x"}`;
}

export async function savePushSub(sub: PushSub) {
  const now = new Date().toISOString();
  await upsertPosts([
    {
      post_id: subId(sub.endpoint),
      account: "push",
      posted_at: now,
      posted_at_sp: now,
      content: JSON.stringify(sub),
      translation_pt: "",
      summary_pt: sub.handles.join(",").slice(0, 180),
      post_url: sub.endpoint.slice(0, 180),
      media_label: "0",
      image_url: "",
      category: "push",
      batch_name: "push",
      source: "push",
    },
  ]);
}

export async function sendPushForStories(
  stories: Array<{ id: string; source: string; title: string; sourceLabel?: string }>,
) {
  if (!stories.length) return 0;
  const rows = await cloudKvList("push");
  const extras = rows.length
    ? rows
    : [];
  // also read category=push via list - cloudKvList uses category filter
  let sent = 0;
  const payloadStories = stories.slice(0, 3);
  for (const row of extras) {
    let sub: PushSub | null = null;
    try {
      sub = JSON.parse(row.content) as PushSub;
    } catch {
      continue;
    }
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
      if (status === 404 || status === 410) await deletePost(row.id);
    }
  }
  return sent;
}
