import type {
  ActivityLevel,
  DiaryEntry,
  Food,
  Goals,
  NutrientKey,
  Nutrients,
  Profile,
  SavedMeal,
  SavedMealItem,
  MealType,
} from './types';

export const ACTIVITY_LEVELS: { key: ActivityLevel; label: string; hint: string; factor: number }[] = [
  { key: 'sedentary', label: 'Sedentary', hint: 'Desk job, little exercise', factor: 1.2 },
  { key: 'light', label: 'Lightly active', hint: 'Exercise 1–3 days a week', factor: 1.375 },
  { key: 'moderate', label: 'Moderately active', hint: 'Exercise 3–5 days a week', factor: 1.55 },
  { key: 'active', label: 'Very active', hint: 'Hard exercise 6–7 days a week', factor: 1.725 },
  { key: 'very_active', label: 'Athlete', hint: 'Physical job or twice-daily training', factor: 1.9 },
];

const KCAL_PER_KG = 7700;

/** Mifflin–St Jeor basal metabolic rate. */
export function bmr(p: Pick<Profile, 'sex' | 'age' | 'heightCm' | 'weightKg'>): number {
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return p.sex === 'male' ? base + 5 : base - 161;
}

export function tdee(p: Profile): number {
  const factor = ACTIVITY_LEVELS.find((a) => a.key === p.activity)?.factor ?? 1.2;
  return bmr(p) * factor;
}

function round(n: number, step: number) {
  return Math.round(n / step) * step;
}

/** Daily protein target: 1 g per lb of body weight. */
export function proteinTarget(weightKg: number): number {
  return Math.round(weightKg * 2.20462);
}

export function calculateGoals(p: Profile): Goals {
  const maintenance = tdee(p);
  const dailyDelta = (p.weeklyRateKg * KCAL_PER_KG) / 7;
  let calories = maintenance;
  if (p.goal === 'lose') calories -= dailyDelta;
  if (p.goal === 'gain') calories += dailyDelta;
  const floor = p.sex === 'male' ? 1500 : 1200;
  calories = Math.max(floor, round(calories, 10));

  // 1 g of protein per lb of body weight, the common target for building or keeping muscle.
  const protein = proteinTarget(p.weightKg);
  const fat = Math.round((calories * (p.goal === 'lose' ? 0.25 : 0.28)) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));

  const female = p.sex === 'female';
  return {
    calories,
    protein,
    carbs,
    fat,
    fiber: Math.round((calories / 1000) * 14),
    sugar: Math.round((calories * 0.1) / 4),
    sodium: 2300,
    potassium: female ? 2600 : 3400,
    calcium: (female && p.age > 50) || p.age > 70 ? 1200 : 1000,
    iron: female && p.age <= 50 ? 18 : 8,
    vitaminC: female ? 75 : 90,
    vitaminD: p.age > 70 ? 20 : 15,
    steps: 8000,
  };
}

export const NUTRIENT_KEYS: NutrientKey[] = [
  'calories',
  'protein',
  'carbs',
  'fat',
  'fiber',
  'sugar',
  'sodium',
  'potassium',
  'calcium',
  'iron',
  'vitaminC',
  'vitaminD',
];

export const NUTRIENT_INFO: Record<NutrientKey, { label: string; unit: string; limit?: boolean }> = {
  calories: { label: 'Calories', unit: 'kcal' },
  protein: { label: 'Protein', unit: 'g' },
  carbs: { label: 'Carbs', unit: 'g' },
  fat: { label: 'Fat', unit: 'g' },
  fiber: { label: 'Fiber', unit: 'g' },
  sugar: { label: 'Sugar', unit: 'g', limit: true },
  sodium: { label: 'Sodium', unit: 'mg', limit: true },
  potassium: { label: 'Potassium', unit: 'mg' },
  calcium: { label: 'Calcium', unit: 'mg' },
  iron: { label: 'Iron', unit: 'mg' },
  vitaminC: { label: 'Vitamin C', unit: 'mg' },
  vitaminD: { label: 'Vitamin D', unit: 'µg' },
};

export function emptyNutrients(): Nutrients {
  return { calories: 0, protein: 0, carbs: 0, fat: 0 };
}

export function scaleNutrients(n: Nutrients, factor: number): Nutrients {
  const out = {} as Nutrients;
  for (const k of NUTRIENT_KEYS) {
    const v = n[k];
    if (v !== undefined) (out as unknown as Record<string, number>)[k] = v * factor;
  }
  return out;
}

export function addNutrients(a: Nutrients, b: Nutrients): Nutrients {
  const out = { ...a };
  for (const k of NUTRIENT_KEYS) {
    const bv = b[k];
    if (bv === undefined) continue;
    out[k] = (a[k] ?? 0) + bv;
  }
  return out;
}

export function itemNutrients(item: { food: Food; servingIndex: number; quantity: number }): Nutrients {
  const serving = item.food.servings[item.servingIndex] ?? item.food.servings[0];
  return scaleNutrients(item.food.nutrients, (serving?.factor ?? 1) * item.quantity);
}

