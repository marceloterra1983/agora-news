import { clipAtWord } from "./summary-core.mjs";

const WEEKDAYS = [
  "domingo",
  "segunda-feira",
  "terça-feira",
  "quarta-feira",
  "quinta-feira",
  "sexta-feira",
  "sábado",
];

const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function readerDate(now = new Date()): string {
  const d = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const week = WEEKDAYS[d.getDay()]
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("-");
  const month = MONTHS[d.getMonth()];
  const monthLabel = month.charAt(0).toUpperCase() + month.slice(1);
  return `${week}, ${d.getDate()} de ${monthLabel}`;
}

export function mastheadDate(now = new Date()): string {
  return readerDate(now);
}

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

export function longDate(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  return t.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(".", ",")} mi`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(".", ",")} mil`;
  return String(n);
}

export function displayTitle(title: string): string {
  const clean = title
    .replace(/\s*\((?:com\s+)?imagem\s+diferente\)\.?\s*$/i, "")
    .replace(/\s*com imagem diferente\.?\s*$/i, "")
    .trim();
  return clipAtWord(clean || title, 180);
}
