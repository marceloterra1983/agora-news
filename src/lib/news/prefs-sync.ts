import { loadExtraFontes, replaceExtraFontes } from "./extra-fontes";
import { getDisabled, getGroupOverrides, getNotifyHandles, getStarred, setGroupOverrides } from "./fontes-prefs";
import { loadCustomGroups, replaceCustomGroups } from "./groups";
import { applyBySection, snapshotBySection } from "./section-prefs.mjs";
import { applySettings, readSettings, SETTINGS_KEY } from "./settings";
import { applyTheme, type ThemeMode } from "./theme";
import { DEFAULT_SECTION } from "./types";
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
    groups: getGroupOverrides(DEFAULT_SECTION),
    customGroups: loadCustomGroups(DEFAULT_SECTION),
    bySection: snapshotBySection(),
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
    if (prefs.bySection) applyBySection(prefs.bySection);
    else {
      if (prefs.groups) setGroupOverrides(prefs.groups, DEFAULT_SECTION);
      if (Array.isArray(prefs.customGroups)) replaceCustomGroups(prefs.customGroups, DEFAULT_SECTION);
    }
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
