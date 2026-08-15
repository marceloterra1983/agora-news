import { useEffect, useState } from "react";
import {
  applySettings,
  DEFAULT_SETTINGS,
  readSettings,
  resetSettings,
  SETTINGS_EVENT,
  writeSettings,
  type AppSettings,
} from "./settings";

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const current = readSettings();
    applySettings(current);
    setSettings(current);
    setReady(true);
    const on = (e: Event) => {
      const detail = (e as CustomEvent<AppSettings>).detail;
      setSettings(detail ?? readSettings());
    };
    window.addEventListener(SETTINGS_EVENT, on);
    return () => window.removeEventListener(SETTINGS_EVENT, on);
  }, []);

  return {
    settings,
    ready,
    set: (patch: Partial<AppSettings>) => setSettings(writeSettings(patch)),
    reset: () => setSettings(resetSettings()),
  };
}
