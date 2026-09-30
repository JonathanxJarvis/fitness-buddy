export type Measure = 'g' | 'ml';

export interface Amount {
  /** Units in the pack, 1 when the label lists a single amount. */
  count: number;
  /** Grams (or ml) of one unit, when known. */
  each?: number;
  /** Grams (or ml) of the whole pack, when known. */
  total?: number;
  measure: Measure;
}

export type UnitName = 'bar' | 'piece' | 'bottle' | 'can' | 'cup' | 'slice' | 'pack' | 'serving';

export interface PackPortions {
  /** One bar / can / serving: the portion to start with. */
  unit?: { name: UnitName; grams: number; label: string };
  /** The whole package, when it is more than one unit. */
  pack?: { grams: number; label: string };
}

export interface PackInfo {
  name?: string;
  categories?: string | string[];
  servingSize?: string;
  servingQuantity?: number | string;
  quantity?: string;
  productQuantity?: number | string;
  productQuantityUnit?: string;
}

const NUM = String.raw`(\d+(?:\.\d+)?)`;
const UNIT = String.raw`(kg|g|gr|mg|l|cl|ml)`;
const WEIGHT = new RegExp(`${NUM}\\s*${UNIT}(?![a-zäöüß])`);
const MULTI = new RegExp(String.raw`(\d+)\s*[x×*]\s*${NUM}\s*${UNIT}(?![a-zäöüß])`);
const COUNT_EACH = new RegExp(String.raw`(\d+)\s*(?:stück|stk\.?|st\.|pieces?|pcs|riegel|bars?)\s*(?:à|a|je|of|each|x|zu)?\s*${NUM}\s*${UNIT}(?![a-zäöüß])`);
const COUNT = /(\d+)\s*(?:stück|stk\.?|st\.|pieces?|pcs|riegel|bars?|flaschen|dosen|becher)(?![a-zäöüß])/;

function toBase(value: number, unit: string): { v: number; measure: Measure } {
  switch (unit) {
    case 'kg':
      return { v: value * 1000, measure: 'g' };
    case 'mg':
      return { v: value / 1000, measure: 'g' };
    case 'l':
      return { v: value * 1000, measure: 'ml' };
    case 'cl':
      return { v: value * 10, measure: 'ml' };
    case 'ml':
      return { v: value, measure: 'ml' };
    default:
      return { v: value, measure: 'g' };
  }
}

function norm(s: string) {
  return s.toLowerCase().replace(/(\d),(\d)/g, '$1.$2').trim();
}

/** Reads pack labels like "6 x 25 g", "6x25g", "150g", "0,33 l", "330 ml" or "4 Stück". */
export function parseAmount(input: string | undefined | null): Amount | null {
  if (!input) return null;
  const s = norm(input);

  let m = MULTI.exec(s) ?? COUNT_EACH.exec(s);
  if (m) {
    const count = parseInt(m[1], 10);
    const { v, measure } = toBase(parseFloat(m[2]), m[3]);
    if (count > 0 && v > 0) return { count, each: v, total: count * v, measure };
  }

  const w = WEIGHT.exec(s);
  const c = COUNT.exec(s);
  const count = c ? parseInt(c[1], 10) : 1;
  if (w) {
    const { v, measure } = toBase(parseFloat(w[1]), w[2]);
    if (v > 0) return count > 1 ? { count, total: v, each: v / count, measure } : { count: 1, total: v, each: v, measure };
  }
  if (count > 1) return { count, measure: 'g' };
  return null;
}

const UNIT_WORDS: [UnitName, RegExp][] = [
  ['bar', /riegel|\bbars?\b/],
  ['can', /\bdosen?\b|\bcans?\b|energy[- ]drinks?/],
  ['bottle', /flaschen?\b|\bbottles?\b/],
  ['cup', /becher|\bcups?\b|pudding|joghurt|yogh?urt|milchreis|\bskyr\b/],
  ['slice', /scheiben?\b|\bslices?\b/],
  ['piece', /stück|\bstk\b|\bpieces?\b|\bpcs\b|schnitte/],
  ['pack', /packung|beutel|tüte|\bpacks?\b|\bsachets?\b/],
];

function unitFrom(text: string | undefined): UnitName | undefined {
  if (!text) return undefined;
  const s = text.toLowerCase();
  return UNIT_WORDS.find(([, re]) => re.test(s))?.[0];
}

export function formatAmount(v: number, measure: Measure): string {
  const r = (x: number) => String(Math.round(x * 10) / 10);
  if (v >= 1000) return `${r(v / 1000)} ${measure === 'ml' ? 'l' : 'kg'}`;
  return `${r(v)} ${measure}`;
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

const close = (a: number, b: number) => Math.abs(a - b) <= Math.max(1, b * 0.03);

/**
 * Turns Open Food Facts pack data into portions: one unit (bar, can, serving)
 * and the whole pack. The unit is only named after the product when it is
 * clearly one piece of the pack, so a 25 g serving of a 100 g chocolate bar
 * stays "1 serving" rather than "1 bar".
 */
export function packPortions(p: PackInfo): PackPortions {
  const serving = parseAmount(p.servingSize);
  const qty = parseAmount(p.quantity);
  const pqUnit = p.productQuantityUnit?.toLowerCase() === 'ml' ? 'ml' : undefined;

  const measure: Measure = pqUnit ?? qty?.measure ?? serving?.measure ?? 'g';
  const total = num(p.productQuantity) ?? qty?.total;
  const count = qty?.count ?? 1;
  const each = qty?.each ?? (count > 1 && total ? total / count : undefined);

  const cats = Array.isArray(p.categories) ? p.categories.join(' ') : p.categories;
  const productUnit = unitFrom(p.name) ?? unitFrom(cats);

  const out: PackPortions = {};
  const servingGrams = num(p.servingQuantity) ?? serving?.total;

  if (servingGrams) {
    const servingWord = p.servingSize?.replace(/[\d.,]+\s*(kg|g|gr|mg|l|cl|ml)\b/gi, '');
    let name = unitFrom(servingWord);
    if (!name) {
      const onePiece = count > 1 && each !== undefined && close(servingGrams, each);
      const wholeSingle = count === 1 && total !== undefined && close(servingGrams, total);
      name = onePiece || wholeSingle ? productUnit : undefined;
    }
    out.unit = { name: name ?? 'serving', grams: servingGrams, label: '' };
  } else if (count > 1 && each) {
    out.unit = { name: productUnit ?? 'serving', grams: each, label: '' };
  } else if (count === 1 && total && total <= 750 && productUnit && ['bar', 'can', 'bottle', 'cup'].includes(productUnit)) {
    out.unit = { name: productUnit, grams: total, label: '' };
  }

  if (out.unit) out.unit.label = `1 ${out.unit.name} (${formatAmount(out.unit.grams, serving?.measure ?? measure)})`;

  if (total && (!out.unit || total > out.unit.grams * 1.05)) {
    const single = count === 1 && productUnit && ['can', 'bottle'].includes(productUnit);
    out.pack = { grams: total, label: `${single ? `1 ${productUnit}` : 'Whole pack'} (${formatAmount(total, measure)})` };
  }
  return out;
}
