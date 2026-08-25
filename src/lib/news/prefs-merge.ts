import type { CloudPrefs, FontesRev } from "./prefs-server";

type FontesField = "starred" | "disabled" | "notify" | "groups";

function parseTs(iso?: string | null): number {
  const t = Date.parse(String(iso || ""));
  return Number.isFinite(t) ? t : 0;
}

function fieldTs(prefs: CloudPrefs, field: FontesField): number {
  return parseTs(prefs.fontesRev?.[field]) || parseTs(prefs.updatedAt);
}

function pickField<K extends FontesField>(
  field: K,
  remote: CloudPrefs,
  local: CloudPrefs,
  localDirty: boolean,
): { value: CloudPrefs[K]; rev?: string; side: "local" | "remote" } {
  const rTs = fieldTs(remote, field);
  const lTs = fieldTs(local, field);
  const takeLocal = () => ({
    value: (local[field] ?? remote[field]) as CloudPrefs[K],
    rev: local.fontesRev?.[field] ?? remote.fontesRev?.[field],
    side: "local" as const,
  });
  const takeRemote = () => ({
    value: remote[field] as CloudPrefs[K],
    rev: remote.fontesRev?.[field] ?? remote.updatedAt,
    side: "remote" as const,
  });

  if (rTs && lTs) return rTs > lTs ? takeRemote() : takeLocal();
  if (rTs && !lTs) return localDirty ? takeLocal() : takeRemote();
  if (!rTs && lTs) return takeLocal();
  return localDirty ? takeLocal() : takeRemote();
}

/**
 * LWW per fontes field (star/disabled/notify/group).
 * Dirty local still wins when the snapshot is older or has no timestamp (#83).
 */
export function mergeCloudPrefs(
  remote: CloudPrefs,
  local: CloudPrefs,
  localDirty: boolean,
): CloudPrefs {
  const starred = pickField("starred", remote, local, localDirty);
  const disabled = pickField("disabled", remote, local, localDirty);
  const notify = pickField("notify", remote, local, localDirty);
  const groups = pickField("groups", remote, local, localDirty);
  const fontesRev: FontesRev = {
    starred: starred.rev,
    disabled: disabled.rev,
    notify: notify.rev,
    groups: groups.rev,
  };

  return {
    ...remote,
    starred: starred.value,
    disabled: disabled.value,
    notify: notify.value,
    groups: groups.value,
    ...(groups.side === "local"
      ? {
          bySection: local.bySection ?? remote.bySection,
          customGroups: local.customGroups ?? remote.customGroups,
        }
      : {}),
    fontesRev,
    rssFeeds: Array.isArray(remote.rssFeeds) ? remote.rssFeeds : local.rssFeeds,
    updatedAt: remote.updatedAt,
  };
}
