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

function bareHandle(value) {
  return String(value || "")
    .replace(/^@+/, "")
    .trim();
}

function hostnameOf(url) {
  try {
    return new URL(String(url || "")).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Campos source/sourceLabel da história — RSS nunca vaza o id interno como @handle. */
export function storySourceFromAccount(account, opts = {}) {
  const source = bareHandle(account) || "fonte";
  if (isRssAccount(source) || opts.source === "rss") {
    const sourceLabel =
      rssLabelFor(source, opts.owned) || hostnameOf(opts.postUrl) || "Site";
    return { source, sourceLabel };
  }
  return { source, sourceLabel: `@${source}` };
}

/** Texto da byline: título do site para RSS, @handle para X. */
export function displaySourceByline(source, sourceLabel) {
  const handle = bareHandle(source);
  const label = bareHandle(sourceLabel);
  if (isRssAccount(handle)) {
    if (label && !isRssAccount(label)) return label;
    return rssLabelFor(handle) || "Site";
  }
  const raw = String(sourceLabel || "").trim();
  return raw || (handle ? `@${handle}` : "");
}

export function displaySourceInitial(source, sourceLabel) {
  const text = displaySourceByline(source, sourceLabel).replace(/^@+/, "");
  return (text.charAt(0) || "?").toUpperCase();
}

/** @handle só quando a conta é do X; RSS devolve vazio. */
export function displaySourceAt(source) {
  const handle = bareHandle(source);
  if (!handle || isRssAccount(handle)) return "";
  return `@${handle}`;
}

export function storyIsRss(story) {
  const source = bareHandle(story?.source);
  const id = String(story?.id || "");
  return isRssAccount(source) || id.startsWith("rss_");
}

/** Recorta X e/ou RSS sem reordenar. */
export function filterStoriesByOrigin(stories, { showX = true, showRss = true } = {}) {
  if (!Array.isArray(stories)) return [];
  if (showX && showRss) return stories;
  return stories.filter((story) => (storyIsRss(story) ? showRss : showX));
}
