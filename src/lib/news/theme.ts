export type ThemeMode = "light" | "dark" | "system";

const KEY = "agora-theme";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveDark(mode: ThemeMode = getStoredTheme()): boolean {
  if (mode === "dark") return true;
  if (mode === "light") return false;
  return systemPrefersDark();
}

export function applyTheme(mode?: ThemeMode): void {
  if (typeof document === "undefined") return;
  const resolved = mode ?? getStoredTheme();
  const dark = resolveDark(resolved);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", dark ? "#12100e" : "#f2eee4");
}

export function setTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignore */
  }
  applyTheme(mode);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("agora-theme", { detail: { mode } }));
  }
}

export function cycleTheme(): ThemeMode {
  const cur = getStoredTheme();
  const next: ThemeMode =
    cur === "system" ? "light" : cur === "light" ? "dark" : "system";
  setTheme(next);
  return next;
}

export const THEME_BOOT_SCRIPT = `(()=>{try{var k="agora-theme";var t=localStorage.getItem(k);var d=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);var el=document.documentElement;if(d){el.classList.add("dark");el.style.colorScheme="dark"}else{el.style.colorScheme="light"}}catch(e){}})();`;
