/** Seed editorial. Contas pré-computadas (sha256 do URL canônico) para o client não importar crypto. */

export const MAX_RSS_ITEMS = 10;

export const RSS_SEED = [
  {
    url: "https://openai.com/news/rss.xml",
    title: "OpenAI",
    section: "ai",
    group: "labs",
    account: "r_bea4293d5edd",
  },
  {
    url: "https://huggingface.co/blog/feed.xml",
    title: "Hugging Face",
    section: "ai",
    group: "labs",
    account: "r_61d3148bc057",
  },
  {
    url: "https://deepmind.google/blog/rss.xml",
    title: "Google DeepMind",
    section: "ai",
    group: "labs",
    account: "r_9c92f29eb293",
  },
  {
    url: "https://www.technologyreview.com/topic/artificial-intelligence/feed/",
    title: "MIT Technology Review AI",
    section: "ai",
    group: "imprensa",
    account: "r_4d355be7e910",
  },
  {
    url: "https://importai.substack.com/feed",
    title: "Import AI",
    section: "ai",
    group: "imprensa",
    account: "r_0f90c142536d",
  },
  {
    url: "https://simonwillison.net/atom/everything/",
    title: "Simon Willison",
    section: "ai",
    group: "builders",
    account: "r_3733c65b9abe",
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
    url: "https://techcrunch.com/feed/",
    title: "TechCrunch",
    section: "tech",
    group: "tech-imprensa",
    account: "r_7c18f6f34132",
  },
  {
    url: "https://www.wired.com/feed/rss",
    title: "WIRED",
    section: "tech",
    group: "tech-imprensa",
    account: "r_bcd998793f0f",
  },
  {
    url: "https://krebsonsecurity.com/feed/",
    title: "KrebsOnSecurity",
    section: "tech",
    group: "tech-seguranca",
    account: "r_9f2d692b80a4",
  },
  {
    url: "https://github.blog/feed/",
    title: "GitHub Blog",
    section: "tech",
    group: "tech-devs",
    account: "r_f73fd9169bbe",
  },
  {
    url: "https://rss.tecmundo.com.br/feed",
    title: "TecMundo",
    section: "brasil",
    group: "br-jornais",
    account: "r_9c68d283ae03",
  },
  {
    url: "https://g1.globo.com/rss/g1/",
    title: "g1",
    section: "brasil",
    group: "br-jornais",
    account: "r_b4a0f604aed9",
  },
  {
    url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml",
    title: "Folha",
    section: "brasil",
    group: "br-jornais",
    account: "r_ce0d4980296c",
  },
  {
    url: "https://feeds.bbci.co.uk/portuguese/rss.xml",
    title: "BBC News Brasil",
    section: "brasil",
    group: "br-jornais",
    account: "r_c9bd5634cb80",
  },
  {
    url: "https://www.poder360.com.br/feed/",
    title: "Poder360",
    section: "brasil",
    group: "br-politica",
    account: "r_e7ace0e7fc6c",
  },
  {
    url: "https://feeds.folha.uol.com.br/mercado/rss091.xml",
    title: "Folha Mercado",
    section: "brasil",
    group: "br-economia",
    account: "r_8cfa711f4507",
  },
  {
    url: "https://canaltech.com.br/rss/",
    title: "Canaltech",
    section: "brasil",
    group: "br-jornais",
    account: "r_8a5737767f6a",
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
      url: String(row.url || ""),
    }));
}

export function rssAvatarUrl(url) {
  const host = hostnameOf(url);
  return host ? `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(host)}` : "";
}

export function rssBlurb(url, title) {
  const host = hostnameOf(url);
  if (host) return `Feed em ${host}`;
  return title ? `${title} é um site acompanhado neste tema.` : "";
}

export function rssSiteHref(account, owned = []) {
  const key = String(account || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
  const hit = [...RSS_SEED, ...(Array.isArray(owned) ? owned : [])].find(
    (row) => String(row.account || "").toLowerCase() === key,
  );
  if (!hit?.url) return "";
  try {
    return new URL(hit.url).origin;
  } catch {
    return "";
  }
}

/** Mesmo shape de InfluenceRow para misturar RSS na lista de Fontes. */
export function rssFonteRow(p) {
  const url = String(p?.url || "");
  const handle = String(p?.handle || "").replace(/^@+/, "");
  return {
    handle,
    name: String(p?.name || handle),
    group: String(p?.group || "novos"),
    followers: 0,
    verified: false,
    avatar: rssAvatarUrl(url) || null,
    bio: rssBlurb(url, p?.name) || null,
    siteUrl: rssSiteHref(handle, url ? [{ account: handle, url }] : []) || null,
    lastPost: null,
    lastPosts: [],
    inFeed: 0,
    articles: 0,
    longform: 0,
    likes: 0,
    engagement: 0,
    views: 0,
    er: 0,
  };
}

export function mergeRssFontes(base, owned, section) {
  if (!Array.isArray(base)) return [];
  const seen = new Set(base.map((row) => String(row?.handle || "").toLowerCase()));
  const added = rssExtrasFor(section, owned)
    .filter((row) => !seen.has(row.handle.toLowerCase()))
    .map(rssFonteRow);
  return added.length ? [...base, ...added] : base;
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

/** Mesmo recorte para a lista de Fontes: r_* é RSS, o resto é X. */
export function filterFontesByOrigin(rows, { showX = true, showRss = true } = {}) {
  if (!Array.isArray(rows)) return [];
  if (showX && showRss) return rows;
  return rows.filter((row) => (isRssAccount(row?.handle) ? showRss : showX));
}

export function fontesEmptyHint({ showX = true, showRss = true, sort = "recent" } = {}) {
  if (!showX && !showRss) return "Ligue o X ou o RSS no topo para ver fontes.";
  if (!showX) return "Ligue o X no topo para ver as contas.";
  if (sort === "starred") return "Nenhum favorito ainda. Toque na estrela de um perfil.";
  return "Nenhum perfil.";
}
