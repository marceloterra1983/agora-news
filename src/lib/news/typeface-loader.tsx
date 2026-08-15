import { useEffect } from "react";
import { TYPEFACES, type Typeface } from "./settings";
import { useSettings } from "./use-settings";

function ensureLink(id: string, href: string) {
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

export function TypefaceLoader({ all = false }: { all?: boolean }) {
  const { settings } = useSettings();
  useEffect(() => {
    const list = all ? TYPEFACES : TYPEFACES.filter((t) => t.id === settings.typeface);
    for (const face of list) {
      if (face.href) ensureLink(`agora-type-${face.id}`, face.href);
    }
  }, [all, settings.typeface]);
  return null;
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
