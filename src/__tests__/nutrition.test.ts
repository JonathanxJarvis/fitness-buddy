import { describe, expect, it } from '@jest/globals';
import { bmr, calculateGoals, healthScore, itemNutrients, mealItemsToLog, sumItems, exerciseCalories } from '@/lib/nutrition';
import { fdcToFood } from '@/lib/usda';
import { estimateToFood, parseEstimate } from '@/lib/ai';
import { extractGtin, productToFood, nutrientsPer100g } from '@/lib/openFoodFacts';
import { BUILTIN_FOODS, searchLocal } from '@/lib/foodDatabase';
import { currentStreak, longestStreak, monthGrid, addDays, parseTime } from '@/lib/dates';
import { kgToLb, lbToKg, formatHeight, formatWater } from '@/lib/units';
import { buildNudges } from '@/lib/tips';
import { reducer, initialState, recentFoods } from '@/store/reducer';
import type { DiaryEntry, Food, Profile, SavedMeal } from '@/lib/types';

const profile: Profile = { sex: 'male', age: 30, heightCm: 180, weightKg: 80, activity: 'moderate', goal: 'lose', weeklyRateKg: 0.5 };

const apple = BUILTIN_FOODS.find((f) => f.name === 'Apple')!;
const entry = (over: Partial<DiaryEntry> = {}): DiaryEntry => ({
  id: 'e1',
  date: '2026-09-28',
  meal: 'breakfast',
  food: apple,
  servingIndex: 0,
  quantity: 1,
  createdAt: 1,
  ...over,
});

describe('goals', () => {
  it('computes Mifflin-St Jeor BMR', () => {
    expect(bmr(profile)).toBeCloseTo(10 * 80 + 6.25 * 180 - 5 * 30 + 5);
  });

  it('builds a deficit for weight loss and keeps macros consistent', () => {
    const g = calculateGoals(profile);
    const maintenance = bmr(profile) * 1.55;
    expect(g.calories).toBeLessThan(maintenance);
    expect(Math.abs(maintenance - 550 - g.calories)).toBeLessThan(20);
    const macroCals = g.protein * 4 + g.carbs * 4 + g.fat * 9;
    expect(Math.abs(macroCals - g.calories)).toBeLessThan(15);
    expect(g.protein).toBe(176); // 1 g per lb at 80 kg
    expect(g).not.toHaveProperty('waterMl');
  });

  it('never goes below the safety floor', () => {
    const g = calculateGoals({ ...profile, sex: 'female', weightKg: 45, heightCm: 150, age: 60, activity: 'sedentary', weeklyRateKg: 1 });
    expect(g.calories).toBe(1200);
  });
});

describe('nutrient math', () => {
  it('scales by serving and quantity', () => {
    const n = itemNutrients({ food: apple, servingIndex: 0, quantity: 2 });
    expect(n.calories).toBeCloseTo(190);
    const per100 = itemNutrients({ food: apple, servingIndex: 1, quantity: 1 });
    expect(per100.calories).toBeCloseTo((95 / 182) * 100);
  });

  it('logs a recipe as one portion and a meal as its items', () => {
    const items = [{ food: apple, servingIndex: 0, quantity: 4 }];
    const recipe: SavedMeal = { id: 'r', name: 'Apple sauce', items, servings: 4, isRecipe: true, createdAt: 0 };
    const logged = mealItemsToLog(recipe);
    expect(logged).toHaveLength(1);
    expect(sumItems(logged).calories).toBeCloseTo(95);
    expect(mealItemsToLog({ ...recipe, isRecipe: false })).toBe(items);
  });

  it('estimates exercise calories from MET', () => {
    expect(exerciseCalories(8, 75, 30)).toBe(300);
  });
});

