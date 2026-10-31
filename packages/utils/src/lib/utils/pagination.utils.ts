export type TPageItem = number | 'gap';

/**
 * Pages d'une liste : précédente / suivante, première et dernière page toujours visibles, la page courante et ses
 * voisines, `…` entre deux. Masquée s'il n'y a qu'une page.
 */
export function paginateElements(current: number, count: number, siblings = 1): TPageItem[] {
  const pages = new Set([1, count]);
  for (let p = current - siblings; p <= current + siblings; p++) {
    if (p >= 1 && p <= count) {
      pages.add(p);
    }
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const items: TPageItem[] = [];
  sorted.forEach((page, i) => {
    const previous = sorted[i - 1];
    if (previous !== undefined && page - previous === 2) {
      items.push(page - 1); // un seul numéro manquant : on l'affiche plutôt qu'un « … »
    } else if (previous !== undefined && page - previous > 2) {
      items.push('gap');
    }
    items.push(page);
  });
  return items;
}
