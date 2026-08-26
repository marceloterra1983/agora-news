/** Ordena o feed por data desc com desempate estável por id. */
export function rankStories(stories) {
  return [...(Array.isArray(stories) ? stories : [])].sort(
    (a, b) =>
      Date.parse(String(b.publishedAt || "")) - Date.parse(String(a.publishedAt || "")) ||
      String(a.id).localeCompare(String(b.id)),
  );
}
