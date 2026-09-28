export function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Blend `b` over `a` at opacity t. */
export function mix(a: string, b: string, t: number): string {
  const x = hex(a);
  const y = hex(b);
  return '#' + x.map((v, i) => Math.round(v * (1 - t) + y[i] * t).toString(16).padStart(2, '0')).join('');
}

/** Relative luminance, 0 (black) to 1 (white). */
export function lum(c: string): number {
  const [r, g, b] = hex(c).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.04) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Desaturate toward grey by t. */
export function grey(c: string, t: number): string {
  const [r, g, b] = hex(c);
  const l = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
  const h = '#' + [l, l, l].map((v) => v.toString(16).padStart(2, '0')).join('');
  return mix(c, h, t);
}
