import { envLlmKey } from "./llm-accounts.mjs";
import { askGrokLine } from "./llm-ask";
import { blurbFor, profileByHandle } from "./profiles";
import {
  clipOneLine,
  extractMatchesPerson,
  looksPortuguese,
  plausibleSummary,
} from "./summary-core.mjs";

const summaryCache = new Map<string, { at: number; line: string; warning: string | null }>();
const SUMMARY_TTL = 6 * 60 * 60_000;

/** Fallback do servidor (cron). Com sessão, askGrokLine resolve a conta ativa. */
export function aiKey(): string {
  return envLlmKey(process.env);
}

export type AboutLine = {
  line: string;
  usedLlm: boolean;
  llmWarning: string | null;
};

async function translateLine(text: string): Promise<string> {
  const src = clipOneLine(text);
  if (!src) return "";
  if (looksPortuguese(src)) return src;
  try {
    const g = await fetch(
      `https://translate.googleapis.com/translate_a/single?${new URLSearchParams({
        client: "gtx",
        sl: "auto",
        tl: "pt",
        dt: "t",
        q: src.slice(0, 220),
      })}`,
      { signal: AbortSignal.timeout(6_000) },
    );
    if (g.ok) {
      const data = (await g.json()) as unknown;
      const parts = Array.isArray(data) && Array.isArray(data[0]) ? data[0] : [];
      const out = clipOneLine(
        parts.map((p) => (Array.isArray(p) && typeof p[0] === "string" ? p[0] : "")).join(""),
      );
      if (out) return out;
    }
  } catch {
    /* keep original */
  }
  return src;
}

async function wikiLine(name: string, handle: string): Promise<string> {
  const title = name.trim();
  if (!title) return "";
  const headers = {
    Accept: "application/json",
    "User-Agent": "AgoraNews/1.0 (news reader)",
  };
  const trySummary = async (lang: "pt" | "en", page: string) => {
    const res = await fetch(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(page)}`,
      { headers, signal: AbortSignal.timeout(6_000) },
    );
    if (!res.ok) return "";
    const body = (await res.json()) as { type?: string; extract?: string; title?: string };
    if (body.type === "disambiguation") return "";
    const extract = body.extract || "";
    const pageTitle = body.title || page;
    if (!extractMatchesPerson(name, handle, pageTitle, extract)) return "";
    return clipOneLine(extract);
  };
  const searchWiki = async (lang: "pt" | "en", q: string) => {
    const search = await fetch(
      `https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({
        action: "query",
        list: "search",
        srsearch: q,
        srlimit: "3",
        format: "json",
        utf8: "1",
      })}`,
      { headers, signal: AbortSignal.timeout(6_000) },
    );
    if (!search.ok) return "";
    const data = (await search.json()) as {
      query?: { search?: Array<{ title?: string }> };
    };
    for (const hit of data.query?.search ?? []) {
      if (!hit.title) continue;
      const line = await trySummary(lang, hit.title);
      if (line) return line;
    }
    return "";
  };
  try {
    const queries = [`${title} ${handle}`, `"${title}"`];
    for (const q of queries) {
      const pt = await searchWiki("pt", q);
      if (pt) return pt;
    }
    for (const q of queries) {
      const en = await searchWiki("en", q);
      if (en) return looksPortuguese(en) ? en : await translateLine(en);
    }
    return "";
  } catch {
    return "";
  }
}

export async function oneLineAboutResult(
  handle: string,
  name: string,
  bio: string,
  opts?: { userId?: string },
): Promise<AboutLine> {
  if (profileByHandle(handle)) {
    return { line: blurbFor(handle, name), usedLlm: false, llmWarning: null };
  }
  const key = `v3:${handle.toLowerCase()}`;
  const cached = summaryCache.get(key);
  if (cached && Date.now() - cached.at < SUMMARY_TTL) {
    return { line: cached.line, usedLlm: !cached.warning, llmWarning: cached.warning };
  }

  const prompt =
    `Nome: ${name}\nConta: @${handle}\nBio no X: ${bio.slice(0, 320) || "(vazia)"}\n` +
    `Escreva quem é essa pessoa/conta com base só nisso.`;
  const llm = await askGrokLine(prompt, opts);
  const fromLlm = plausibleSummary(llm.line, name, handle, bio) ? llm.line : "";
  const fromBio = bio ? await translateLine(bio) : "";
  const fromWiki = fromBio ? "" : await wikiLine(name, handle);
  const line = fromLlm || fromBio || fromWiki;
  const result = { line, usedLlm: Boolean(fromLlm), llmWarning: llm.warning };
  if (line && !result.llmWarning) {
    summaryCache.set(key, { at: Date.now(), line, warning: null });
  }
  return result;
}

/** Cron sem userId usa só XAI_API_KEY/GROK_API_KEY do env. */
export async function oneLineAbout(
  handle: string,
  name: string,
  bio: string,
  opts?: { userId?: string },
): Promise<string> {
  return (await oneLineAboutResult(handle, name, bio, opts)).line;
}
