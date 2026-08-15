import { loadExtraFontes } from "./extra-fontes";
import { getDisabled, getNotifyHandles, getStarred } from "./fontes-prefs";
import { SETTINGS_KEY } from "./settings";
import { loadPrefs, savePrefs, type CloudPrefs } from "./prefs-server";

export function snapshotPrefs(): CloudPrefs {
  let settings = {};
  let theme = "system";
  try {
    settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}") as object;
    theme = localStorage.getItem("agora-theme") || "system";
  } catch {
    /* ignore */
  }
  return {
    starred: getStarred(),
    disabled: getDisabled(),
    notify: getNotifyHandles(),
    extras: loadExtraFontes(),
    settings,
    theme,
  };
}

function writeLocal(prefs: CloudPrefs) {
  try {
    if (prefs.starred) localStorage.setItem("agora-fontes-starred-v1", JSON.stringify(prefs.starred));
    if (prefs.disabled) localStorage.setItem("agora-fontes-disabled-v1", JSON.stringify(prefs.disabled));
    if (prefs.notify) localStorage.setItem("agora-fontes-notify-v1", JSON.stringify(prefs.notify));
    if (prefs.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(prefs.settings));
    if (prefs.theme) localStorage.setItem("agora-theme", prefs.theme);
    if (prefs.extras?.length) localStorage.setItem("agora-extra-fontes-v1", JSON.stringify(prefs.extras));
    window.dispatchEvent(new Event("agora-fontes-prefs"));
    window.dispatchEvent(new Event("agora-settings"));
  } catch {
    /* quota */
  }
}

export async function pullCloudPrefs(userId: string) {
  const remote = await loadPrefs({ data: { userId } });
  if (!remote) return;
  writeLocal(remote);
}

let timer: number | undefined;
export function pushCloudPrefs(userId: string) {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    void savePrefs({ data: { userId, prefs: snapshotPrefs() } });
  }, 800);
}