export function sumItems(items: { food: Food; servingIndex: number; quantity: number }[]): Nutrients {
  return items.reduce((acc, it) => addNutrients(acc, itemNutrients(it)), emptyNutrients());
}

export function totalsForDate(entries: DiaryEntry[], date: string): Nutrients {
  return sumItems(entries.filter((e) => e.date === date));
}

export function servingText(item: { food: Food; servingIndex: number; quantity: number }): string {
  const s = item.food.servings[item.servingIndex] ?? item.food.servings[0];
  const qty = Number.isInteger(item.quantity) ? String(item.quantity) : item.quantity.toFixed(2).replace(/0+$/, '');
  return `${qty} × ${s?.label ?? 'serving'}`;
}

/** Turn a recipe into a Food whose base serving is one portion. */
export function recipeToFood(meal: SavedMeal): Food {
  const total = sumItems(meal.items);
  const portions = Math.max(1, meal.servings);
  return {
    id: `recipe:${meal.id}`,
    name: meal.name,
    source: 'recipe',
    nutrients: scaleNutrients(total, 1 / portions),
    servings: [{ label: '1 portion', factor: 1 }],
  };
}

export function mealItemsToLog(meal: SavedMeal): SavedMealItem[] {
  if (meal.isRecipe) return [{ food: recipeToFood(meal), servingIndex: 0, quantity: 1 }];
  return meal.items;
}

/** MET values for common activities, used to estimate burned calories. */
export const EXERCISES: { name: string; met: number; icon: string }[] = [
  { name: 'Walking', met: 3.5, icon: 'walk-outline' },
  { name: 'Running', met: 9.8, icon: 'speedometer-outline' },
  { name: 'Cycling', met: 7.5, icon: 'bicycle-outline' },
  { name: 'Swimming', met: 8, icon: 'water-outline' },
  { name: 'Strength training', met: 5, icon: 'barbell-outline' },
  { name: 'HIIT', met: 8, icon: 'flash-outline' },
  { name: 'Yoga', met: 3, icon: 'body-outline' },
  { name: 'Hiking', met: 6, icon: 'trail-sign-outline' },
  { name: 'Dancing', met: 5.5, icon: 'musical-notes-outline' },
  { name: 'Sports', met: 7, icon: 'football-outline' },
];

export function exerciseCalories(met: number, weightKg: number, minutes: number): number {
  return Math.round(met * weightKg * (minutes / 60));
}

/** Rough calories burned by walking, ~0.04 kcal per step for a 70 kg person. */
export function stepCalories(steps: number, weightKg: number): number {
  return Math.round(steps * 0.04 * (weightKg / 70));
}

/** Share of the daily calorie goal each meal aims for. */
export const MEAL_SHARES: Record<MealType, number> = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snacks: 0.1 };

export interface HealthScore {
  score: number;
  grade: string;
  highlights: { good: boolean; text: string }[];
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * A simple 0–100 quality score for a food or meal, based on protein and fiber
 * density (good) and added sugar, sodium and fat density (bad). It's a nudge,
 * not a medical rating.
 */
export function healthScore(n: Nutrients): HealthScore | null {
  if (!n.calories || n.calories < 5) return null;
  const per100 = n.calories / 100;
  const proteinShare = (n.protein * 4) / n.calories;
  const fatShare = (n.fat * 9) / n.calories;
  const fiberDensity = n.fiber !== undefined ? n.fiber / per100 : null;
  const sugarShare = n.sugar !== undefined ? (n.sugar * 4) / n.calories : null;
  const sodiumDensity = n.sodium !== undefined ? n.sodium / per100 : null;

  let score = 55;
  const highlights: HealthScore['highlights'] = [];

  score += 25 * clamp01(proteinShare / 0.3);
  if (proteinShare >= 0.25) highlights.push({ good: true, text: 'High in protein' });
  if (fiberDensity !== null) {
    score += 12 * clamp01(fiberDensity / 1.5);
    if (fiberDensity >= 1.2) highlights.push({ good: true, text: 'Good source of fiber' });
  }
  if (sugarShare !== null) {
    score -= 25 * clamp01((sugarShare - 0.12) / 0.3);
    if (sugarShare > 0.25) highlights.push({ good: false, text: 'High in sugar' });
  }
  if (sodiumDensity !== null) {
    score -= 15 * clamp01((sodiumDensity - 120) / 200);
    if (sodiumDensity > 220) highlights.push({ good: false, text: 'High in sodium' });
  }
  score -= 12 * clamp01((fatShare - 0.4) / 0.3);
  if (fatShare > 0.55) highlights.push({ good: false, text: 'Mostly fat' });
  if ((n.potassium ?? 0) / per100 > 80 || (n.vitaminC ?? 0) / per100 > 6) {
    score += 5;
    highlights.push({ good: true, text: 'Packed with vitamins & minerals' });
  }

  score = Math.round(Math.max(0, Math.min(100, score)));
  const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 45 ? 'D' : 'E';
  return { score, grade, highlights };
}
