export type FontSize = "sm" | "md" | "lg" | "xl";
export type Density = "regular" | "compact";
export type Typeface = "literata" | "source" | "newsreader" | "fraunces" | "sans";

export type AppSettings = {
  fontSize: FontSize;
  density: Density;
  typeface: Typeface;
  showImages: boolean;
  showX: boolean;
  showRss: boolean;
  showYouTube: boolean;
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
  showX: true,
  showRss: true,
  showYouTube: true,
  highlightUnread: true,
  reduceMotion: false,
};

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
    showX: o.showX !== false,
    showRss: o.showRss !== false,
    showYouTube: o.showYouTube !== false,
    highlightUnread: o.highlightUnread !== false,
    reduceMotion: o.reduceMotion === true,
  };
}

/** Nuvem sem chave nova não apaga showX/showRss locais. */
export function mergeSettingsBlob(remote: unknown, local: unknown): AppSettings {
  const r = remote && typeof remote === "object" ? (remote as Record<string, unknown>) : {};
  const l = local && typeof local === "object" ? (local as Record<string, unknown>) : {};
  const out: Record<string, unknown> = { ...l };
  for (const [key, value] of Object.entries(r)) {
    if (value !== undefined) out[key] = value;
  }
  return parse(out);
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

/** Envelope `{ fromRemote: true }` não é settings — lê o storage. */
export function settingsFromEventDetail(detail: unknown): AppSettings {
  if (
    detail &&
    typeof detail === "object" &&
    typeof (detail as { showImages?: unknown }).showImages === "boolean"
  ) {
    return parse(detail);
  }
  return readSettings();
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

export function typefaceFamily(id: Typeface): string {
  switch (id) {
    case "literata":
      return '"Literata", Georgia, serif';
    case "source":
      return '"Source Serif 4", Georgia, serif';
    case "newsreader":
      return '"Newsreader", Georgia, serif';
    case "fraunces":
      return '"Fraunces", Georgia, serif';
    default:
      return "var(--font-sans)";
  }
}

export const SETTINGS_BOOT_SCRIPT = `(()=>{try{var r=JSON.parse(localStorage.getItem("${SETTINGS_KEY}")||"{}");var e=document.documentElement;var t=r.typeface==="serif"?"literata":r.typeface;if(r.fontSize)e.dataset.font=r.fontSize;if(r.density)e.dataset.density=r.density;if(t)e.dataset.type=t;if(r.showImages===false)e.dataset.images="off";if(r.highlightUnread===false)e.dataset.unread="off";if(r.reduceMotion)e.dataset.motion="reduce";}catch(e){}})();`;
