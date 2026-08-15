/** Leitura de feed: CSV da planilha + RSS/Atom se existir. */

export type FeedProbe = {
  url: string;
  kind: "csv" | "rss" | "atom" | "html" | "empty" | "error";
  ok: boolean;
  status: number;
  bytes: number;
  items: number;
  newest?: string;
  error?: string;
};

function tag(xml: string, name: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<(?:[\\w]+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:[\\w]+:)?${name}>`, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out.push(decode(m[1]));
  return out;
}

function decode(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export type RssItem = {
  id: string;
  title: string;
  body: string;
  url: string;
  publishedAt: string;
};

export function parseRssOrAtom(xml: string): RssItem[] {
  const text = xml.trim();
  if (!text.startsWith("<") || text.includes("<html")) return [];
  const blocks =
    text.match(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi) ?? [];
  return blocks
    .map((block, i) => {
      const title = tag(block, "title")[0] ?? "";
      const body = tag(block, "description")[0] || tag(block, "summary")[0] || tag(block, "content")[0] || "";
      const url =
        tag(block, "link")[0] ||
        block.match(/<link[^>]+href=["']([^"']+)/i)?.[1] ||
        "";
      const published =
        tag(block, "pubDate")[0] ||
        tag(block, "updated")[0] ||
        tag(block, "published")[0] ||
        "";
      const id = tag(block, "guid")[0] || tag(block, "id")[0] || url || `rss-${i}`;
      const when = Date.parse(published);
      return {
        id,
        title,
        body,
        url,
        publishedAt: Number.isNaN(when) ? new Date().toISOString() : new Date(when).toISOString(),
      };
    })
    .filter((item) => item.title || item.body);
}

export async function probeUrl(url: string): Promise<{ probe: FeedProbe; body: string }> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/rss+xml,application/atom+xml,text/csv,text/xml,application/xml,*/*" },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    const ctype = res.headers.get("content-type") ?? "";
    const body = await res.text();
    const start = body.trimStart();
    let kind: FeedProbe["kind"] = "empty";
    let items = 0;
    let newest: string | undefined;
    if (!res.ok) {
      return {
        probe: { url, kind: "error", ok: false, status: res.status, bytes: body.length, items: 0, error: `HTTP ${res.status}` },
        body: "",
      };
    }
    if (start.startsWith("<!DOCTYPE html") || start.startsWith("<html") || ctype.includes("text/html")) {
      kind = "html";
    } else if (start.includes("<rss") || start.includes("<item")) {
      kind = "rss";
      const parsed = parseRssOrAtom(body);
      items = parsed.length;
      newest = parsed[0]?.publishedAt;
    } else if (start.includes("<feed") || start.includes("<entry")) {
      kind = "atom";
      const parsed = parseRssOrAtom(body);
      items = parsed.length;
      newest = parsed[0]?.publishedAt;
    } else if (body.includes(",") && !start.startsWith("<")) {
      kind = "csv";
      items = Math.max(0, body.split("\n").filter((l) => l.trim()).length - 1);
    }
    return {
      probe: { url, kind, ok: kind === "csv" || kind === "rss" || kind === "atom", status: res.status, bytes: body.length, items, newest },
      body: kind === "html" ? "" : body,
    };
  } catch (err) {
    return {
      probe: {
        url,
        kind: "error",
        ok: false,
        status: 0,
        bytes: 0,
        items: 0,
        error: err instanceof Error ? err.message : "falha de rede",
      },
      body: "",
    };
  }
}

export function sheetFeedUrls(id: string): { label: string; url: string }[] {
  const t = Date.now();
  return [
    { label: "CSV export", url: `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&t=${t}` },
    { label: "CSV gviz", url: `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&t=${t}` },
    { label: "RSS legado", url: `https://spreadsheets.google.com/feeds/list/${id}/od6/public/values?alt=rss` },
    { label: "Atom legado", url: `https://spreadsheets.google.com/feeds/list/${id}/1/public/basic?alt=atom` },
  ];
}
