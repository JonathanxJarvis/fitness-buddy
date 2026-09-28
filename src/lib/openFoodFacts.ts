import type { Food, FoodRegion, Nutrients, Serving } from './types';

// Open Food Facts is a free, open database of ~3M packaged foods. No API key needed,
// but they ask apps to identify themselves with a User-Agent.
const BASE = 'https://world.openfoodfacts.org';
const HEADERS = { 'User-Agent': 'FitnessBuddy/1.0 (React Native; open-source hobby app)' };
const FIELDS = 'code,product_name,product_name_en,product_name_de,generic_name,generic_name_de,brands,nutriments,serving_size,serving_quantity';

/**
 * Country subdomains filter search to that country's products and prefer its
 * language, so de.openfoodfacts.org returns German supermarket items (Rewe,
 * Edeka, Aldi, Lidl, dm, …) with German names.
 */
function host(region: FoodRegion) {
  return region === 'world' ? BASE : `https://${region}.openfoodfacts.org`;
}

type Nutriments = Record<string, number | string | undefined>;

export interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  product_name_de?: string;
  generic_name_de?: string;
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
export function productToFood(p: OffProduct, region: FoodRegion = 'us'): Food | null {
  const per100 = nutrientsPer100g(p.nutriments);
  const names = region === 'de' ? [p.product_name_de, p.product_name, p.generic_name_de, p.product_name_en] : [p.product_name_en, p.product_name, p.generic_name];
  const name = (names.find((n) => n && n.trim()) ?? '').trim();
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

async function getJson(url: string, signal?: AbortSignal, timeoutMs = 9000): Promise<any> {
  // Give up on slow responses instead of spinning forever on a weak connection.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  try {
    const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal });
    if (!res.ok) throw new Error(`Open Food Facts returned ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

const COUNTRY_TAG: Record<Exclude<FoodRegion, 'world'>, string> = { de: 'en:germany', us: 'en:united-states' };

/**
 * Open Food Facts' full-text search service (search-a-licious). It is faster
 * and less rate-limited than the older cgi/search.pl endpoint.
 */
async function searchALicious(query: string, region: FoodRegion, signal?: AbortSignal): Promise<OffProduct[]> {
  const filter = region === 'world' ? '' : ` countries_tags:"${COUNTRY_TAG[region]}"`;
  const langs = region === 'de' ? 'de,en' : 'en';
  const url =
    `https://search.openfoodfacts.org/search?q=${encodeURIComponent(query.trim() + filter)}` +
    `&langs=${langs}&page_size=30&fields=${FIELDS}`;
  const data = await getJson(url, signal);
  return Array.isArray(data?.hits) ? data.hits : [];
}

async function searchLegacy(query: string, region: FoodRegion, signal?: AbortSignal): Promise<OffProduct[]> {
  const url =
    `${host(region)}/cgi/search.pl?search_terms=${encodeURIComponent(query.trim())}&search_simple=1&action=process&json=1` +
    `&page_size=30&sort_by=unique_scans_n&fields=${FIELDS}`;
  const data = await getJson(url, signal);
  return data?.products ?? [];
}

export async function lookupBarcode(code: string, signal?: AbortSignal, region: FoodRegion = 'us'): Promise<Food | null> {
  // Barcodes are global, so look them up worldwide; the region only picks the name language.
  const data = await getJson(`${BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`, signal);
  if (data?.status !== 1 || !data.product) return null;
  return productToFood({ code, ...data.product }, region);
}

const searchCache = new Map<string, Food[]>();

export async function searchFoods(query: string, signal?: AbortSignal, region: FoodRegion = 'world'): Promise<Food[]> {
  const key = `${region}|${query.trim().toLowerCase()}`;
  const cached = searchCache.get(key);
  if (cached) return cached;

  // Try the fast search service first, then the classic endpoint if it fails or finds nothing.
  let products: OffProduct[] = [];
  let firstError: unknown = null;
  try {
    products = await searchALicious(query, region, signal);
  } catch (e) {
    if (signal?.aborted) throw e;
    firstError = e;
  }
  if (!products.length) {
    try {
      products = await searchLegacy(query, region, signal);
    } catch (e) {
      if (signal?.aborted || firstError) throw firstError ?? e;
      throw e;
    }
  }

  const seen = new Set<string>();
  const foods: Food[] = [];
  for (const p of products) {
    const f = productToFood(p, region);
    if (!f || seen.has(f.id)) continue;
    seen.add(f.id);
    foods.push(f);
  }
  if (foods.length) searchCache.set(key, foods);
  return foods;
}

/**
 * Pulls the product number (GTIN) out of anything the scanner reads: a plain
 * EAN/UPC barcode, a GS1 Digital Link QR code (https://…/01/04012345678901…),
 * or a GS1 element string ("(01)04012345678901…" or "0104012345678901…").
 * Returns null for QR codes that don't identify a product.
 */
export function extractGtin(data: string): string | null {
  const s = data.trim();
  if (/^\d{8}$|^\d{12,14}$/.test(s)) return s;
  const m =
    /\/01\/(\d{8,14})(?=[/?#]|$)/.exec(s) ?? // Digital Link URL
    /^\(01\)(\d{14})/.exec(s) ?? // human-readable element string
    /^(?:\]d2|\]Q3|\x1d)?01(\d{14})/.exec(s); // raw element string (DataMatrix / QR)
  if (!m) return null;
  let gtin = m[1].padStart(14, '0');
  // Open Food Facts stores EAN-13 codes, so drop the GTIN-14 leading zero(s).
  while (gtin.length > 13 && gtin.startsWith('0')) gtin = gtin.slice(1);
  return gtin;
}
