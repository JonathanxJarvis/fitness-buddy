import { fdcToFood, USDA_KEY, type FdcFood } from './usda';
import { INGREDIENTS } from './meals';
import type { Food, Nutrients } from './types';

/*
 * Online lookups for dishes that aren't in the offline meal library.
 * - USDA FoodData Central, "Survey (FNDDS)": thousands of prepared dishes as
 *   eaten in the US (lasagna, pad thai, burritos …) with full nutrients.
 *   Public domain.
 * - TheMealDB (free test key "1"): recipes with photos, ingredients and steps,
 *   but no nutrients, so we estimate them from our ingredient table.
 * Both fail quietly (empty result) so the app keeps working offline.
 */

const FDC_SEARCH = 'https://api.nal.usda.gov/fdc/v1/foods/search';
const MEALDB = 'https://www.themealdb.com/api/json/v1/1/search.php?s=';

interface Opts {
  signal?: AbortSignal;
  timeoutMs?: number;
}

async function getJson<T>(url: string, { signal, timeoutMs = 8000 }: Opts = {}): Promise<T> {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  signal?.addEventListener('abort', onAbort);
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

// ---------- USDA FNDDS prepared dishes ----------

interface FndssMeasure {
  disseminationText?: string;
  gramWeight?: number;
  rank?: number;
}
type FndssFood = FdcFood & { foodMeasures?: FndssMeasure[] };

/** FNDDS food -> Food, with its household portions ("1 piece (250 g)") as servings. */
export function fnddsToFood(f: FndssFood): Food | null {
  const food = fdcToFood(f);
  if (!food) return null;
  // fdcToFood's base is 100 g for survey foods (no package serving).
  const per100 = food.nutrients;
  const measures = (f.foodMeasures ?? [])
    .filter((m) => m.gramWeight && m.gramWeight > 0 && m.disseminationText)
    .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))
    .slice(0, 3)
    .map((m) => ({
      label: /quantity not specified/i.test(m.disseminationText!) ? `typical portion (${Math.round(m.gramWeight!)} g)` : `${m.disseminationText!} (${Math.round(m.gramWeight!)} g)`,
      grams: m.gramWeight!,
    }));
  if (!measures.length) return food;
  const baseGrams = measures[0].grams;
  const scale = baseGrams / 100;
  return {
    ...food,
    nutrients: Object.fromEntries(Object.entries(per100).map(([k, v]) => [k, (v as number) * scale])) as unknown as Nutrients,
    servings: [
      ...measures.map((m) => ({ label: m.label, factor: m.grams / baseGrams })),
      { label: '100 g', factor: 100 / baseGrams },
      { label: '1 oz', factor: 28.3495 / baseGrams },
      { label: '1 g', factor: 1 / baseGrams },
    ],
  };
}

/** Prepared dishes and meals from USDA FNDDS. Resolves to [] when offline or on error. */
export async function searchUsdaMeals(query: string, opts: Opts = {}): Promise<Food[]> {
  const q = query.trim();
  if (!q) return [];
  const url = `${FDC_SEARCH}?api_key=${USDA_KEY}&pageSize=15&query=${encodeURIComponent(q)}&dataType=${encodeURIComponent('Survey (FNDDS)')}`;
  try {
    const json = await getJson<{ foods?: FndssFood[] }>(url, opts);
    return (json.foods ?? []).map(fnddsToFood).filter((f): f is Food => f !== null);
  } catch {
    return [];
  }
}

// ---------- TheMealDB recipes ----------

export interface RecipeIngredient {
  name: string;
  measure: string;
  /** Our estimate of the grams, when the measure could be read. */
  grams?: number;
  /** Ingredient-table key it matched, if any. */
  matched?: string;
}

export interface NutrientEstimate {
  /** Always true: TheMealDB has no nutrients; these come from our ingredient table. */
  estimate: true;
  /** Whole recipe, counting only matched ingredients. */
  total: Nutrients;
  /** Per serving, assuming `servings` portions. */
  perServing: Nutrients;
  servings: number;
  matched: string[];
  unmatched: string[];
  /** Share of listed ingredients we could match (0–1). */
  coverage: number;
}

