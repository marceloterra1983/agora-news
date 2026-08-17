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
