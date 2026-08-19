/** Abre o menu de grupo para cima só quando cabe acima do botão. */

export function groupMenuOpensUp({
  spaceAbove = 0,
  spaceBelow = 0,
  min = 168,
} = {}) {
  const above = Number(spaceAbove) || 0;
  const below = Number(spaceBelow) || 0;
  if (above >= min) return true;
  return above > below;
}
