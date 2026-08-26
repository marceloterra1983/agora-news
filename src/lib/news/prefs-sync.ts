import { loadExtraFontes, replaceExtraFontes } from "./extra-fontes";
import { loadRssFeeds, replaceRssFeeds } from "./rss-feeds";
import {
  clearFontesPrefsDirty,
  getDisabled,
  getFontesRev,
  getGroupOverrides,
  getNotifyHandles,
  getStarred,
  isFontesPrefsDirty,
  setFontesRev,
  setGroupOverrides,
} from "./fontes-prefs";
import { loadCustomGroups, replaceCustomGroups } from "./groups";
import { mergeCloudPrefs } from "./prefs-merge";
import { applyBySection, snapshotBySection } from "./section-prefs.mjs";
import { applySettings, readSettings, SETTINGS_KEY } from "./settings";
import { applyTheme, type ThemeMode } from "./theme";
import { DEFAULT_SECTION } from "./types";
import { loadPrefs, savePrefs, type CloudPrefs } from "./prefs-server";

function fontesSignature(prefs: {
  starred?: string[];
  disabled?: string[];
  notify?: string[];
  groups?: Record<string, string>;
}): string {
  return JSON.stringify({
    starred: prefs.starred ?? [],
    disabled: prefs.disabled ?? [],
    notify: prefs.notify ?? [],
    groups: prefs.groups ?? {},
  });
}

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
    rssFeeds: loadRssFeeds(),
    settings,
    theme,
    groups: getGroupOverrides(DEFAULT_SECTION),
    customGroups: loadCustomGroups(DEFAULT_SECTION),
    bySection: snapshotBySection(),
    fontesRev: getFontesRev(),
  };
}

function themeMode(raw: string | undefined): ThemeMode {
  return raw === "light" || raw === "dark" || raw === "system" ? raw : "system";
}

function writeLocal(prefs: CloudPrefs) {
  const before = fontesSignature(snapshotPrefs());
  try {
    if (prefs.starred != null) {
      localStorage.setItem("agora-fontes-starred-v1", JSON.stringify(prefs.starred));
    }
    if (prefs.disabled != null) {
      localStorage.setItem("agora-fontes-disabled-v1", JSON.stringify(prefs.disabled));
    }
    if (prefs.notify != null) {
      localStorage.setItem("agora-fontes-notify-v1", JSON.stringify(prefs.notify));
    }
    if (prefs.fontesRev) setFontesRev(prefs.fontesRev);
    if (prefs.settings) localStorage.setItem(SETTINGS_KEY, JSON.stringify(prefs.settings));
    if (prefs.theme) localStorage.setItem("agora-theme", themeMode(prefs.theme));
    if (Array.isArray(prefs.extras)) replaceExtraFontes(prefs.extras, { fromRemote: true });
    if (Array.isArray(prefs.rssFeeds)) replaceRssFeeds(prefs.rssFeeds, { silent: true });
    if (prefs.bySection) applyBySection(prefs.bySection, false);
    else {
      if (prefs.groups) setGroupOverrides(prefs.groups, DEFAULT_SECTION, false);
      if (Array.isArray(prefs.customGroups)) {
        replaceCustomGroups(prefs.customGroups, DEFAULT_SECTION, false);
      }
    }
    applySettings(readSettings());
    applyTheme(themeMode(prefs.theme));
    const after = fontesSignature({
      starred: getStarred(),
      disabled: getDisabled(),
      notify: getNotifyHandles(),
      groups: getGroupOverrides(DEFAULT_SECTION),
    });
    if (before !== after) {
      window.dispatchEvent(new CustomEvent("agora-fontes-prefs", { detail: { fromRemote: true } }));
    }
    window.dispatchEvent(
      new CustomEvent("agora-settings", { detail: { ...readSettings(), fromRemote: true } }),
    );
    window.dispatchEvent(
      new CustomEvent("agora-theme", { detail: { fromRemote: true, mode: themeMode(prefs.theme) } }),
    );
  } catch {
    /* quota */
  }
}

export function applyRemotePrefs(remote: CloudPrefs) {
  writeLocal(mergeCloudPrefs(remote, snapshotPrefs(), isFontesPrefsDirty()));
}

export async function pullCloudPrefs(_userId?: string) {
  const remote = await loadPrefs();
  if (!remote) return false;
  applyRemotePrefs(remote);
  return true;
}

let timer: number | undefined;
export function pushCloudPrefs(_userId?: string) {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    void savePrefs({ data: { prefs: snapshotPrefs() } }).then(
      () => clearFontesPrefsDirty(),
      () => undefined,
    );
  }, 800);
}
