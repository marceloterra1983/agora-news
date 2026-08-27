/** Persiste os 10 últimos tweets do perfil sem mexer no arquivo do feed. */
import { upsertProfile } from "./admin";
import { profileFieldsFromAuthor } from "./ingest-profile-core.mjs";
import { persistLastPost } from "./last-post-store";
import { fetchLastPosts, recentFromPosts, type StoredLastPost } from "./last-post";
import { mapPool } from "./map-pool";
import {
  PROFILE_LAST_KEEP,
  keepLastPosts,
  packLastPosts,
  unpackLastPosts,
} from "./profile-last.mjs";
import { allProfiles, profileByHandle } from "./profiles";
import { readStoredProfile } from "./profile-store";
import { listAllWatchAccounts } from "./watch";

export type PackedPersist = {
  handle: string;
  ok: boolean;
  count: number;
  error?: string;
};

export async function persistPackedLastPosts(
  handle: string,
  incoming: StoredLastPost[] | null,
  beforeWrite?: () => Promise<void>,
  author?: Parameters<typeof profileFieldsFromAuthor>[1],
): Promise<PackedPersist> {
  const key = handle.replace(/^@+/, "").trim();
  if (!key) return { handle, ok: false, count: 0, error: "empty_handle" };
  const prev = await readStoredProfile(key).catch(() => null);
  const fetched = incoming ?? (await fetchLastPosts(key));
  const fromDb = await recentFromPosts(key);
  const kept = keepLastPosts(prev?.last_posts ?? unpackLastPosts(prev?.last_post), [
    ...fromDb,
    ...fetched,
  ]);
  if (!kept.length) return { handle: key, ok: false, count: 0, error: "no_posts" };
  const packed = packLastPosts(kept);
  const catalog = profileByHandle(key);
  const patch = profileFieldsFromAuthor(key, author ?? null, {
    name: prev?.name,
    bio: prev?.bio,
    avatar: prev?.avatar,
    followers: prev?.followers,
  });
  await beforeWrite?.();
  const written = await upsertProfile({
    handle: key,
    name: prev?.name || catalog?.name || key,
    bio: patch.bio,
    summary_pt: prev?.summary_pt || catalog?.blurb || "",
    avatar: patch.avatar,
    followers: patch.followers,
    last_post: packed,
  });
  if (kept[0]) await persistLastPost(key, kept[0], beforeWrite);
  return { handle: key, ok: written, count: kept.length, error: written ? undefined : "upsert_failed" };
}

export async function backfillAllProfileLastPosts(opts?: {
  pool?: number;
  beforeWrite?: () => Promise<void>;
}): Promise<{ total: number; results: PackedPersist[] }> {
  const watch = await listAllWatchAccounts().catch(() => []);
  const handles = [
    ...new Set([
      ...allProfiles().map((p) => p.handle.replace(/^@+/, "").trim()),
      ...watch.map((w) => w.handle.replace(/^@+/, "").trim()),
    ]),
  ].filter(Boolean);
  const results = await mapPool(handles, opts?.pool ?? 4, (handle) =>
    persistPackedLastPosts(handle, null, opts?.beforeWrite).catch(
      (error: unknown): PackedPersist => ({
        handle,
        ok: false,
        count: 0,
        error: error instanceof Error ? error.message : "backfill_failed",
      }),
    ),
  );
  return { total: handles.length, results };
}

export { PROFILE_LAST_KEEP };
