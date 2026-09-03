import { MAX_RSS_ITEMS, RSS_SEED } from "./rss-catalog-seed.mjs";

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
