/** Seed editorial. Contas pré-computadas (sha256 do URL canônico) para o client não importar crypto. */

export const MAX_RSS_ITEMS = 10;

export const RSS_SEED = [
  {
    url: "https://openai.com/news/rss.xml",
    title: "OpenAI",
    section: "ai",
    group: "imprensa",
    account: "r_bea4293d5edd",
  },
  {
    url: "https://huggingface.co/blog/feed.xml",
    title: "Hugging Face",
    section: "ai",
    group: "imprensa",
    account: "r_61d3148bc057",
  },
  {
    url: "https://www.theverge.com/rss/index.xml",
    title: "The Verge",
    section: "tech",
    group: "tech-imprensa",
    account: "r_8eb61941edd3",
  },
  {
    url: "https://feeds.arstechnica.com/arstechnica/index",
    title: "Ars Technica",
    section: "tech",
    group: "tech-imprensa",
    account: "r_7170fc473d11",
  },
  {
    url: "https://rss.tecmundo.com.br/feed",
    title: "TecMundo",
    section: "brasil",
    group: "br-jornais",
    account: "r_9c68d283ae03",
  },
];

export function rssGroupFor(section) {
  if (section === "tech") return "tech-imprensa";
  if (section === "brasil") return "br-jornais";
  return "imprensa";
}

/** @param {string} section @param {Array<Record<string, string>>} [owned] */
export function rssExtrasFor(section, owned = []) {
  const slug = String(section || "");
  return [...RSS_SEED, ...(Array.isArray(owned) ? owned : [])]
    .filter((row) => String(row.section || "") === slug && row.account)
    .map((row) => ({
      handle: String(row.account).replace(/^@+/, ""),
      name: String(row.title || row.account),
      section: slug,
      group: String(row.group || rssGroupFor(slug)),
    }));
}

export function rssLabelFor(account, owned = []) {
  const key = String(account || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
  const hit = [...RSS_SEED, ...(Array.isArray(owned) ? owned : [])].find(
    (row) => String(row.account || "").toLowerCase() === key,
  );
  return hit?.title || "";
}

export function isRssAccount(handle) {
  return /^r_[a-f0-9]{12}$/i.test(String(handle || "").replace(/^@+/, "").trim());
}
