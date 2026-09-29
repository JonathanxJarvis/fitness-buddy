import { INGREDIENTS, MEALS, findMeal, normalizeText, type Meal } from './meals';
import type { Food, MealType, Nutrients } from './types';

/*
 * Custom meal plans (Pro). A week of breakfasts, lunches, dinners and snacks
 * built from the offline meal library in lib/meals, with each meal's portion
 * scaled so every day lands within about ±5 % of the calorie and protein
 * goals. No AI and no network: the same seed always gives the same plan, and a
 * new seed gives a new one. Germany first: portions in grams, supermarket
 * names in German on the shopping list, cooked weights turned into what you
 * actually buy (dry rice and pasta, raw meat).
 */

export type MealDiet = 'any' | 'vegetarian' | 'pescatarian' | 'vegan' | 'no-pork';

export const DIETS: { key: MealDiet; label: string }[] = [
  { key: 'any', label: 'Everything' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'pescatarian', label: 'Pescatarian' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'no-pork', label: 'No pork' },
];

export type PlanStyle = 'mix' | 'high-protein' | 'mediterranean' | 'german' | 'quick';
export type PlanMode = 'simple' | 'varied';

export const PLAN_STYLES: { key: PlanStyle; label: string; blurb: string; icon: string }[] = [
  { key: 'mix', label: 'Mix it up', blurb: 'A bit of everything', icon: 'shuffle' },
  { key: 'high-protein', label: 'High protein', blurb: 'Lean meat, eggs, quark and skyr', icon: 'barbell-outline' },
  { key: 'mediterranean', label: 'Mediterranean', blurb: 'Fish, feta, chickpeas and olive oil', icon: 'sunny-outline' },
  { key: 'german', label: 'Classic German', blurb: 'Quark, Vollkornbrot, Spätzle and home cooking', icon: 'home-outline' },
  { key: 'quick', label: 'Quick & easy', blurb: 'Most meals in 15 minutes or less', icon: 'flash-outline' },
];

export const PLAN_MODES: { key: PlanMode; label: string; blurb: string }[] = [
  { key: 'simple', label: 'Simple', blurb: 'Same breakfast, 2 lunches, 2 dinners. Short shopping list.' },
  { key: 'varied', label: 'Varied', blurb: 'Something new most days. Longer shopping list.' },
];

export interface PlannedItem {
  key: string;
  grams: number;
}

export interface PlannedMeal {
  slot: MealType;
  mealId: string;
  /** Portion relative to the library recipe (1 = as written). */
  scale: number;
  /** Ingredients in grams as eaten, already scaled and rounded. */
  items: PlannedItem[];
}

export interface PlanDay {
  meals: PlannedMeal[];
}

export interface MealPlanState {
  seed: string;
  /** First day of the plan (YYYY-MM-DD). */
  startDate: string;
  /** Goals the plan was built for. */
  calories: number;
  protein: number;
  diet: MealDiet;
  /** Missing on plans saved before styles existed (treated as 'mix'). */
  style?: PlanStyle;
  /** Missing on plans saved before modes existed (treated as 'varied'). */
  mode?: PlanMode;
  days: PlanDay[];
  /** What the user typed as favorite meals, kept so a new plan reuses it. */
  favorites?: string;
  /** Library meals matched to the favorites (locally, plus AI picks when available). */
  favoriteIds?: string[];
  /** Shopping list item ids ticked off. */
  checked: string[];
  createdAt: number;
}

export const TOLERANCE = 0.05;