export interface Recipe {
  id: string;
  name: string;
  thumbnail?: string;
  category?: string;
  area?: string;
  ingredients: RecipeIngredient[];
  instructions: string;
  sourceUrl: string;
  youtube?: string;
  nutrition: NutrientEstimate | null;
}

// Matcher: pattern on the normalized ingredient name -> table key, grams per
// piece (for "2 eggs") and density in g per ml (for cups/spoons). Specific first.
type Rule = [RegExp, string, number?, number?];
const RULES: Rule[] = [
  [/stock|broth|bouillon/, 'broth', undefined, 1],
  [/olive oil|vegetable oil|sunflower oil|rapeseed|peanut oil|sesame oil|\boil\b/, 'oil', undefined, 0.92],
  [/coconut milk|coconut cream/, 'coconutLight', 400, 1],
  [/cream cheese/, 'creamCheese', undefined, 1],
  [/sour cream|creme fraiche/, 'sourCream', undefined, 1],
  [/rice noodles/, 'riceNoodles', undefined, 0.45],
  [/spaghetti|penne|pasta|macaroni|linguine|fettuccine|tagliatelle|lasagne|rigatoni|fusilli|noodles/, 'pastaDry', undefined, 0.45],
  [/egg white/, 'eggWhite', 33],
  [/\beggs?\b/, 'egg', 50],
  [/chicken breast|chicken fillet/, 'chickenBreastRaw', 170],
  [/chicken thigh/, 'chickenBreastRaw', 110],
  [/\bchicken\b/, 'chickenBreastRaw', 170],
  [/turkey mince|ground turkey/, 'turkeyGround'],
  [/minced beef|ground beef|beef mince|\bmince\b/, 'beefGroundRaw'],
  [/\bbeef\b|steak/, 'beefSteak'],
  [/\bpork\b/, 'porkLoin'],
  [/bacon|pancetta/, 'bacon', 25],
  [/\bham\b/, 'ham'],
  [/smoked salmon/, 'smokedSalmon'],
  [/salmon/, 'salmonRaw', 150],
  [/tuna/, 'tuna'],
  [/prawn|shrimp/, 'shrimp'],
  [/\bcod\b|haddock|white fish|pollock/, 'whiteFish', 150],
  [/tofu/, 'tofu'],
  [/red lentil|lentil/, 'lentilsDry', undefined, 0.8],
  [/chickpea/, 'chickpeas', undefined, 0.65],
  [/kidney bean/, 'kidneyBeans', undefined, 0.7],
  [/black bean/, 'blackBeans', undefined, 0.7],
  [/peanut butter/, 'peanutButter', undefined, 1.06],
  [/peanut/, 'peanuts', undefined, 0.6],
  [/almond/, 'almonds', undefined, 0.6],
  [/walnut/, 'walnuts', undefined, 0.5],
  [/basmati|jasmine|\brice\b/, 'riceDry', undefined, 0.8],
  [/couscous/, 'couscous', undefined, 0.7],
  [/quinoa/, 'quinoa', undefined, 0.75],
  [/oats|porridge/, 'oats', undefined, 0.4],
  [/breadcrumbs/, 'breadcrumbs', undefined, 0.45],
  [/plain flour|self-raising flour|\bflour\b/, 'flour', undefined, 0.53],
  [/tortilla/, 'tortilla', 60],
  [/pitta|pita/, 'pita', 60],
  [/\bbread\b/, 'toast', 30],
  [/sweet potato/, 'sweetPotato', 200],
  [/potato/, 'potatoes', 170],
  [/broccoli/, 'broccoli', 300],
  [/spinach/, 'spinach', undefined, 0.2],
  [/lettuce|salad leaves|rocket/, 'greens', 300, 0.2],
  [/cherry tomato/, 'tomato', 17],
  [/chopped tomatoes|tinned tomatoes|canned tomatoes|passata|tomato puree|tomato sauce/, 'passata', 400, 1],
  [/tomato/, 'tomato', 120],
  [/cucumber/, 'cucumber', 300],
  [/(bell|red|green|yellow|orange) peppers?\b|capsicum/, 'bellPepper', 150],
  [/spring onion|scallion/, 'onion', 15],
  [/onion|shallot/, 'onion', 110],
  [/carrot/, 'carrot', 60],
  [/zucchini|courgette/, 'zucchini', 200],
  [/mushroom/, 'mushrooms', 18, 0.4],
  [/green beans/, 'greenBeans', undefined, 0.5],
  [/\bpeas\b/, 'peas', undefined, 0.6],
  [/sweetcorn|\bcorn\b/, 'corn', undefined, 0.7],
  [/asparagus/, 'asparagus', 20],
  [/cabbage/, 'cabbage', 900],
  [/avocado/, 'avocado', 150],
  [/olive(?!.*oil)/, 'olives', 4],
  [/banana/, 'banana', 118],
  [/apple/, 'apple', 180],
  [/lemon|lime/, 'orange', 0], // negligible juice, but counted as matched
  [/blueberr/, 'blueberries', undefined, 0.6],
  [/strawberr/, 'strawberries', 12, 0.6],
  [/raisin|sultana/, 'raisins', undefined, 0.6],
  [/butter/, 'butter', undefined, 0.95],
  [/double cream|heavy cream|single cream|\bcream\b/, 'cream', undefined, 1],
  [/greek yogh?urt/, 'greekYogurt', undefined, 1],
  [/yogh?urt/, 'yogurt', undefined, 1],
  [/milk/, 'milk', undefined, 1.03],
  [/parmesan|parmigiano/, 'parmesan', undefined, 0.4],
  [/mozzarella/, 'mozzarella', 125],
  [/feta/, 'feta', undefined, 0.5],
  [/cheddar|\bcheese\b/, 'cheddar', undefined, 0.45],
  [/soy sauce/, 'soy', undefined, 1.1],
  [/honey/, 'honey', undefined, 1.4],
  [/maple syrup/, 'maple', undefined, 1.3],
  [/sugar/, 'sugar', undefined, 0.85],
  [/mayonnaise/, 'mayo', undefined, 0.95],
  [/ketchup/, 'ketchup', undefined, 1.1],
  [/mustard/, 'mustard', undefined, 1],
];

