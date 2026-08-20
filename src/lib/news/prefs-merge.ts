import type { CloudPrefs } from "./prefs-server";

/**
 * Cloud pull must not replay an older snapshot over a local write that
 * has not been pushed yet (pause/star/notify).
 */
export function mergeCloudPrefs(
  remote: CloudPrefs,
  local: CloudPrefs,
  localDirty: boolean,
): CloudPrefs {
  if (!localDirty) return remote;
  return {
    ...remote,
    starred: local.starred ?? remote.starred,
    disabled: local.disabled ?? remote.disabled,
    notify: local.notify ?? remote.notify,
  };
}