// ---------- seeded randomness ----------

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32: small, fast, good enough for shuffling meals. */
export function makeRng(seed: string): () => number {
  let a = hashSeed(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newSeed(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// ---------- diet & pools ----------

const PORK = new Set(['porkLoin', 'ham', 'bacon', 'pepperoni', 'bratwurst', 'wiener', 'leberkaese', 'maultaschen']);
const FISH = new Set(['salmon', 'salmonRaw', 'smokedSalmon', 'tuna', 'shrimp', 'whiteFish', 'fishSticks']);
/** Hard to find or odd in a German weekly shop; the planner leaves these meals out. */
const SKIP_INGREDIENTS = new Set(['jerky', 'cornTortilla', 'tortillaChips']);

export function fitsDiet(meal: Meal, diet: MealDiet): boolean {
  return meal.ingredients.every(({ key }) => {
    const d = INGREDIENTS[key]?.diet;
    switch (diet) {
      case 'vegan':
        return d === 'vg';
      case 'vegetarian':
        return d !== 'm';
      case 'pescatarian':
        return d !== 'm' || FISH.has(key);
      case 'no-pork':
        return !PORK.has(key);
      default:
        return true;
    }
  });
}

function plannable(meal: Meal, diet: MealDiet, favs?: ReadonlySet<string>): boolean {
  // A favorite treat (Döner, pancakes) is welcome; the portions still keep the day on target.
  return (!meal.tags.includes('treat') || !!favs?.has(meal.id)) && !meal.ingredients.some((i) => SKIP_INGREDIENTS.has(i.key)) && fitsDiet(meal, diet);
}

/** Library meals the planner may put in a slot. */
export function slotPool(slot: MealType, diet: MealDiet, favs?: ReadonlySet<string>): Meal[] {
  return MEALS.filter((m) => m.meals.includes(slot) && plannable(m, diet, favs));
}

const MEDITERRANEAN = new Set([
  'greek-yogurt-parfait', 'greek-yogurt-honey', 'skyr-honey-walnuts', 'egg-white-omelette', 'veggie-omelette', 'shakshuka', 'fruit-salad',
  'greek-salad', 'greek-chicken-bowl', 'roast-veg-feta', 'chickpea-salad', 'falafel-plate', 'falafel-wrap', 'caprese-bread', 'minestrone',
  'couscous-chicken-salad', 'salade-nicoise', 'tuna-salad', 'tuna-tomato-pasta', 'garlic-shrimp-pasta', 'pasta-primavera', 'pesto-pasta',
  'gnocchi-tomato-mozzarella', 'salmon-potatoes-spinach', 'salmon-sweet-potato', 'salmon-rice-bowl', 'pollock-potatoes-veg', 'lentil-soup',
  'quinoa-buddha-bowl', 'hummus-veggie-sticks', 'almonds', 'trail-mix', 'smoked-salmon-crispbread',
]);

/** How strongly a plan style favors a meal (1 = neutral). */
export function styleFit(meal: Meal, style: PlanStyle = 'mix'): number {
  switch (style) {
    case 'high-protein':
      return meal.tags.includes('high-protein') ? 3 : 0.5;
    case 'mediterranean':
      return MEDITERRANEAN.has(meal.id) ? 4 : 0.35;
    case 'german':
      return meal.cuisine === 'de' ? 3.5 : 0.35;
    case 'quick':
      return meal.prepMinutes <= 10 ? 3.5 : meal.prepMinutes <= 15 ? 2.5 : meal.prepMinutes <= 25 ? 0.6 : 0.15;
    default:
      return 1;
  }
}

export function fitsStyle(meal: Meal, style: PlanStyle = 'mix'): boolean {
  return styleFit(meal, style) > 1;
}

/** How often a meal gets picked: German and international dishes first, then the plan style, then favorites. */
function weightOf(meal: Meal, proteinRatio: number, style: PlanStyle = 'mix', strength = 1, favs?: ReadonlySet<string>, favBoost = 0): number {
  let w = meal.cuisine === 'de' ? 1.6 : meal.cuisine === 'intl' ? 1.2 : 0.7;
  if (meal.tags.includes('high-protein')) w *= proteinRatio > 0.22 ? 1.8 : 1.2;
  w *= Math.pow(styleFit(meal, style), strength);
  return favs?.has(meal.id) ? w * (1 + 12 * favBoost) : w;
}

// ---------- favorite meals ----------

/** Filler words in "chicken with rice" or "Nudeln mit Soße". */
const STOP = new Set([
  'with', 'and', 'or', 'the', 'a', 'an', 'of', 'in', 'on', 'my', 'some', 'style', 'homemade', 'plate', 'bowl', 'dish',
  'mit', 'und', 'oder', 'der', 'die', 'das', 'den', 'dem', 'ein', 'eine', 'vom', 'von', 'auf', 'im', 'art', 'teller', 'selbstgemacht',
]);

/** German ↔ English and everyday names, all normalized (see normalizeText). Each group is one idea. */
const SYNONYM_GROUPS: string[][] = [
  ['pasta', 'nudel', 'noodle', 'spaghetti', 'penne', 'fusilli', 'tagliatelle', 'makkaroni', 'macaroni', 'lasagn'],
  ['chicken', 'hahnchen', 'huhn', 'huhnchen', 'hanchen', 'poulet', 'geflugel'],
  ['turkey', 'pute', 'puten', 'truthahn'],
  ['beef', 'rind', 'rinder'],
  ['pork', 'schwein'],
  ['mince', 'ground', 'hack', 'hackfleisch', 'gehacktes'],
  ['rice', 'reis'],
  ['potato', 'kartoffel', 'erdapfel'],
  ['fries', 'pommes', 'chips'],
  ['salmon', 'lachs'],
  ['fish', 'fisch', 'seelachs', 'kabeljau', 'cod', 'pollock'],
  ['tuna', 'thunfisch'],
  ['shrimp', 'prawn', 'garnele', 'scampi', 'krabbe'],
  ['egg', 'ei', 'eier', 'omelet', 'omelett', 'ruhrei', 'scrambled'],
  ['pancake', 'pfannkuchen', 'eierkuchen', 'crepe', 'kaiserschmarrn'],
  ['doner', 'kebab', 'kebap', 'durum', 'gyros'],
  ['cheese', 'kase'],
  ['vegetable', 'veggie', 'veg', 'gemuse'],
  ['salad', 'salat'],
  ['soup', 'suppe', 'eintopf', 'stew'],
  ['bread', 'brot', 'toast', 'sandwich', 'stulle', 'brotchen'],
  ['oats', 'oat', 'porridge', 'oatmeal', 'hafer', 'haferflocken', 'haferbrei', 'muesli', 'musli'],
  ['yogurt', 'joghurt', 'jogurt', 'yoghurt'],
  ['beans', 'bean', 'bohne'],
  ['lentil', 'linse', 'dal', 'dhal'],
  ['chickpea', 'kichererbse'],
  ['sausage', 'wurst', 'wurstchen'],
  ['steak', 'rindersteak'],
  ['burger', 'hamburger', 'cheeseburger'],
  ['stir', 'wok', 'stirfry'],
  ['spinach', 'spinat'],
  ['broccoli', 'brokkoli'],
  ['mushroom', 'pilz', 'champignon'],
  ['tomato', 'tomate'],
  ['apple', 'apfel'],
  ['berries', 'berry', 'beere', 'heidelbeere', 'blueberry', 'erdbeere', 'strawberry'],
  ['banana', 'banane'],
  ['peanut', 'erdnuss'],
  ['sweet potato', 'susskartoffel'],
  ['bowl', 'poke'],
  ['schnitzel', 'escalope'],
  ['spatzle', 'spaetzle', 'kasespatzle'],
  ['quark', 'magerquark', 'curd'],
];

const SYNONYMS = new Map<string, string[]>();
for (const group of SYNONYM_GROUPS) {
  const g = group.map(normalizeText);
  for (const w of g) SYNONYMS.set(w, [...new Set([...(SYNONYMS.get(w) ?? []), ...g])]);
}

/** "pancakes" → "pancake", "tomatoes" → "tomato", "Nudeln" → "nudel". */
function stem(w: string): string {
  if (w.length > 4 && w.endsWith('oes')) return w.slice(0, -2);
  if (w.length >= 4 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  if (w.length > 5 && w.endsWith('n')) return w.slice(0, -1);
  return w;
}

function alternatives(word: string): string[] {
  const out = new Set<string>([word, stem(word)]);
  for (const w of [...out]) for (const s of SYNONYMS.get(w) ?? []) out.add(s);
  return [...out];
}

/** Splits "Pasta, Döner; pancakes\nchicken with rice" into single favorites. */
export function splitFavorites(text: string): string[] {
  return [...new Set(text.split(/[,;\n/|•]+/).map((x) => x.trim()).filter((x) => x.length > 1))].slice(0, 20);
}

const words = (s: string) => normalizeText(s).split(/[^a-z0-9]+/).filter(Boolean);

interface MealHay {
  meal: Meal;
  names: string[];
  ingredients: string[];
}

let HAY: MealHay[] | null = null;
function hay(): MealHay[] {
  HAY ??= MEALS.map((meal) => ({
    meal,
    names: words(`${meal.name} ${meal.nameDe} ${meal.id.replace(/-/g, ' ')}`),
    ingredients: words(meal.ingredients.map((i) => `${i.name} ${i.nameDe} ${i.key.replace(/([A-Z])/g, ' $1')}`).join(' ')),
  }));
  return HAY;
}

const hit = (alts: string[], hayWords: string[]) =>
  alts.some((a) => (a.includes(' ') ? hayWords.join(' ').includes(a) : hayWords.some((w) => w.startsWith(a) || (a.length >= 5 && w.includes(a)))));

export interface FavoriteMatch {
  favorite: string;
  mealIds: string[];
}

/**
 * Library meals for each favorite, best first, offline. Every word of a
 * favorite must show up in a meal's name or ingredients (in English or German,
 * with simple synonyms like Nudeln = pasta); meals that have the words in their
 * name win, and ingredient-only matches count only when no name matches.
 */
export function matchFavorites(text: string, max = 6): FavoriteMatch[] {
  return splitFavorites(text).map((favorite) => {
    const toks = words(favorite).filter((w) => !STOP.has(w) && (w.length > 1 || w === 'ei'));
    if (!toks.length) return { favorite, mealIds: [] };
    const alts = toks.map(alternatives);
    const literal = toks.map((t) => [t, stem(t)]);
    const scored: { id: string; score: number; inName: boolean }[] = [];
    for (const h of hay()) {
      let score = 0;
      let inName = false;
      let ok = true;
      for (const [i, a] of alts.entries()) {
        if (hit(a, h.names)) {
          score += hit(literal[i], h.names) ? 2.5 : 2;
          inName = true;
        } else if (hit(a, h.ingredients)) score += 1;
        else {
          ok = false;
          break;
        }
      }
      if (ok) scored.push({ id: h.meal.id, score, inName });
    }
    const named = scored.filter((x) => x.inName);
    const pick = named.length ? named : scored;
    return { favorite, mealIds: pick.sort((a, b) => b.score - a.score).slice(0, max).map((x) => x.id) };
  });
}

/** All meal ids matched by the favorites, locally. */
export function favoriteMealIds(text: string | undefined): string[] {
  if (!text?.trim()) return [];
  return [...new Set(matchFavorites(text).flatMap((m) => m.mealIds))];
}

// ---------- nutrients ----------

const KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'] as const;

export function itemsNutrients(items: PlannedItem[]): Nutrients {
  const out: Nutrients = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 };
  for (const it of items) {
    const ing = INGREDIENTS[it.key];
    if (!ing) continue;
    for (const k of KEYS) out[k] = (out[k] ?? 0) + (ing.per100[k] * it.grams) / 100;
  }
  return out;
}

export function dayTotals(day: PlanDay): Nutrients {
  return itemsNutrients(day.meals.flatMap((m) => m.items));
}

/** Largest relative miss on calories or protein (0.03 = 3 % off). */
export function dayError(day: PlanDay, calories: number, protein: number): number {
  const t = dayTotals(day);
  return Math.max(Math.abs(t.calories / calories - 1), Math.abs(t.protein / protein - 1));
}

export function dayInRange(day: PlanDay, calories: number, protein: number, tol = TOLERANCE): boolean {
  return dayError(day, calories, protein) <= tol;
}

// ---------- portions ----------

/** Grams of one piece, for items people count rather than weigh. */
export const PIECE: Record<string, { g: number; one: string; many: string }> = {
  egg: { g: 50, one: 'egg', many: 'eggs' },
  roll: { g: 55, one: 'roll', many: 'rolls' },
  pretzel: { g: 80, one: 'pretzel', many: 'pretzels' },
  bagel: { g: 95, one: 'bagel', many: 'bagels' },
  croissant: { g: 60, one: 'croissant', many: 'croissants' },
  banana: { g: 120, one: 'banana', many: 'bananas' },
  apple: { g: 180, one: 'apple', many: 'apples' },
  orange: { g: 150, one: 'orange', many: 'oranges' },
  avocado: { g: 140, one: 'avocado', many: 'avocados' },
  bellPepper: { g: 160, one: 'pepper', many: 'peppers' },
  onion: { g: 100, one: 'onion', many: 'onions' },
  cucumber: { g: 400, one: 'cucumber', many: 'cucumbers' },
  zucchini: { g: 250, one: 'zucchini', many: 'zucchini' },
  mozzarella: { g: 125, one: 'ball', many: 'balls' },
  tortilla: { g: 70, one: 'wrap', many: 'wraps' },
  proteinBar: { g: 60, one: 'bar', many: 'bars' },
};

function roundGrams(key: string, g: number): number {
  if (key === 'egg') return Math.max(50, Math.round(g / 50) * 50);
  if (g < 20) return Math.max(1, Math.round(g));
  if (g < 150) return Math.round(g / 5) * 5;
  return Math.round(g / 10) * 10;
}

export function scaledItems(meal: Meal, scale: number): PlannedItem[] {
  return meal.ingredients.map((i) => ({ key: i.key, grams: roundGrams(i.key, i.grams * scale) }));
}

// Share of the day's calories per slot.
const SHARES_1: number[] = [0.25, 0.33, 0.32, 0.1];
const SHARES_2: number[] = [0.23, 0.3, 0.3, 0.085, 0.085];
const SLOTS_1: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];
const SLOTS_2: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks', 'snacks'];

function bounds(slot: MealType): [number, number] {
  return slot === 'snacks' ? [0.5, 2] : [0.6, 1.75];
}

/**
 * Portion scales for a set of meals so the calories and protein hit the goals,
 * staying as close as possible to each slot's usual share of the day. Weighted
 * least squares with two linear constraints (closed form), clamping to sane
 * portion sizes and re-solving for the rest.
 */
export function solveScales(meals: Meal[], slots: MealType[], shares: number[], calories: number, protein: number): number[] {
  const n = meals.length;
  const k = meals.map((m) => m.nutrients.calories);
  const p = meals.map((m) => m.nutrients.protein);
  const t = meals.map((m, i) => (shares[i] * calories) / Math.max(1, k[i]));
  const lim = slots.map(bounds);
  const s = t.map((x, i) => Math.min(lim[i][1], Math.max(lim[i][0], x)));
  const fixed = new Array<boolean>(n).fill(false);
  for (let round = 0; round < n; round++) {
    const free = [...Array(n).keys()].filter((i) => !fixed[i]);
    if (!free.length) break;
    let K = calories;
    let P = protein;
    for (let i = 0; i < n; i++) {
      if (!fixed[i]) continue;
      K -= s[i] * k[i];
      P -= s[i] * p[i];
    }
    let rK = K;
    let rP = P;
    let m11 = 0;
    let m12 = 0;
    let m22 = 0;
    for (const i of free) {
      rK -= t[i] * k[i];
      rP -= t[i] * p[i];
      const w = t[i] * t[i];
      m11 += w * k[i] * k[i];
      m12 += w * k[i] * p[i];
      m22 += w * p[i] * p[i];
    }
    const det = m11 * m22 - m12 * m12;
    if (free.length >= 2 && Math.abs(det) > 1e-6 * m11 * m22) {
      const l1 = (m22 * rK - m12 * rP) / det;
      const l2 = (m11 * rP - m12 * rK) / det;
      for (const i of free) s[i] = t[i] + t[i] * t[i] * (l1 * k[i] + l2 * p[i]);
    } else {
      // Only calories can be matched: scale the free meals together.
      const base = free.reduce((a, i) => a + t[i] * k[i], 0);
      for (const i of free) s[i] = t[i] * (base > 0 ? K / base : 1);
    }
    let clamped = false;
    for (const i of free) {
      if (s[i] < lim[i][0] || s[i] > lim[i][1]) {
        s[i] = Math.min(lim[i][1], Math.max(lim[i][0], s[i]));
        fixed[i] = true;
        clamped = true;
      }
    }
    if (!clamped) break;
  }
  return s;
}

function buildDay(meals: Meal[], slots: MealType[], calories: number, protein: number): { day: PlanDay; err: number; stretch: number } {
  const shares = slots.length === 5 ? SHARES_2 : SHARES_1;
  const scales = solveScales(meals, slots, shares, calories, protein);
  const day: PlanDay = {
    meals: meals.map((m, i) => ({ slot: slots[i], mealId: m.id, scale: Math.round(scales[i] * 100) / 100, items: scaledItems(m, scales[i]) })),
  };
  // How far portions drift from the recipe; big main courses cost the most.
  const stretch = scales.reduce((a, x, i) => a + Math.abs(Math.log(x)) * (slots[i] === 'snacks' ? 0.5 : 1) + (slots[i] !== 'snacks' && x > 1.45 ? (x - 1.45) * 2 : 0), 0) / scales.length;
  return { day, err: dayError(day, calories, protein), stretch };
}

// ---------- the week ----------

export interface PlanOptions {
  calories: number;
  protein: number;
  diet?: MealDiet;
  style?: PlanStyle;
  /** Defaults to 'varied'; the screen defaults new plans to 'simple'. */
  mode?: PlanMode;
  seed: string;
  startDate: string;
  days?: number;
  /** Free text, e.g. "Pasta, Döner, pancakes". Stored with the plan. */
  favorites?: string;
  /** Matched meal ids; defaults to the local match of `favorites`. */
  favoriteIds?: string[];
}

const MAX_USES: Record<MealType, number> = { breakfast: 2, lunch: 2, dinner: 2, snacks: 3 };
const TRIES = 260;

function pickWeighted<T>(rng: () => number, items: T[], weight: (t: T) => number): T | undefined {
  const ws = items.map(weight);
  const total = ws.reduce((a, b) => a + b, 0);
  if (total <= 0) return undefined;
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= ws[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

const signature = (day: PlanDay) => day.meals.map((m) => `${m.slot}:${m.mealId}`).sort().join('|');

type Resolved = Required<Omit<PlanOptions, 'mode' | 'favorites' | 'favoriteIds'>> & { strength: number; favs: ReadonlySet<string>; favBoost: number };

/** Worst day's miss on calories or protein. */
export function planError(plan: Pick<MealPlanState, 'days' | 'calories' | 'protein'>): number {
  return plan.days.reduce((a, d) => Math.max(a, dayError(d, plan.calories, plan.protein)), 0);
}

/**
 * A week of meals. The style only biases the picks: when a strong bias can't
 * hit the goals (say, high protein on a big calorie budget), it is softened
 * until every day lands on target.
 */
export function generateMealPlan(opts: PlanOptions): MealPlanState {
  const { calories, protein, seed, startDate, diet = 'any', style = 'mix', mode = 'varied', days = 7 } = opts;
  const favorites = opts.favorites?.trim() || undefined;
  const ids = (opts.favoriteIds ?? favoriteMealIds(favorites)).filter((id) => !!findMeal(id));
  const favs: ReadonlySet<string> = new Set(ids);
  const gen = mode === 'simple' ? generateSimplePlan : generateVariedPlan;
  let best: MealPlanState | null = null;
  // Favorites and style only bias the picks; they are softened, then dropped, before a day may miss the goals.
  const boosts = favs.size ? [1, 0.4, 0] : [0];
  outer: for (const favBoost of boosts) {
    for (const strength of style === 'mix' ? [1] : [1, 0.5, 0]) {
      const plan = gen({ calories, protein, seed, startDate, diet, style, days, strength, favs: favBoost ? favs : new Set(), favBoost });
      const err = planError(plan);
      if (!best || err < planError(best) - 1e-9) best = plan;
      if (err <= TOLERANCE) break outer;
    }
  }
  return favs.size || favorites ? { ...best!, favorites, favoriteIds: ids } : best!;
}

/** Favorite meals that made it into the plan, most planned first. */
export function plannedFavorites(plan: Pick<MealPlanState, 'days' | 'favoriteIds'>): Meal[] {
  const favs = new Set(plan.favoriteIds ?? []);
  const count = new Map<string, number>();
  for (const d of plan.days) for (const m of d.meals) if (favs.has(m.mealId)) count.set(m.mealId, (count.get(m.mealId) ?? 0) + 1);
  return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => findMeal(id)).filter((m): m is Meal => !!m);
}

function generateVariedPlan(opts: Resolved): MealPlanState {
  const { calories, protein, seed, startDate, diet, style, days, strength, favs, favBoost } = opts;
  const rng = makeRng(`${seed}|${diet}|${calories}|${protein}${style === 'mix' ? '' : `|${style}`}${favs.size ? `|fav${favBoost}` : ''}`);
  const ratio = (protein * 4) / Math.max(1, calories);
  const slots = calories >= 2000 ? SLOTS_2 : SLOTS_1;
  const pools: Record<MealType, Meal[]> = {
    breakfast: slotPool('breakfast', diet, favs),
    lunch: slotPool('lunch', diet, favs),
    dinner: slotPool('dinner', diet, favs),
    snacks: slotPool('snacks', diet, favs),
  };
  const uses = new Map<string, number>();
  const seen = new Set<string>();
  const out: PlanDay[] = [];
  let yesterday = new Set<string>();

  for (let d = 0; d < days; d++) {
    let best: { day: PlanDay; score: number } | null = null;
    for (let tr = 0; tr < TRIES; tr++) {
      const chosen: Meal[] = [];
      const mains = new Set<string>();
      let ok = true;
      for (const slot of slots) {
        const pool = pools[slot].filter((m) => {
          if (chosen.includes(m)) return false;
          if ((uses.get(m.id) ?? 0) >= MAX_USES[slot]) return false;
          if (slot !== 'snacks' && (yesterday.has(m.id) || mains.has(m.ingredients[0].key))) return false;
          return true;
        });
        // Relax the weekly cap rather than fail when a pool runs dry (strict diets).
        const from = pool.length ? pool : pools[slot].filter((m) => !chosen.includes(m));
        const m = pickWeighted(rng, from, (x) => weightOf(x, ratio, style, strength, favs, favBoost) / (1 + (uses.get(x.id) ?? 0)));
        if (!m) {
          ok = false;
          break;
        }
        chosen.push(m);
        if (slot !== 'snacks') mains.add(m.ingredients[0].key);
      }
      if (!ok) continue;
      const built = buildDay(chosen, slots, calories, protein);
      if (seen.has(signature(built.day))) continue;
      const repeats = chosen.reduce((a, m) => a + (uses.get(m.id) ?? 0), 0);
      // Accuracy first; then natural portions, fewer repeats, and a pinch of chance.
      const offStyle = style === 'mix' ? 0 : chosen.filter((m) => !fitsStyle(m, style)).length * 0.012 * strength;
      const fav = favBoost * 0.02 * chosen.filter((m) => favs.has(m.id)).length;
      const score = Math.max(0, built.err - 0.03) * 10 + built.err + 0.1 * built.stretch + 0.015 * repeats + offStyle - fav + 0.01 * rng();
      if (!best || score < best.score) best = { day: built.day, score };
    }
    if (!best) break;
    out.push(best.day);
    seen.add(signature(best.day));
    for (const m of best.day.meals) uses.set(m.mealId, (uses.get(m.mealId) ?? 0) + 1);
    yesterday = new Set(best.day.meals.map((m) => m.mealId));
  }

  return { seed, startDate, calories, protein, diet, style, mode: 'varied', days: out, checked: [], createdAt: Date.now() };
}

const SIMPLE_TRIES = 700;

/** Lunch and dinner for day d of a Simple week: A/B lunches against A/B dinners, so four pairings. */
export function simplePairing(d: number): [number, number] {
  return [d % 2, Math.floor(d / 2) % 2];
}

/**
 * A Simple week: one breakfast, two lunches, two dinners and one snack, every
 * day portioned on its own to hit the goals. Few meals means a short shopping
 * list, so sets that share ingredients score a little better.
 */
function generateSimplePlan(opts: Resolved): MealPlanState {
  const { calories, protein, seed, startDate, diet, style, days, strength, favs, favBoost } = opts;
  const rng = makeRng(`${seed}|${diet}|${calories}|${protein}|${style}|simple${favs.size ? `|fav${favBoost}` : ''}`);
  const ratio = (protein * 4) / Math.max(1, calories);
  const slots = SLOTS_1;
  const pool = (slot: MealType) => slotPool(slot, diet, favs);
  const pools = { breakfast: pool('breakfast'), lunch: pool('lunch'), dinner: pool('dinner'), snacks: pool('snacks') };
  const w = (m: Meal) => weightOf(m, ratio, style, strength, favs, favBoost);
  const combos = Math.min(4, days);

  let best: { days: PlanDay[]; score: number } | null = null;
  for (let tr = 0; tr < SIMPLE_TRIES; tr++) {
    const b = pickWeighted(rng, pools.breakfast, w);
    const s = pickWeighted(rng, pools.snacks.filter((m) => m !== b), w);
    const l1 = pickWeighted(rng, pools.lunch.filter((m) => m !== b), w);
    const l2 = pickWeighted(rng, pools.lunch.filter((m) => m !== b && m !== l1 && m.ingredients[0].key !== l1?.ingredients[0].key), w);
    if (!b || !s || !l1 || !l2) continue;
    const lunchMains = new Set([l1, l2].map((m) => m.ingredients[0].key));
    const dinnerPool = pools.dinner.filter((m) => m !== b && m !== l1 && m !== l2 && !lunchMains.has(m.ingredients[0].key));
    const d1 = pickWeighted(rng, dinnerPool, w);
    const d2 = pickWeighted(rng, dinnerPool.filter((m) => m !== d1 && m.ingredients[0].key !== d1?.ingredients[0].key), w);
    if (!d1 || !d2) continue;
    const lunches = [l1, l2];
    const dinners = [d1, d2];
    let err = 0;
    let stretch = 0;
    const built: PlanDay[] = [];
    for (let c = 0; c < combos; c++) {
      const [li, di] = simplePairing(c);
      const r = buildDay([b, lunches[li], dinners[di], s], slots, calories, protein);
      err = Math.max(err, r.err);
      stretch += r.stretch / combos;
      built.push(r.day);
    }
    const buys = new Set([b, s, l1, l2, d1, d2].flatMap((m) => m.ingredients.map((i) => buyInfo(i.key).id))).size;
    const offStyle = style === 'mix' ? 0 : [b, s, l1, l2, d1, d2].filter((m) => !fitsStyle(m, style)).length * 0.012 * strength;
    const fav = favBoost * 0.03 * [b, s, l1, l2, d1, d2].filter((m) => favs.has(m.id)).length;
    const score = Math.max(0, err - 0.03) * 10 + err + 0.1 * stretch + 0.004 * buys + offStyle - fav + 0.01 * rng();
    if (!best || score < best.score) best = { days: built, score };
  }
  const out = best ? Array.from({ length: days }, (_, d) => best.days[d % combos]) : [];
  return { seed, startDate, calories, protein, diet, style, mode: 'simple', days: out, checked: [], createdAt: Date.now() };
}

/**
 * Other meals for one slot of a day, each with the whole day re-portioned so
 * it still hits the goals. Best fits first; meals already in the week last.
 */
export function swapOptions(plan: MealPlanState, dayIndex: number, mealIndex: number, n = 4): PlanDay[] {
  const day = plan.days[dayIndex];
  const target = day?.meals[mealIndex];
  if (!target) return [];
  const slots = day.meals.map((m) => m.slot);
  const current = day.meals.map((m) => findMeal(m.mealId)).filter((m): m is Meal => !!m);
  if (current.length !== day.meals.length) return [];
  const others = new Set(day.meals.filter((_, i) => i !== mealIndex).map((m) => m.mealId));
  const otherMains = new Set(
    current.filter((m, i) => i !== mealIndex && slots[i] !== 'snacks').map((m) => m.ingredients[0].key),
  );
  const weekUses = new Map<string, number>();
  for (const d of plan.days) for (const m of d.meals) weekUses.set(m.mealId, (weekUses.get(m.mealId) ?? 0) + 1);
  const seen = new Set(plan.days.filter((_, i) => i !== dayIndex).map(signature));

  const results: { day: PlanDay; score: number }[] = [];
  const favs = new Set(plan.favoriteIds ?? []);
  for (const cand of slotPool(target.slot, plan.diet, favs)) {
    if (cand.id === target.mealId || others.has(cand.id)) continue;
    if (target.slot !== 'snacks' && otherMains.has(cand.ingredients[0].key)) continue;
    const meals = current.map((m, i) => (i === mealIndex ? cand : m));
    const built = buildDay(meals, slots, plan.calories, plan.protein);
    if (built.err > TOLERANCE || seen.has(signature(built.day))) continue;
    const jitter = (hashSeed(`${plan.seed}|${dayIndex}|${cand.id}`) % 1000) / 1000;
    const fit = (fitsStyle(cand, plan.style) ? -0.03 : 0) + (favs.has(cand.id) ? -0.03 : 0);
    results.push({ day: built.day, score: built.err + 0.1 * built.stretch + 0.03 * (weekUses.get(cand.id) ?? 0) + (cand.cuisine === 'us' ? 0.02 : 0) + 0.02 * jitter + fit });
  }
  return results.sort((a, b) => a.score - b.score).slice(0, n).map((r) => r.day);
}

/**
 * Puts a chosen swap into the plan. In a Simple plan the new meal also
 * replaces the old one on every other day it was planned, as long as that
 * day stays on target, so the week keeps its few meals.
 */
export function applySwap(plan: MealPlanState, dayIndex: number, mealIndex: number, chosen: PlanDay): MealPlanState {
  const old = plan.days[dayIndex]?.meals[mealIndex];
  const next = chosen.meals[mealIndex];
  const days = plan.days.map((d, i) => (i === dayIndex ? chosen : d));
  if (plan.mode !== 'simple' || !old || !next) return { ...plan, days };
  const cand = findMeal(next.mealId);
  if (!cand) return { ...plan, days };
  return {
    ...plan,
    days: days.map((d, i) => {
      if (i === dayIndex) return d;
      const at = d.meals.findIndex((m) => m.slot === old.slot && m.mealId === old.mealId);
      if (at < 0 || d.meals.some((m) => m.mealId === cand.id)) return d;
      const meals = d.meals.map((m, j) => (j === at ? cand : findMeal(m.mealId)));
      if (meals.some((m) => !m)) return d;
      const built = buildDay(meals as Meal[], d.meals.map((m) => m.slot), plan.calories, plan.protein);
      return built.err <= TOLERANCE ? built.day : d;
    }),
  };
}

/** Distinct library meals in a plan. */
export function distinctMeals(plan: Pick<MealPlanState, 'days'>): number {
  return new Set(plan.days.flatMap((d) => d.meals.map((m) => m.mealId))).size;
}

// ---------- logging ----------

/** A planned meal as a loggable Food, portion as planned. */
export function plannedMealFood(pm: PlannedMeal): Food {
  const meal = findMeal(pm.mealId);
  const grams = pm.items.reduce((a, i) => a + i.grams, 0);
  const n = itemsNutrients(pm.items);
  const r1 = (x: number | undefined) => Math.round((x ?? 0) * 10) / 10;
  return {
    id: `plan:${pm.mealId}:${grams}`,
    name: meal?.name ?? 'Planned meal',
    source: 'builtin',
    nutrients: { calories: Math.round(n.calories), protein: r1(n.protein), carbs: r1(n.carbs), fat: r1(n.fat), fiber: r1(n.fiber), sugar: r1(n.sugar), sodium: Math.round(n.sodium ?? 0) },
    servings: [
      { label: `1 portion (${grams} g)`, factor: 1 },
      { label: '100 g', factor: 100 / grams },
      { label: '1 g', factor: 1 / grams },
    ],
    components: pm.items.map((i) => {
      const x = itemsNutrients([i]);
      return { name: INGREDIENTS[i.key]?.name ?? i.key, grams: i.grams, calories: Math.round(x.calories), protein: r1(x.protein), carbs: r1(x.carbs), fat: r1(x.fat) };
    }),
    note: 'From your meal plan. Computed from USDA FoodData Central / BLS reference values for the ingredients.',
  };
}

/** "2 eggs" or "150 g" for an ingredient amount in a meal. */
export function amountText(key: string, grams: number): string {
  const piece = PIECE[key];
  if (key === 'egg' && piece) {
    const c = Math.round(grams / piece.g);
    return `${c} ${c === 1 ? piece.one : piece.many}`;
  }
  return `${grams} g`;
}

// ---------- shopping list ----------

export type Aisle = 'produce' | 'dairy' | 'meat' | 'bakery' | 'frozen' | 'pantry';

export const AISLES: { key: Aisle; label: string; icon: string }[] = [
  { key: 'produce', label: 'Fruit & vegetables', icon: 'leaf-outline' },
  { key: 'dairy', label: 'Dairy & eggs', icon: 'egg-outline' },
  { key: 'meat', label: 'Meat & fish', icon: 'fish-outline' },
  { key: 'bakery', label: 'Bakery', icon: 'storefront-outline' },
  { key: 'frozen', label: 'Frozen', icon: 'snow-outline' },
  { key: 'pantry', label: 'Pantry', icon: 'basket-outline' },
];

type Unit = 'g' | 'ml';
interface Buy {
  /** Shopping list id; several cooked/raw ingredients can share one. */
  id: string;
  /** Grams bought per gram eaten (cooked rice → dry rice ≈ 0.36). */
  factor: number;
  name?: string;
  nameDe?: string;
  aisle: Aisle;
  unit?: Unit;
  /** Usually already at home (oil, soy sauce, honey). */
  staple?: boolean;
}

const A = (aisle: Aisle, extra: Partial<Buy> = {}): Partial<Buy> & { aisle: Aisle } => ({ aisle, ...extra });

const BUY: Record<string, Partial<Buy> & { aisle: Aisle }> = {
  // Dairy & eggs
  skyr: A('dairy'), quark: A('dairy'), greekYogurt: A('dairy'), yogurt: A('dairy'), cottage: A('dairy'),
  milk: A('dairy', { unit: 'ml' }), soyMilk: A('dairy', { unit: 'ml' }), egg: A('dairy'), eggWhite: A('dairy', { unit: 'ml' }),
  feta: A('dairy'), mozzarella: A('dairy'), parmesan: A('dairy'), gouda: A('dairy'), cheddar: A('dairy'), emmentaler: A('dairy'),
  harzer: A('dairy'), creamCheese: A('dairy'), creamCheeseLight: A('dairy'), butter: A('dairy'), cream: A('dairy', { unit: 'ml' }),
  cookingCream: A('dairy', { unit: 'ml' }), sourCream: A('dairy'), cremeFraiche: A('dairy'), tzatziki: A('dairy'), tofu: A('dairy'),
  hummus: A('dairy'), spaetzle: A('dairy'), gnocchi: A('dairy'), maultaschen: A('dairy'), falafel: A('dairy'),
  // Meat & fish: cooked weights become raw weights
  chickenBreast: A('meat', { id: 'chickenBreastRaw', factor: 1.35 }),
  chickenBreastRaw: A('meat', { id: 'chickenBreastRaw', name: 'Chicken breast', nameDe: 'Hähnchenbrustfilet' }),
  chickenThigh: A('meat', { factor: 1.35, name: 'Chicken thighs', nameDe: 'Hähnchenschenkel' }),
  turkeyBreast: A('meat', { factor: 1.35, name: 'Turkey breast', nameDe: 'Putenbrust' }),
  turkeyGround: A('meat', { factor: 1.3, name: 'Ground turkey', nameDe: 'Putenhack' }),
  turkeyDeli: A('meat'),
  beefLean: A('meat', { factor: 1.3, name: 'Lean ground beef', nameDe: 'Tatar / mageres Rinderhack' }),
  beefGround: A('meat', { id: 'beefGroundRaw', factor: 1.3 }),
  beefGroundRaw: A('meat', { id: 'beefGroundRaw', name: 'Ground beef', nameDe: 'Rinderhack' }),
  beefSteak: A('meat', { factor: 1.35, name: 'Beef steak', nameDe: 'Rindersteak' }),
  beefChuck: A('meat', { factor: 1.5, name: 'Stewing beef', nameDe: 'Rindergulasch' }),
  porkLoin: A('meat', { factor: 1.3, name: 'Pork loin', nameDe: 'Schweinelende' }),
  ham: A('meat'), bacon: A('meat', { factor: 1.6, name: 'Bacon', nameDe: 'Bacon / Frühstücksspeck' }), pepperoni: A('meat'),
  bratwurst: A('meat'), wiener: A('meat'), leberkaese: A('meat'), doner: A('frozen'),
  salmon: A('meat', { factor: 1.25, name: 'Salmon fillet', nameDe: 'Lachsfilet' }),
  salmonRaw: A('meat'), smokedSalmon: A('meat'), shrimp: A('frozen', { name: 'Shrimp, cooked', nameDe: 'Garnelen, gegart' }),
  whiteFish: A('frozen', { factor: 1.25, name: 'Pollock or cod fillet', nameDe: 'Seelachs- oder Kabeljaufilet' }),
  fishSticks: A('frozen', { name: 'Fish sticks', nameDe: 'Fischstäbchen' }), tuna: A('pantry', { name: 'Tuna in water (drained)', nameDe: 'Thunfisch naturell (abgetropft)' }),
  // Pantry: cooked grains and legumes become dry weights
  oats: A('pantry'), muesli: A('pantry'), granola: A('pantry'), whey: A('pantry'), chia: A('pantry'),
  rice: A('pantry', { id: 'riceDry', factor: 0.36 }), riceDry: A('pantry', { id: 'riceDry', name: 'Rice', nameDe: 'Reis' }),
  pasta: A('pantry', { id: 'pastaDry', factor: 0.4 }), pastaDry: A('pantry', { id: 'pastaDry', name: 'Pasta', nameDe: 'Nudeln' }),
  wholePasta: A('pantry', { factor: 0.42, name: 'Whole-wheat pasta', nameDe: 'Vollkornnudeln' }),
  riceNoodles: A('pantry', { factor: 0.4, name: 'Rice noodles', nameDe: 'Reisnudeln' }),
  quinoa: A('pantry', { factor: 0.37, name: 'Quinoa', nameDe: 'Quinoa' }),
  couscous: A('pantry', { factor: 0.4, name: 'Couscous', nameDe: 'Couscous' }),
  lentils: A('pantry', { id: 'lentilsDry', factor: 0.4 }), lentilsDry: A('pantry', { id: 'lentilsDry', name: 'Lentils', nameDe: 'Linsen' }),
  splitPeas: A('pantry', { factor: 0.45, name: 'Split peas', nameDe: 'Schälerbsen' }),
  chickpeas: A('pantry', { name: 'Chickpeas, canned (drained)', nameDe: 'Kichererbsen (Dose, abgetropft)' }),
  blackBeans: A('pantry', { name: 'Black beans, canned (drained)', nameDe: 'Schwarze Bohnen (Dose, abgetropft)' }),
  kidneyBeans: A('pantry', { name: 'Kidney beans, canned (drained)', nameDe: 'Kidneybohnen (Dose, abgetropft)' }),
  peanutButter: A('pantry'), peanuts: A('pantry'), almonds: A('pantry'), walnuts: A('pantry'), tahini: A('pantry'), proteinBar: A('pantry'),
  riceCakes: A('pantry'), knaecke: A('pantry'), tortilla: A('bakery'), pita: A('bakery'), pizzaDough: A('dairy'),
  corn: A('pantry'), olives: A('pantry'), passata: A('pantry'), salsa: A('pantry'), coconutLight: A('pantry', { unit: 'ml' }),
  sauerkraut: A('pantry'), raisins: A('pantry'), appleSauce: A('pantry'), darkChocolate: A('pantry'), pesto: A('pantry'),
  potatoes: A('produce', { name: 'Potatoes', nameDe: 'Kartoffeln' }), sweetPotato: A('produce', { name: 'Sweet potatoes', nameDe: 'Süßkartoffeln' }),
  cherries: A('pantry', { name: 'Sour cherries (jar)', nameDe: 'Sauerkirschen (Glas)' }), greens: A('produce', { name: 'Salad greens', nameDe: 'Blattsalat' }),
  broth: A('pantry', { unit: 'ml', staple: true }), oil: A('pantry', { staple: true }), mayo: A('pantry', { staple: true }),
  caesarDressing: A('pantry'), soy: A('pantry', { unit: 'ml', staple: true }), ketchup: A('pantry', { staple: true }),
  curryKetchup: A('pantry', { staple: true }), mustard: A('pantry', { staple: true }), honey: A('pantry', { staple: true }),
  maple: A('pantry', { staple: true }), jam: A('pantry', { staple: true }), sugar: A('pantry', { staple: true }),
  flour: A('pantry', { staple: true }), breadcrumbs: A('pantry', { staple: true }),
  // Bakery
  vollkornbrot: A('bakery'), wwBread: A('bakery'), toast: A('bakery'), roll: A('bakery'), pretzel: A('bakery'),
  bagel: A('bakery'), croissant: A('bakery'),
  // Frozen
  berries: A('frozen'), edamame: A('frozen'), peas: A('frozen'), stirFryVeg: A('frozen'), mixedVeg: A('frozen'), iceCream: A('frozen'),
  fries: A('frozen'), potatoPancakes: A('frozen'),
};

/** How an ingredient is bought (defaults: itself, 1:1, grams, pantry). */
export function buyInfo(key: string): Buy {
  const b = BUY[key];
  const produce = INGREDIENTS[key] && !b ? 'produce' : undefined;
  return { id: b?.id ?? key, factor: b?.factor ?? 1, name: b?.name, nameDe: b?.nameDe, aisle: b?.aisle ?? (produce as Aisle) ?? 'pantry', unit: b?.unit, staple: b?.staple };
}

export interface ShoppingItem {
  id: string;
  name: string;
  nameDe: string;
  aisle: Aisle;
  /** Total to buy, in grams (or ml for liquids). */
  amount: number;
  unit: Unit;
  staple: boolean;
}

export interface ShoppingSection {
  aisle: Aisle;
  label: string;
  icon: string;
  items: ShoppingItem[];
}

/** Everything the plan needs for the week, summed by ingredient and grouped by aisle. */
export function shoppingList(plan: Pick<MealPlanState, 'days'>): ShoppingSection[] {
  const byId = new Map<string, ShoppingItem>();
  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const it of meal.items) {
        const b = buyInfo(it.key);
        const ing = INGREDIENTS[b.id] ?? INGREDIENTS[it.key];
        // Cooked and raw forms share one line, named after what you buy.
        const target = b.id !== it.key ? buyInfo(b.id) : b;
        const cur = byId.get(b.id) ?? {
          id: b.id,
          name: target.name ?? b.name ?? ing?.name ?? it.key,
          nameDe: target.nameDe ?? b.nameDe ?? ing?.nameDe ?? '',
          aisle: b.aisle,
          amount: 0,
          unit: b.unit ?? 'g',
          staple: !!b.staple,
        };
        cur.amount += it.grams * b.factor;
        byId.set(b.id, cur);
      }
    }
  }
  const items = [...byId.values()].map((x) => ({ ...x, amount: Math.round(x.amount) }));
  return AISLES.map((a) => ({
    aisle: a.key,
    label: a.label,
    icon: a.icon,
    items: items
      .filter((x) => x.aisle === a.key)
      .sort((x, y) => Number(x.staple) - Number(y.staple) || y.amount - x.amount),
  })).filter((s) => s.items.length);
}

/** "1.4 kg", "750 ml", "6 eggs (300 g)". */
export function shoppingAmount(item: ShoppingItem): string {
  const piece = PIECE[item.id];
  const u = item.unit;
  const round = (n: number) => (n >= 100 ? Math.ceil(n / 10) * 10 : Math.max(5, Math.ceil(n / 5) * 5));
  const base =
    item.amount >= 1000
      ? `${(Math.ceil(item.amount / 100) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 })} ${u === 'ml' ? 'l' : 'kg'}`
      : `${round(item.amount)} ${u}`;
  if (piece) {
    const c = Math.max(1, Math.ceil(item.amount / piece.g - 0.15));
    return `${c} ${c === 1 ? piece.one : piece.many} · ${base}`;
  }
  return base;
}
