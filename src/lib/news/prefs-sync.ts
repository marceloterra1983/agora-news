import { loadExtraFontes, replaceExtraFontes } from "./extra-fontes";
import { getDisabled, getGroupOverrides, getNotifyHandles, getStarred, setGroupOverrides } from "./fontes-prefs";
import { loadCustomGroups, replaceCustomGroups } from "./groups";
import { applySettings, readSettings, SETTINGS_KEY } from "./settings";
import { applyTheme, type ThemeMode } from "./theme";
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
    groups: getGroupOverrides(),
    customGroups: loadCustomGroups(),
  };
}

function themeMode(raw: string | undefined): ThemeMode {
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

function writeLocal(prefs: CloudPrefs) {
  try {
    if (prefs.starred) localStorage.setItem("agora-fontes-starred-v1", JSON.stringify(prefs.starred));
    if (prefs.disabled) localStorage.setItem("agora-fontes-disabled-v1", JSON.stringify(prefs.disabled));
    if (prefs.notify) localStorage.setItem("agora-fontes-notify-v1", JSON.stringify(prefs.notify));
    if (prefs.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(prefs.settings));
    if (prefs.theme) localStorage.setItem("agora-theme", themeMode(prefs.theme));
    if (Array.isArray(prefs.extras)) replaceExtraFontes(prefs.extras);
    if (prefs.groups) setGroupOverrides(prefs.groups);
    if (Array.isArray(prefs.customGroups)) replaceCustomGroups(prefs.customGroups);
    applySettings(readSettings());
    applyTheme(themeMode(prefs.theme));
    window.dispatchEvent(new Event("agora-fontes-prefs"));
    window.dispatchEvent(new Event("agora-settings"));
    window.dispatchEvent(new CustomEvent("agora-theme", { detail: { mode: themeMode(prefs.theme) } }));
  } catch {
    /* quota */
  }
}

export async function pullCloudPrefs(_userId?: string) {
  const remote = await loadPrefs();
  if (!remote) return;
  writeLocal(remote);
}

let timer: number | undefined;
export function pushCloudPrefs(_userId?: string) {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    void savePrefs({ data: { prefs: snapshotPrefs() } });
  }, 800);
}
