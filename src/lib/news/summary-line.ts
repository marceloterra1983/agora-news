import { blurbFor, profileByHandle } from "./profiles";
import {
  clipOneLine,
  extractLlmText,
  extractMatchesPerson,
  looksPortuguese,
  plausibleSummary,
} from "./summary-core.mjs";

const summaryCache = new Map<string, { at: number; line: string }>();
const SUMMARY_TTL = 6 * 60 * 60_000;

export function aiKey(): string {
  return process.env.XAI_API_KEY || process.env.GROK_API_KEY || "";
}

async function askGrokLine(prompt: string): Promise<string> {
  const key = aiKey();
  if (!key) return "";
  const headers = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  const system =
    "Você resume quem é uma conta do X. Use SOMENTE os dados do usuário. Não invente cargo, empresa, país ou formação. Se a bio for vaga, reformule só o que ela diz. Uma frase em português do Brasil, no máximo 160 caracteres. Sem aspas, emoji, hashtag ou @.";
  try {
    const chat = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(14_000),
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 90,
        temperature: 0,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (chat.ok) {
      const line = clipOneLine(extractLlmText((await chat.json()) as Record<string, unknown>));
      if (line) return line;
    }
  } catch {
    /* try responses */
  }
  try {
    const res = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(14_000),
      body: JSON.stringify({
        model: "grok-4.5",
        max_output_tokens: 90,
        input: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return "";
    return clipOneLine(extractLlmText((await res.json()) as Record<string, unknown>));
  } catch {
    return "";
  }
}

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

export async function oneLineAbout(handle: string, name: string, bio: string): Promise<string> {
  if (profileByHandle(handle)) return blurbFor(handle, name);
  const key = `v3:${handle.toLowerCase()}`;
  const cached = summaryCache.get(key);
  if (cached && Date.now() - cached.at < SUMMARY_TTL) return cached.line;

  const prompt =
    `Nome: ${name}\nConta: @${handle}\nBio no X: ${bio.slice(0, 320) || "(vazia)"}\n` +
    `Escreva quem é essa pessoa/conta com base só nisso.`;
  const llm = await askGrokLine(prompt);
  const fromLlm = plausibleSummary(llm, name, handle, bio) ? llm : "";
  const fromBio = bio ? await translateLine(bio) : "";
  const fromWiki = fromBio ? "" : await wikiLine(name, handle);
  const line = fromLlm || fromBio || fromWiki;
  if (line) summaryCache.set(key, { at: Date.now(), line });
  return line;
}
