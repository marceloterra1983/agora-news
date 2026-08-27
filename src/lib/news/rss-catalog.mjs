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
  {
    url: "https://developer.nvidia.com/blog/feed/",
    title: "NVIDIA",
    section: "ai",
    group: "labs",
    account: "r_05298ef7ce15",
  },
  {
    url: "https://aws.amazon.com/blogs/machine-learning/feed/",
    title: "AWS Machine Learning",
    section: "ai",
    group: "labs",
    account: "r_458f4ae1b0fe",
  },
  {
    url: "https://blog.google/technology/ai/rss/",
    title: "Google AI",
    section: "ai",
    group: "labs",
    account: "r_04a252572c9d",
  },
  {
    url: "https://research.google/blog/rss/",
    title: "Google Research",
    section: "ai",
    group: "pesquisa",
    account: "r_904f056d0b57",
  },
  {
    url: "https://ai.stanford.edu/blog/feed.xml",
    title: "Stanford AI Lab",
    section: "ai",
    group: "pesquisa",
    account: "r_53042e54e057",
  },
  {
    url: "https://www.interconnects.ai/feed",
    title: "Interconnects",
    section: "ai",
    group: "builders",
    account: "r_38bb04bcb74c",
  },
  {
    url: "https://www.latent.space/feed",
    title: "Latent Space",
    section: "ai",
    group: "imprensa",
    account: "r_5f96ca82b9e1",
  },
  {
    url: "https://www.oneusefulthing.org/feed",
    title: "One Useful Thing",
    section: "ai",
    group: "imprensa",
    account: "r_37ee50b515f9",
  },
  {
    url: "https://www.theregister.com/headlines.atom",
    title: "The Register",
    section: "tech",
    group: "tech-imprensa",
    account: "r_217ddb781732",
  },
  {
    url: "https://www.404media.co/rss/",
    title: "404 Media",
    section: "tech",
    group: "tech-imprensa",
    account: "r_b4799863715a",
  },
  {
    url: "https://www.engadget.com/rss.xml",
    title: "Engadget",
    section: "tech",
    group: "tech-gadgets",
    account: "r_aae61297d147",
  },
  {
    url: "https://9to5mac.com/feed/",
    title: "9to5Mac",
    section: "tech",
    group: "tech-gadgets",
    account: "r_bbbfa707e98d",
  },
  {
    url: "https://www.apple.com/newsroom/rss-feed.rss",
    title: "Apple Newsroom",
    section: "tech",
    group: "tech-empresas",
    account: "r_dfbca54d3720",
  },
  {
    url: "https://blog.google/rss/",
    title: "Google Blog",
    section: "tech",
    group: "tech-empresas",
    account: "r_f420170e7172",
  },
  {
    url: "https://blog.cloudflare.com/rss/",
    title: "Cloudflare",
    section: "tech",
    group: "tech-devs",
    account: "r_2f3b69ac7003",
  },
  {
    url: "https://www.bleepingcomputer.com/feed/",
    title: "BleepingComputer",
    section: "tech",
    group: "tech-seguranca",
    account: "r_50fbf262f48a",
  },
  {
    url: "https://www.cnnbrasil.com.br/feed/",
    title: "CNN Brasil",
    section: "brasil",
    group: "br-jornais",
    account: "r_4e2716087926",
  },
  {
    url: "https://www.nexojornal.com.br/rss.xml",
    title: "Nexo Jornal",
    section: "brasil",
    group: "br-colunistas",
    account: "r_6849184f5922",
  },
  {
    url: "https://www.jota.info/feed",
    title: "JOTA",
    section: "brasil",
    group: "br-politica",
    account: "r_92961d4095fc",
  },
  {
    url: "https://valor.globo.com/rss/valor",
    title: "Valor",
    section: "brasil",
    group: "br-economia",
    account: "r_826d58b51a2e",
  },
  {
    url: "https://exame.com/feed/",
    title: "Exame",
    section: "brasil",
    group: "br-economia",
    account: "r_440047ba7974",
  },
  {
    url: "https://agenciabrasil.ebc.com.br/rss.xml",
    title: "Agência Brasil",
    section: "brasil",
    group: "br-instituicoes",
    account: "r_4d56cd0d3616",
  },
  {
    url: "https://www12.senado.leg.br/noticias/rss",
    title: "Senado",
    section: "brasil",
    group: "br-instituicoes",
    account: "r_1b54d5c54093",
  },
  {
    url: "https://www.camara.leg.br/noticias/rss/ultimas-noticias",
    title: "Câmara",
    section: "brasil",
    group: "br-instituicoes",
    account: "r_bc6c322beddb",
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

/** Ordem estável: X, depois RSS. Grupo só-X, só-RSS ou ambos. */
export function originsInHandles(handles) {
  let x = false;
  let rss = false;
  for (const handle of handles) {
    if (isRssAccount(handle)) rss = true;
    else x = true;
    if (x && rss) break;
  }
  const origins = [];
  if (x) origins.push("x");
  if (rss) origins.push("rss");
  return origins;
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
