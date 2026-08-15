export type FontSize = "sm" | "md" | "lg" | "xl";
export type Density = "regular" | "compact";
export type Typeface = "literata" | "source" | "newsreader" | "fraunces" | "sans";

export type AppSettings = {
  fontSize: FontSize;
  density: Density;
  typeface: Typeface;
  showImages: boolean;
  highlightUnread: boolean;
  reduceMotion: boolean;
};

export const SETTINGS_KEY = "agora-settings-v3";
export const SETTINGS_EVENT = "agora-settings";

export const TYPEFACES: {
  id: Typeface;
  label: string;
  hint: string;
  href: string | null;
}[] = [
  {
    id: "literata",
    label: "Literata",
    hint: "Feita para livro digital",
    href: "https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,500;7..72,600&display=swap",
  },
  {
    id: "source",
    label: "Source Serif",
    hint: "Clara e neutra",
    href: "https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,500;8..60,600&display=swap",
  },
  {
    id: "newsreader",
    label: "Newsreader",
    hint: "Manchete de jornal",
    href: "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap",
  },
  {
    id: "fraunces",
    label: "Fraunces",
    hint: "Quente, com personalidade",
    href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&display=swap",
  },
  {
    id: "sans",
    label: "Source Sans",
    hint: "Sem serifa",
    href: null,
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: "md",
  density: "regular",
  typeface: "literata",
  showImages: true,
  highlightUnread: true,
  reduceMotion: false,
};

export const FONT_STEPS: { id: FontSize; label: string }[] = [
  { id: "sm", label: "A" },
  { id: "md", label: "A" },
  { id: "lg", label: "A" },
  { id: "xl", label: "A" },
];

function parseTypeface(value: unknown): Typeface {
  if (value === "source" || value === "newsreader" || value === "fraunces" || value === "sans" || value === "literata") {
    return value;
  }
  if (value === "serif") return "literata";
  return "literata";
}

function parse(raw: unknown): AppSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_SETTINGS };
  const o = raw as Partial<AppSettings>;
  return {
    fontSize: o.fontSize === "sm" || o.fontSize === "lg" || o.fontSize === "xl" ? o.fontSize : "md",
    density: o.density === "compact" ? "compact" : "regular",
    typeface: parseTypeface(o.typeface),
    showImages: o.showImages !== false,
    highlightUnread: o.highlightUnread !== false,
    reduceMotion: o.reduceMotion === true,
  };
}

export function readSettings(): AppSettings {
  if (typeof window === "undefined") return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return parse(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function applySettings(next: AppSettings) {
  if (typeof document === "undefined") return;
  const el = document.documentElement;
  el.dataset.font = next.fontSize;
  el.dataset.density = next.density;
  el.dataset.type = next.typeface;
  el.dataset.images = next.showImages ? "on" : "off";
  el.dataset.unread = next.highlightUnread ? "on" : "off";
  el.dataset.motion = next.reduceMotion ? "reduce" : "ok";
}

export function writeSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...readSettings(), ...patch };
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  applySettings(next);
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: next }));
  return next;
}

export function resetSettings(): AppSettings {
  try {
    window.localStorage.removeItem(SETTINGS_KEY);
  } catch {
    /* ignore */
  }
  applySettings(DEFAULT_SETTINGS);
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: DEFAULT_SETTINGS }));
  return { ...DEFAULT_SETTINGS };
}

export function typefaceHref(id: Typeface): string | null {
  return TYPEFACES.find((t) => t.id === id)?.href ?? null;
}

export const SETTINGS_BOOT_SCRIPT = `(()=>{try{var r=JSON.parse(localStorage.getItem("${SETTINGS_KEY}")||"{}");var e=document.documentElement;var t=r.typeface==="serif"?"literata":r.typeface;if(r.fontSize)e.dataset.font=r.fontSize;if(r.density)e.dataset.density=r.density;if(t)e.dataset.type=t;if(r.showImages===false)e.dataset.images="off";if(r.highlightUnread===false)e.dataset.unread="off";if(r.reduceMotion)e.dataset.motion="reduce";}catch(e){}})();`;