/** Things that don't move the numbers: spices, herbs, water, salt. */
const NEGLIGIBLE = /salt|pepper|water|garlic|ginger|cumin|paprika|chilli|chili powder|oregano|basil|thyme|rosemary|parsley|coriander|cilantro|bay lea|cinnamon|nutmeg|turmeric|curry powder|garam masala|vanilla|vinegar|baking powder|bicarbonate|yeast|mint|dill|chives|saffron|cardamom|clove/;

const UNIT_ML: Record<string, number> = { cup: 240, cups: 240, tbsp: 15, tbs: 15, tablespoon: 15, tablespoons: 15, tblsp: 15, tsp: 5, teaspoon: 5, teaspoons: 5, ml: 1, l: 1000, litre: 1000, liter: 1000, dl: 100, cl: 10 };
const UNIT_G: Record<string, number> = { g: 1, gr: 1, gram: 1, grams: 1, kg: 1000, oz: 28.35, ounce: 28.35, ounces: 28.35, lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6 };

function parseAmount(s: string): number | null {
  const t = s.trim();
  const frac = t.match(/^(\d+)\s+(\d+)\/(\d+)/);
  if (frac) return Number(frac[1]) + Number(frac[2]) / Number(frac[3]);
  const f = t.match(/^(\d+)\/(\d+)/);
  if (f) return Number(f[1]) / Number(f[2]);
  const uni: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
  const u = t.match(/^(\d*)\s*([½¼¾⅓⅔])/);
  if (u) return (u[1] ? Number(u[1]) : 0) + uni[u[2]];
  const n = t.match(/^(\d+(?:[.,]\d+)?)/);
  return n ? Number(n[1].replace(',', '.')) : null;
}

