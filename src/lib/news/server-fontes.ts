import { createServerFn } from "@tanstack/react-start";
import { loadFontesFast } from "./influence";
import { timed } from "./timing";
import { DEFAULT_SECTION, normalizeSection, type Category } from "./types";

async function fontesPayload(category: Category) {
  const rows = await loadFontesFast(category);
  return { rows, live: rows.some((r) => r.followers > 0 || Boolean(r.avatar)) };
}

export const loadFontes = createServerFn({ method: "GET" })
  .validator((input: { category?: Category } | undefined) => ({
    category: normalizeSection(input?.category || DEFAULT_SECTION),
  }))
  .handler(async ({ data }) => {
    return timed(`loadFontes ${data.category}`, () => fontesPayload(data.category), (r) => ({
      rows: r.rows.length,
      live: r.live,
    }));
  });

/** Alias do store — a página Fontes não chama isto no GET. */
export const loadFontesLive = loadFontes;

export const loadFonteMetrics = createServerFn({ method: "GET" })
  .validator((input: { handle: string }) => ({
    handle: String(input.handle || "")
      .replace(/^@+/, "")
      .trim()
      .slice(0, 15),
  }))
  .handler(async ({ data }) => {
    const { hydrateBuzzCache } = await import("./fonte-buzz-store");
    const { getProfileMetrics } = await import("./fonte-metrics");
    await hydrateBuzzCache();
    return getProfileMetrics(data.handle);
  });
