/** Agrupa itens salvos por categoria preservando a ordem de salvamento.
 * `order` fixa a ordem das seções conhecidas; categorias fora dela vêm
 * depois, na ordem em que aparecem. Nada é filtrado — salvo é salvo,
 * independentemente da seção aberta. */
export function groupSavedByCategory(items, order) {
  const groups = new Map();
  for (const item of items) {
    const key = item.category;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  const known = order.filter((key) => groups.has(key));
  const extra = [...groups.keys()].filter((key) => !order.includes(key));
  return [...known, ...extra].map((category) => ({
    category,
    items: groups.get(category),
  }));
}
