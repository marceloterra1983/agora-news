import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import {
  applyTheme,
  cycleTheme,
  getStoredTheme,
  resolveDark,
  type ThemeMode,
} from "@/lib/news/theme";
import { Tip } from "./icon-btn";

const TITLE: Record<ThemeMode, string> = {
  system: "Tema do sistema",
  light: "Tema claro",
  dark: "Tema escuro",
};

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    applyTheme();
    setMode(getStoredTheme());
    const onCustom = () => setMode(getStoredTheme());
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onMq = () => {
      if (getStoredTheme() === "system") applyTheme("system");
    };
    window.addEventListener("agora-theme", onCustom);
    mq.addEventListener("change", onMq);
    return () => {
      window.removeEventListener("agora-theme", onCustom);
      mq.removeEventListener("change", onMq);
    };
  }, []);

  const dark = resolveDark(mode);
  const Icon = mode === "system" ? Monitor : dark ? Moon : Sun;

  return (
    <Tip label={TITLE[mode]}>
      <button
        type="button"
        data-theme-toggle=""
        onClick={() => setMode(cycleTheme())}
        aria-label={TITLE[mode]}
        className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-card text-ink"
      >
        <Icon className="size-3.5" strokeWidth={2.2} />
      </button>
    </Tip>
  );
}
