import { MAX_RSS_ITEMS, RSS_SEED } from "./rss-catalog-seed.mjs";
import { youtubeLabelFor } from "./youtube-catalog.mjs";

export { MAX_RSS_ITEMS, RSS_SEED };

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

function rssSeedHit(account, owned = []) {
  const key = String(account || "")
    .replace(/^@+/, "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  return (
    [...RSS_SEED, ...(Array.isArray(owned) ? owned : [])].find(
      (row) => String(row.account || "").toLowerCase() === key,
    ) || null
  );
}

export function rssLabelFor(account, owned = []) {
  return rssSeedHit(account, owned)?.title || "";
}

/** Grupo editorial do seed/owned RSS. Vazio se a conta não for RSS cadastrada. */
export function rssGroupOf(account, owned = []) {
  return String(rssSeedHit(account, owned)?.group || "");
}

export function isRssAccount(handle) {
  return /^r_[a-f0-9]{12}$/i.test(String(handle || "").replace(/^@+/, "").trim());
}

export function isYouTubeAccount(handle) {
  return /^y_[a-f0-9]{12}$/i.test(String(handle || "").replace(/^@+/, "").trim());
}

/** Ordem estável: X, depois RSS, depois YouTube. Grupo só-X, só-RSS, YouTube ou misto. */
export function originsInHandles(handles) {
  let x = false;
  let rss = false;
  let youtube = false;
  for (const handle of handles) {
    if (isYouTubeAccount(handle)) youtube = true;
    else if (isRssAccount(handle)) rss = true;
    else x = true;
    if (x && rss && youtube) break;
  }
  const origins = [];
  if (x) origins.push("x");
  if (rss) origins.push("rss");
  if (youtube) origins.push("youtube");
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

/** Campos source/sourceLabel da história — RSS e YouTube nunca vazam o id interno como @handle. */
export function storySourceFromAccount(account, opts = {}) {
  const source = bareHandle(account) || "fonte";
  if (isYouTubeAccount(source) || opts.source === "youtube") {
    const sourceLabel =
      opts.sourceLabel || opts.title || youtubeLabelFor(source) || (opts.postUrl ? hostnameOf(opts.postUrl) : "") || "YouTube";
    return { source, sourceLabel };
  }
  if (isRssAccount(source) || opts.source === "rss") {
    const sourceLabel =
      rssLabelFor(source, opts.owned) || hostnameOf(opts.postUrl) || "Site";
    return { source, sourceLabel };
  }
  return { source, sourceLabel: `@${source}` };
}

/** Texto da byline: título do canal para YouTube, site para RSS, @handle para X. */
export function displaySourceByline(source, sourceLabel) {
  const handle = bareHandle(source);
  const label = String(sourceLabel || "").trim();
  if (isYouTubeAccount(handle)) {
    if (label && !isYouTubeAccount(label)) return label;
    return youtubeLabelFor(handle) || "YouTube";
  }
  if (isRssAccount(handle)) {
    if (label && !isRssAccount(label)) return label;
    return rssLabelFor(handle) || "Site";
  }
  return label || (handle ? `@${handle}` : "");
}

export function displaySourceInitial(source, sourceLabel) {
  const text = displaySourceByline(source, sourceLabel).replace(/^@+/, "");
  return (text.charAt(0) || "?").toUpperCase();
}

/** @handle só quando a conta é do X; RSS e YouTube devolvem vazio. */
export function displaySourceAt(source) {
  const handle = bareHandle(source);
  if (!handle || isRssAccount(handle) || isYouTubeAccount(handle)) return "";
  return `@${handle}`;
}

export function storyIsRss(story) {
  const source = bareHandle(story?.source);
  const id = String(story?.id || "");
  return isRssAccount(source) || id.startsWith("rss_");
}

export function storyIsYouTube(story) {
  const source = bareHandle(story?.source);
  const id = String(story?.id || "");
  return isYouTubeAccount(source) || id.startsWith("yt_");
}

/** Recorta X, RSS e/ou YouTube sem reordenar. */
export function filterStoriesByOrigin(stories, { showX = true, showRss = true, showYouTube = true } = {}) {
  if (!Array.isArray(stories)) return [];
  if (showX && showRss && showYouTube) return stories;
  return stories.filter((story) => {
    if (storyIsYouTube(story)) return showYouTube;
    if (storyIsRss(story)) return showRss;
    return showX;
  });
}

/** Mesmo recorte para a lista de Fontes: y_* é YouTube, r_* é RSS, o resto é X. */
export function filterFontesByOrigin(rows, { showX = true, showRss = true, showYouTube = true } = {}) {
  if (!Array.isArray(rows)) return [];
  if (showX && showRss && showYouTube) return rows;
  return rows.filter((row) => {
    const handle = row?.handle;
    if (isYouTubeAccount(handle)) return showYouTube;
    if (isRssAccount(handle)) return showRss;
    return showX;
  });
}

export function fontesEmptyHint({ showX = true, showRss = true, showYouTube = true, sort = "recent" } = {}) {
  if (!showX && !showRss && !showYouTube) return "Ligue o X ou o RSS no topo para ver fontes.";
  if (!showX && !showRss) return "Ligue o X ou o RSS no topo para ver fontes.";
  if (!showX) return "Ligue o X no topo para ver as contas.";
  if (sort === "starred") return "Nenhum favorito ainda. Toque na estrela de um perfil.";
  return "Nenhum perfil.";
}
