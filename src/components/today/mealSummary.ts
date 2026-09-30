/** Short display name for a food on the meal card: drops "(roh)", ", raw", brand tails. */
export function shortFoodName(name: string): string {
  const cut = name
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .split(/,| - | – /)[0]
    .replace(/\s+/g, ' ')
    .trim();
  return cut || name.trim();
}

/**
 * One line of what was eaten, e.g. "Haferflocken · Skyr · Heidelbeeren" with the
 * rest folded into "+2 more". Repeats of the same food are counted ("Ei ×2").
 */
export function mealSummary(names: string[], max = 3, budget = Infinity): { text: string; more: number } {
  const counts = new Map<string, number>();
  for (const n of names) {
    const k = shortFoodName(n);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const parts = [...counts].map(([k, c]) => (c > 1 ? `${k} ×${c}` : k));
  // Stop early when the next name wouldn't fit the line, so "+N more" stays visible
  // instead of a name being cut off mid-word.
  let n = 0;
  let len = 0;
  while (n < Math.min(max, parts.length)) {
    const add = parts[n].length + (n ? 3 : 0);
    if (n > 0 && len + add > budget) break;
    len += add;
    n++;
  }
  return { text: parts.slice(0, n).join(' · '), more: parts.length - n };
}