/** Best-effort grams for a TheMealDB measure like "200g", "2 tbsp", "1 cup", "3". */
export function measureToGrams(measure: string, rule?: Rule): number | undefined {
  const m = measure.toLowerCase().trim();
  if (!m) return rule?.[2];
  const amount = parseAmount(m) ?? (/^(a|an|one)\b/.test(m) ? 1 : null);
  const unitMatch = m.match(/(\d|½|¼|¾|⅓|⅔)\s*([a-z]+)/) ?? m.match(/^(a|an|one)\s+([a-z]+)/);
  const unit = unitMatch?.[2];
  if (amount === null) return /pinch|dash|to taste|sprinkl|garnish/.test(m) ? 0 : rule?.[2];
  if (unit && UNIT_G[unit]) return amount * UNIT_G[unit];
  if (unit && UNIT_ML[unit]) return amount * UNIT_ML[unit] * (rule?.[3] ?? 1);
  if (/pinch|dash/.test(m)) return 0;
  // A bare count ("2", "3 large", "1 tin") uses the per-piece weight.
  if (rule?.[2] !== undefined) return amount * rule[2];
  return undefined;
}

const lower = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function ruleFor(name: string): Rule | undefined {
  const n = lower(name);
  return RULES.find(([re]) => re.test(n));
}

/** Estimate recipe nutrients from the ingredient table (marked as an estimate). */
export function estimateRecipe(items: RecipeIngredient[], servings = 4): NutrientEstimate | null {
  const total: Nutrients = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
  const matched: string[] = [];
  const unmatched: string[] = [];
  let counted = 0;
  for (const it of items) {
    const rule = ruleFor(it.name);
    if (!rule && NEGLIGIBLE.test(lower(it.name))) continue;
    counted++;
    const grams = rule ? measureToGrams(it.measure, rule) : undefined;
    if (!rule || grams === undefined) {
      unmatched.push(it.name);
      continue;
    }
    it.matched = rule[1];
    it.grams = Math.round(grams);
    matched.push(it.name);
    const per = INGREDIENTS[rule[1]].per100;
    for (const k of ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'] as const) total[k] = (total[k] ?? 0) + (per[k] * grams) / 100;
  }
  if (!matched.length) return null;
  const round = (x: Nutrients) => Object.fromEntries(Object.entries(x).map(([k, v]) => [k, Math.round((v as number) * 10) / 10])) as unknown as Nutrients;
  const perServing = Object.fromEntries(Object.entries(total).map(([k, v]) => [k, (v as number) / servings])) as unknown as Nutrients;
  return { estimate: true, total: round(total), perServing: round(perServing), servings, matched, unmatched, coverage: counted ? matched.length / counted : 1 };
}

type MealDbMeal = Record<string, string | null | undefined>;

export function parseMealDbMeal(m: MealDbMeal): Recipe {
  const ingredients: RecipeIngredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = m[`strIngredient${i}`]?.trim();
    if (!name) continue;
    ingredients.push({ name, measure: m[`strMeasure${i}`]?.trim() ?? '' });
  }
  const id = String(m.idMeal ?? '');
  return {
    id: `mealdb:${id}`,
    name: m.strMeal?.trim() ?? 'Recipe',
    thumbnail: m.strMealThumb || undefined,
    category: m.strCategory || undefined,
    area: m.strArea || undefined,
    ingredients,
    instructions: (m.strInstructions ?? '').trim(),
    sourceUrl: m.strSource || `https://www.themealdb.com/meal/${id}`,
    youtube: m.strYoutube || undefined,
    nutrition: estimateRecipe(ingredients),
  };
}

/** Recipes from TheMealDB with estimated nutrients. Resolves to [] when offline or on error. */
export async function searchRecipes(query: string, opts: Opts = {}): Promise<Recipe[]> {
  const q = query.trim();
  if (!q) return [];
  try {
    const json = await getJson<{ meals?: MealDbMeal[] | null }>(`${MEALDB}${encodeURIComponent(q)}`, opts);
    return (json.meals ?? []).map(parseMealDbMeal);
  } catch {
    return [];
  }
}
