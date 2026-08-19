import { clipAtWord } from "./summary-core.mjs";
import { stripWrittenLinks } from "./written-links.mjs";

export function relativeTime(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diff = Math.max(0, now - t);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr === 1 ? "há 1 hora" : `há ${hr} horas`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "ontem";
  if (day < 7) return `há ${day} dias`;
  return new Date(t).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(".", ",")} mi`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(".", ",")} mil`;
  return String(n);
}

export function displayTitle(title: string): string {
  const clean = stripWrittenLinks(
    title
      .replace(/\s*\((?:com\s+)?imagem\s+diferente\)\.?\s*$/i, "")
      .replace(/\s*com imagem diferente\.?\s*$/i, ""),
  );
  return clipAtWord(clean, 180);
}

export function displayBody(text: string): string {
  return stripWrittenLinks(text);
}
