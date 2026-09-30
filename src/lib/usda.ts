import type { Food, Nutrients } from './types';

/**
 * USDA FoodData Central: ~400,000 generic and branded US foods. DEMO_KEY works
 * without sign-up (rate limited per device); a free personal key raises the limit.
 */
const BASE = 'https://api.nal.usda.gov/fdc/v1/foods/search';
export const USDA_KEY = 'DEMO_KEY';

interface FdcNutrient {
  nutrientId?: number;
  nutrientNumber?: string;
  unitName?: string;
  value?: number;
}

export interface FdcFood {
  fdcId: number;
  description: string;
  dataType?: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  householdServingFullText?: string;
  foodNutrients?: FdcNutrient[];
}

const IDS: Record<Exclude<keyof Nutrients, 'calories'>, number> = {
  protein: 1003,
  fat: 1004,
  carbs: 1005,
  fiber: 1079,
  sugar: 2000,
  sodium: 1093,
  potassium: 1092,
  calcium: 1087,
  iron: 1089,
  vitaminC: 1162,
  vitaminD: 1114,
};

/** FDC names are often ALL CAPS or "Chicken, breast, roasted"; make them readable. */
export function tidyName(s: string): string {
  const t = s.trim();
  const lower = t === t.toUpperCase() ? t.toLowerCase() : t;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

/** Search results report nutrients per 100 g (or 100 ml). */
export function fdcNutrients(list: FdcNutrient[] = []): Nutrients | null {
  const get = (id: number) => list.find((n) => n.nutrientId === id)?.value;
  let kcal = get(1008) ?? get(2047) ?? get(2048);
  if (kcal === undefined) {
    const kj = list.find((n) => n.nutrientId === 1062 || (n.nutrientId === 1008 && n.unitName?.toLowerCase() === 'kj'))?.value;
    if (kj !== undefined) kcal = kj / 4.184;
  }
  const protein = get(IDS.protein);
  const carbs = get(IDS.carbs);
  const fat = get(IDS.fat);
  if (kcal === undefined || (protein === undefined && carbs === undefined && fat === undefined)) return null;
  const out: Nutrients = { calories: kcal, protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0 };
  for (const k of ['fiber', 'sugar', 'sodium', 'potassium', 'calcium', 'iron', 'vitaminC', 'vitaminD'] as const) {
    const v = get(IDS[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

export function fdcToFood(f: FdcFood): Food | null {
  const per100 = fdcNutrients(f.foodNutrients);
  if (!per100) return null;
  const servings: Food['servings'] = [{ label: '100 g', factor: 1 }];
  const unit = f.servingSizeUnit?.toLowerCase();
  if (f.servingSize && (unit === 'g' || unit === 'grm' || unit === 'ml' || unit === 'mlt')) {
    const label = f.householdServingFullText ? `${f.householdServingFullText.toLowerCase()} (${Math.round(f.servingSize)} ${unit.startsWith('m') ? 'ml' : 'g'})` : `serving (${Math.round(f.servingSize)} g)`;
    servings.unshift({ label, factor: f.servingSize / 100 });
  }
  servings.push({ label: '1 oz', factor: 28.3495 / 100 }, { label: '1 g', factor: 0.01 });
  // Base nutrients are for servings[0], so rescale when a package serving leads.
  const base = servings[0].factor;
  const nutrients = Object.fromEntries(Object.entries(per100).map(([k, v]) => [k, (v as number) * base])) as unknown as Nutrients;
  return {
    id: `usda:${f.fdcId}`,
    name: tidyName(f.description),
    brand: f.brandName || f.brandOwner ? tidyName((f.brandName || f.brandOwner)!) : undefined,
    barcode: f.gtinUpc,
    source: 'usda',
    nutrients,
    servings: servings.map((s) => ({ ...s, factor: s.factor / base })),
  };
}

export async function searchUsda(query: string, signal?: AbortSignal): Promise<Food[]> {
  const url = `${BASE}?api_key=${USDA_KEY}&pageSize=25&query=${encodeURIComponent(query)}&dataType=${encodeURIComponent('Foundation,SR Legacy,Survey (FNDDS),Branded')}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`USDA ${res.status}`);
  const json = (await res.json()) as { foods?: FdcFood[] };
  return (json.foods ?? []).map(fdcToFood).filter((f): f is Food => f !== null);
}