describe('Open Food Facts mapping', () => {
  it('uses the package serving as the base and converts minerals', () => {
    const food = productToFood({
      code: '123',
      product_name: 'Granola Bar',
      brands: 'Acme, Other',
      serving_quantity: 40,
      serving_size: '1 bar (40 g)',
      nutriments: { 'energy-kcal_100g': 450, proteins_100g: 10, carbohydrates_100g: 60, fat_100g: 20, sodium_100g: 0.3, 'vitamin-d_100g': 0.000002 },
    })!;
    expect(food.brand).toBe('Acme');
    expect(food.servings[0].label).toBe('serving (1 bar (40 g))');
    expect(food.nutrients.calories).toBeCloseTo(180);
    expect(food.nutrients.sodium).toBeCloseTo(120);
    expect(food.nutrients.vitaminD).toBeCloseTo(0.8);
    expect(itemNutrients({ food, servingIndex: 1, quantity: 1 }).calories).toBeCloseTo(450);
  });

  it('falls back to kJ and salt', () => {
    const n = nutrientsPer100g({ energy_100g: 418.4, salt_100g: 1 })!;
    expect(n.calories).toBeCloseTo(100);
    expect(n.sodium).toBeCloseTo(400);
  });

  it('uses German names for the German region', () => {
    const p = { code: '4001', product_name: 'Skyr Natur', product_name_en: 'Plain skyr', product_name_de: 'Skyr Natur', nutriments: { 'energy-kcal_100g': 63, proteins_100g: 11, carbohydrates_100g: 4, fat_100g: 0.2 } };
    expect(productToFood(p, 'de')!.name).toBe('Skyr Natur');
    expect(productToFood(p, 'us')!.name).toBe('Plain skyr');
  });

  it('reads product numbers from barcodes and GS1 QR codes', () => {
    expect(extractGtin('4006040002513')).toBe('4006040002513');
    expect(extractGtin('https://id.gs1.org/01/04006040002513/10/ABC123')).toBe('4006040002513');
    expect(extractGtin('https://brand.example/01/04006040002513?17=261231')).toBe('4006040002513');
    expect(extractGtin('(01)04006040002513(17)261231')).toBe('4006040002513');
    expect(extractGtin('0104006040002513172612311')).toBe('4006040002513');
    expect(extractGtin('https://example.com/menu')).toBeNull();
  });

  it('rejects products without nutrition', () => {
    expect(productToFood({ product_name: 'Mystery' })).toBeNull();
  });
});

describe('search', () => {
  it('matches all words, prefix first', () => {
    const r = searchLocal(BUILTIN_FOODS, 'chicken');
    expect(r[0].name.toLowerCase().startsWith('chicken')).toBe(true);
    expect(searchLocal(BUILTIN_FOODS, 'greek yog')[0].name).toMatch(/Greek yogurt/);
  });
});

describe('dates and streaks', () => {
  it('counts a streak that continues from yesterday', () => {
    const today = '2026-09-28';
    const days = new Set([addDays(today, -1), addDays(today, -2), addDays(today, -4)]);
    expect(currentStreak(days, today)).toBe(2);
    days.add(today);
    expect(currentStreak(days, today)).toBe(3);
    expect(longestStreak(days)).toBe(3);
  });

  it('builds a padded month grid', () => {
    const cells = monthGrid(2026, 8); // September 2026 starts on a Tuesday
    expect(cells.slice(0, 3)).toEqual([null, null, '2026-09-01']);
    expect(cells.length % 7).toBe(0);
  });

  it('parses clock times', () => {
    expect(parseTime('18:30')).toEqual({ hour: 18, minute: 30 });
    expect(parseTime('25:00')).toBeNull();
  });
});

describe('units', () => {
  it('converts round trip', () => {
    expect(lbToKg(kgToLb(70))).toBeCloseTo(70);
    expect(formatHeight(172.72, 'us')).toBe('5′ 8″');
    expect(formatWater(2000, 'us')).toBe('68 fl oz');
  });
});

describe('nudges', () => {
  const goals = calculateGoals(profile);
  it('flags low protein in the afternoon', () => {
    const nudges = buildNudges({ totals: { calories: 800, protein: 10, carbs: 120, fat: 20 }, goals, waterMl: 2000, entries: [entry()], hour: 15, streak: 0, steps: 0 });
    expect(nudges.map((n) => n.id)).toContain('protein-low');
  });
  it('flags missing water and high sodium', () => {
    const nudges = buildNudges({ totals: { calories: 800, protein: 170, carbs: 50, fat: 20, sodium: 3000 }, goals, waterMl: 0, entries: [entry()], hour: 16, streak: 7, steps: 0 });
    const ids = nudges.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['water-none', 'sodium-high', 'streak']));
  });
  it('stays quiet early in the morning', () => {
    expect(buildNudges({ totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, goals, waterMl: 0, entries: [], hour: 7, streak: 0, steps: 0 })).toEqual([]);
  });
});

