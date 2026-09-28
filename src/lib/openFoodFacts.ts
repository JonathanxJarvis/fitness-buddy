import type { Food, Nutrients, Serving } from './types';

// Open Food Facts is a free, open database of ~3M packaged foods. No API key needed,
// but they ask apps to identify themselves with a User-Agent.
const BASE = 'https://world.openfoodfacts.org';
const HEADERS = { 'User-Agent': 'FitnessBuddy/1.0 (React Native; open-source hobby app)' };
const FIELDS = 'code,product_name,product_name_en,generic_name,brands,nutriments,serving_size,serving_quantity';

type Nutriments = Record<string, number | string | undefined>;

export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  nutriments?: Nutriments;
  serving_size?: string;
  serving_quantity?: number | string;
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return Number.isFinite(n) ? n : undefined;
}

/** Nutrients per 100 g/ml from an Open Food Facts nutriments object. */
export function nutrientsPer100g(n: Nutriments = {}): Nutrients | null {
  let calories = num(n['energy-kcal_100g']);
  if (calories === undefined) {
    const kj = num(n['energy-kj_100g']) ?? num(n['energy_100g']);
    if (kj !== undefined) calories = kj / 4.184;
  }
  const protein = num(n['proteins_100g']);
  const carbs = num(n['carbohydrates_100g']);
  const fat = num(n['fat_100g']);
  if (calories === undefined && protein === undefined && carbs === undefined && fat === undefined) return null;

  const out: Nutrients = {
    calories: calories ?? (protein ?? 0) * 4 + (carbs ?? 0) * 4 + (fat ?? 0) * 9,
    protein: protein ?? 0,
    carbs: carbs ?? 0,
    fat: fat ?? 0,
  };
  const g = (key: string) => num(n[key]);
  // OFF stores minerals/vitamins in grams; convert to mg / µg.
  const mg = (key: string) => {
    const v = g(key);
    return v === undefined ? undefined : v * 1000;
  };
  const fiber = g('fiber_100g');
  const sugar = g('sugars_100g');
  let sodium = mg('sodium_100g');
  if (sodium === undefined) {
    const salt = g('salt_100g');
    if (salt !== undefined) sodium = salt * 400; // salt g -> sodium mg
  }
  const extra: Partial<Nutrients> = {
    fiber,
    sugar,
    sodium,
    potassium: mg('potassium_100g'),
    calcium: mg('calcium_100g'),
    iron: mg('iron_100g'),
    vitaminC: mg('vitamin-c_100g'),
    vitaminD: (() => {
      const v = g('vitamin-d_100g');
      return v === undefined ? undefined : v * 1_000_000;
    })(),
  };
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined) (out as unknown as Record<string, number>)[k] = v;
  }
  return out;
}

/** Convert an OFF product to our Food shape. Base serving is the package serving, else 100 g. */
export function productToFood(p: OffProduct): Food | null {
  const per100 = nutrientsPer100g(p.nutriments);
  const name = (p.product_name_en || p.product_name || p.generic_name || '').trim();
  if (!per100 || !name) return null;

  const grams = num(p.serving_quantity);
  const base = grams && grams > 0 ? grams : 100;
  const servings: Serving[] = [];
  if (base !== 100) servings.push({ label: p.serving_size ? `serving (${p.serving_size})` : `serving (${base} g)`, factor: 1 });
  servings.push({ label: '100 g', factor: 100 / base }, { label: '1 oz', factor: 28.3495 / base }, { label: '1 g', factor: 1 / base });

  return {
    id: `off:${p.code ?? name}`,
    name,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    barcode: p.code,
    source: 'openfoodfacts',
    nutrients: scale(per100, base / 100),
    servings,
  };
}

function scale(n: Nutrients, f: number): Nutrients {
  const out = {} as Record<string, number>;
  for (const [k, v] of Object.entries(n)) if (typeof v === 'number') out[k] = v * f;
  return out as unknown as Nutrients;
}

async function getJson(url: string, signal?: AbortSignal): Promise<any> {
  const res = await fetch(url, { headers: HEADERS, signal });
  if (!res.ok) throw new Error(`Open Food Facts returned ${res.status}`);
  return res.json();
}

export async function lookupBarcode(code: string, signal?: AbortSignal): Promise<Food | null> {
  const data = await getJson(`${BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`, signal);
  if (data?.status !== 1 || !data.product) return null;
  return productToFood({ code, ...data.product });
}

export async function searchFoods(query: string, signal?: AbortSignal): Promise<Food[]> {
  const q = encodeURIComponent(query.trim());
  const url =
    `${BASE}/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1` +
    `&page_size=30&sort_by=unique_scans_n&fields=${FIELDS}`;
  const data = await getJson(url, signal);
  const products: OffProduct[] = data?.products ?? [];
  const seen = new Set<string>();
  const foods: Food[] = [];
  for (const p of products) {
    const f = productToFood(p);
    if (!f || seen.has(f.id)) continue;
    seen.add(f.id);
    foods.push(f);
  }
  return foods;
}
