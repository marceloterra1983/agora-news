import { useEffect, useState } from "react";
import { normalizeFontSize } from "./font-scale";
import {
  applySettings,
  DEFAULT_SETTINGS,
  readSettings,
  resetSettings,
  SETTINGS_EVENT,
  writeSettings,
  type AppSettings,
} from "./settings";

function withFont(patch: Partial<AppSettings>): Partial<AppSettings> {
  if (!patch.fontSize) return patch;
  return { ...patch, fontSize: normalizeFontSize(patch.fontSize) };
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = readSettings();
    const fontSize = normalizeFontSize(current.fontSize);
    const next = fontSize === current.fontSize ? current : writeSettings({ fontSize });
    applySettings(next);
    setSettings(next);
    setReady(true);
    const on = (e: Event) => {
      const detail = (e as CustomEvent<AppSettings>).detail;
      const raw = detail ?? readSettings();
      setSettings({ ...raw, fontSize: normalizeFontSize(raw.fontSize) });
    };
    window.addEventListener(SETTINGS_EVENT, on);
    return () => window.removeEventListener(SETTINGS_EVENT, on);
  }, []);

  return {
    settings,
    ready,
    set: (patch: Partial<AppSettings>) => setSettings(writeSettings(withFont(patch))),
    reset: () => setSettings(resetSettings()),
  };
}