describe('reducer', () => {
  it('tracks favorites, recents and weight', () => {
    let s = reducer(initialState, { type: 'setProfile', profile, goals: calculateGoals(profile), date: '2026-09-01' });
    s = reducer(s, { type: 'addEntries', entries: [entry({ id: 'a', createdAt: 1 }), entry({ id: 'b', createdAt: 2, food: { ...apple, id: 'x', name: 'X' } as Food })] });
    expect(recentFoods(s.entries).map((f) => f.id)).toEqual(['x', apple.id]);
    s = reducer(s, { type: 'toggleFavorite', food: apple });
    expect(s.favorites).toHaveLength(1);
    s = reducer(s, { type: 'toggleFavorite', food: apple });
    expect(s.favorites).toHaveLength(0);
    s = reducer(s, { type: 'setWeight', date: '2026-09-20', kg: 78 });
    expect(s.profile!.weightKg).toBe(78);
    s = reducer(s, { type: 'setWeight', date: '2026-09-10', kg: 79 }); // older entry doesn't change current weight
    expect(s.profile!.weightKg).toBe(78);
    s = reducer(s, { type: 'deleteWeight', date: '2026-09-20' });
    expect(s.profile!.weightKg).toBe(79);
  });

  it('moves protein to 1 g per lb for data saved before the redesign', () => {
    const old = { ...initialState, profile, goals: { ...calculateGoals(profile), protein: 144 } } as Partial<typeof initialState>;
    delete old.chat;
    const s = reducer(initialState, { type: 'hydrate', state: old as never });
    expect(s.goals!.protein).toBe(176);
    expect(s.goals!.calories).toBe(calculateGoals(profile).calories);
    expect(s.chat).toEqual([]);
  });

  it('keeps a bounded chat history', () => {
    let s = initialState;
    for (let i = 0; i < 90; i++) s = reducer(s, { type: 'addChat', message: { id: String(i), role: 'user', text: 'hi', createdAt: i } });
    expect(s.chat).toHaveLength(80);
    expect(s.chat[0].id).toBe('10');
  });

  it('merges saved settings with new defaults on load', () => {
    const s = reducer(initialState, { type: 'hydrate', state: { ...initialState, settings: { units: 'metric' } } as never });
    expect(s.settings.units).toBe('metric');
    expect(s.settings.reminders.mealTimes.lunch).toBe('12:30');
  });
});

describe('USDA mapping', () => {
  it('uses the household serving as the base and keeps per-100 g options', () => {
    const food = fdcToFood({
      fdcId: 42,
      description: 'GREEK YOGURT, PLAIN',
      dataType: 'Branded',
      brandOwner: 'ACME DAIRY',
      servingSize: 170,
      servingSizeUnit: 'g',
      householdServingFullText: '1 CONTAINER',
      foodNutrients: [
        { nutrientId: 1008, value: 59 },
        { nutrientId: 1003, value: 10 },
        { nutrientId: 1005, value: 3.6 },
        { nutrientId: 1004, value: 0.4 },
        { nutrientId: 1093, value: 36 },
      ],
    })!;
    expect(food.name).toBe('Greek yogurt, plain');
    expect(food.brand).toBe('Acme dairy');
    expect(food.servings[0].label).toBe('1 container (170 g)');
    expect(food.nutrients.calories).toBeCloseTo(100.3);
    expect(itemNutrients({ food, servingIndex: 1, quantity: 1 }).protein).toBeCloseTo(10);
    expect(itemNutrients({ food, servingIndex: 1, quantity: 1 }).sodium).toBeCloseTo(36);
  });

  it('skips foods without energy', () => {
    expect(fdcToFood({ fdcId: 1, description: 'Water', foodNutrients: [{ nutrientId: 1003, value: 0 }] })).toBeNull();
  });
});

describe('health score and AI estimates', () => {
  it('rates lean protein above candy', () => {
    const chicken = healthScore({ calories: 165, protein: 31, carbs: 0, fat: 3.6, sodium: 74, sugar: 0, fiber: 0 })!;
    const candy = healthScore({ calories: 400, protein: 2, carbs: 95, fat: 2, sugar: 80, sodium: 50, fiber: 0 })!;
    expect(chicken.score).toBeGreaterThan(candy.score);
    expect(chicken.highlights.map((h) => h.text)).toContain('High in protein');
    expect(candy.highlights.map((h) => h.text)).toContain('High in sugar');
    expect(healthScore({ calories: 0, protein: 0, carbs: 0, fat: 0 })).toBeNull();
  });

  it('sums AI items into a plate-sized food', () => {
    const est = parseEstimate({
      is_food: true,
      meal_name: 'Steak and salad',
      items: [
        { name: 'Sirloin steak', grams: 180.4, calories: 380.2, protein_g: 48.26, carbs_g: 0, fat_g: 20.1 },
        { name: 'Side salad', grams: 120, calories: 140, protein_g: 2, carbs_g: 8, fat_g: 11 },
      ],
      fiber_g: 3,
      sugar_g: 4,
      sodium_mg: 520,
      confidence: 'medium',
      notes: 'Assumed olive-oil dressing.',
    });
    expect(est.totals.calories).toBe(520);
    expect(est.totals.protein).toBeCloseTo(50.3);
    expect(est.items[0].grams).toBe(180);
    const food = estimateToFood(est, 'x');
    expect(food.source).toBe('ai');
    expect(itemNutrients({ food, servingIndex: 1, quantity: 1 }).calories).toBe(260);
  });
});
