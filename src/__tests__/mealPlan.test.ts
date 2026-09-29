import { describe, expect, it } from '@jest/globals';
import { INGREDIENTS, findMeal } from '@/lib/meals';
import {
  applySwap,
  buyInfo,
  dayError,
  dayTotals,
  distinctMeals,
  fitsDiet,
  fitsStyle,
  favoriteMealIds,
  generateMealPlan,
  matchFavorites,
  planError,
  plannedFavorites,
  splitFavorites,
  PLAN_STYLES,
  plannedMealFood,
  shoppingAmount,
  shoppingList,
  swapOptions,
  TOLERANCE,
  type MealDiet,
  type PlanStyle,
} from '@/lib/mealPlan';

const GOALS: { calories: number; protein: number; diet?: MealDiet }[] = [
  { calories: 2800, protein: 180 },
  { calories: 2200, protein: 150 },
  { calories: 1800, protein: 130 },
  { calories: 1500, protein: 110 },
  { calories: 3300, protein: 190 },
  { calories: 2200, protein: 140, diet: 'vegetarian' },
  { calories: 2000, protein: 130, diet: 'pescatarian' },
  { calories: 2400, protein: 150, diet: 'no-pork' },
];

const plan = (g: (typeof GOALS)[number], seed = 'test') => generateMealPlan({ ...g, seed, startDate: '2026-09-28' });

describe('meal plan generator', () => {
  it.each(GOALS)('hits %o within ±5 % every day', (g) => {
    for (const seed of ['a', 'b', 'c']) {
      const p = plan(g, seed);
      expect(p.days).toHaveLength(7);
      for (const day of p.days) {
        const t = dayTotals(day);
        expect(Math.abs(t.calories / g.calories - 1)).toBeLessThanOrEqual(TOLERANCE);
        expect(Math.abs(t.protein / g.protein - 1)).toBeLessThanOrEqual(TOLERANCE);
      }
    }
  });

  it('builds breakfast, lunch, dinner and one or two snacks with gram portions', () => {
    for (const g of [GOALS[0], GOALS[3]]) {
      for (const day of plan(g).days) {
        const slots = day.meals.map((m) => m.slot);
        expect(slots.slice(0, 3)).toEqual(['breakfast', 'lunch', 'dinner']);
        const snacks = slots.filter((s) => s === 'snacks').length;
        expect(snacks).toBeGreaterThanOrEqual(1);
        expect(snacks).toBeLessThanOrEqual(2);
        for (const m of day.meals) {
          expect(findMeal(m.mealId)!.meals).toContain(m.slot);
          for (const it of m.items) {
            expect(Number.isInteger(it.grams)).toBe(true);
            expect(it.grams).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('varies the week: no identical days, limited repeats, lunch and dinner differ', () => {
    const p = plan(GOALS[0]);
    const sigs = p.days.map((d) => d.meals.map((m) => m.mealId).sort().join());
    expect(new Set(sigs).size).toBe(7);
    const uses = new Map<string, number>();
    for (const d of p.days) {
      const ids = d.meals.map((m) => m.mealId);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) uses.set(id, (uses.get(id) ?? 0) + 1);
    }
    expect(Math.max(...uses.values())).toBeLessThanOrEqual(3);
    expect(uses.size).toBeGreaterThanOrEqual(20);
  });

  it('is deterministic per seed and changes with a new seed', () => {
    const a = plan(GOALS[1], 'seed-1');
    const b = plan(GOALS[1], 'seed-1');
    const c = plan(GOALS[1], 'seed-2');
    expect(b.days).toEqual(a.days);
    expect(c.days).not.toEqual(a.days);
  });

  it('respects the diet', () => {
    for (const diet of ['vegetarian', 'pescatarian', 'no-pork', 'vegan'] as MealDiet[]) {
      const p = generateMealPlan({ calories: 2200, protein: diet === 'vegan' ? 100 : 140, diet, seed: 'd', startDate: '2026-09-28' });
      for (const d of p.days) for (const m of d.meals) expect(fitsDiet(findMeal(m.mealId)!, diet)).toBe(true);
      if (diet === 'vegetarian') for (const d of p.days) for (const m of d.meals) for (const i of m.items) expect(INGREDIENTS[i.key].diet).not.toBe('m');
    }
  });

  it('swaps one meal and keeps the day in range', () => {
    const p = plan(GOALS[0]);
    const opts = swapOptions(p, 2, 1);
    expect(opts.length).toBeGreaterThan(0);
    for (const day of opts) {
      expect(day.meals[1].mealId).not.toBe(p.days[2].meals[1].mealId);
      expect(day.meals[1].slot).toBe('lunch');
      expect(dayError(day, p.calories, p.protein)).toBeLessThanOrEqual(TOLERANCE);
    }
  });

  it('turns a planned meal into a loggable food with the planned portion', () => {
    const pm = plan(GOALS[0]).days[0].meals[1];
    const food = plannedMealFood(pm);
    const t = dayTotals({ meals: [pm] });
    expect(food.nutrients.calories).toBe(Math.round(t.calories));
    expect(food.servings[0].factor).toBe(1);
    expect(food.components).toHaveLength(pm.items.length);
  });
});

describe('shopping list', () => {
  it('sums every planned ingredient into the right line', () => {
    const p = plan(GOALS[0]);
    const expected = new Map<string, number>();
    for (const d of p.days)
      for (const m of d.meals)
        for (const it of m.items) {
          const b = buyInfo(it.key);
          expected.set(b.id, (expected.get(b.id) ?? 0) + it.grams * b.factor);
        }
    const list = shoppingList(p);
    const items = list.flatMap((s) => s.items);
    expect(items).toHaveLength(expected.size);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const it of items) expect(it.amount).toBe(Math.round(expected.get(it.id)!));
  });

  it('merges cooked and raw forms and buys dry grains and raw meat', () => {
    const p = {
      days: [
        { meals: [{ slot: 'lunch' as const, mealId: 'x', scale: 1, items: [{ key: 'rice', grams: 200 }, { key: 'riceDry', grams: 60 }, { key: 'chickenBreast', grams: 150 }, { key: 'egg', grams: 150 }] }] },
      ],
    };
    const items = shoppingList(p).flatMap((s) => s.items);
    const rice = items.find((i) => i.id === 'riceDry')!;
    expect(rice.amount).toBe(Math.round(200 * 0.36 + 60));
    expect(rice.name).toBe('Rice');
    expect(rice.aisle).toBe('pantry');
    const chicken = items.find((i) => i.id === 'chickenBreastRaw')!;
    expect(chicken.amount).toBeGreaterThan(150);
    expect(chicken.aisle).toBe('meat');
    const eggs = items.find((i) => i.id === 'egg')!;
    expect(eggs.aisle).toBe('dairy');
    expect(shoppingAmount(eggs)).toMatch(/^3 eggs/);
  });

  it('groups by aisle in store order with staples last', () => {
    const list = shoppingList(plan(GOALS[1]));
    const order = ['produce', 'dairy', 'meat', 'bakery', 'frozen', 'pantry'];
    const idx = list.map((s) => order.indexOf(s.aisle));
    expect(idx).toEqual([...idx].sort((a, b) => a - b));
    for (const s of list) {
      const staples = s.items.map((i) => i.staple);
      expect(staples).toEqual([...staples].sort((a, b) => Number(a) - Number(b)));
    }
    expect(shoppingAmount({ id: 'milk', name: 'Milk', nameDe: '', aisle: 'dairy', amount: 1450, unit: 'ml', staple: false })).toBe('1.5 l');
  });
});

describe('simple plans', () => {
  const simple = (g: (typeof GOALS)[number], seed = 'test', style: PlanStyle = 'mix') =>
    generateMealPlan({ ...g, style, mode: 'simple', seed, startDate: '2026-09-28' });

  it.each(GOALS)('uses at most 6 meals and hits %o within ±5 % every day', (g) => {
    for (const seed of ['a', 'b']) {
      const p = simple(g, seed);
      expect(p.mode).toBe('simple');
      expect(p.days).toHaveLength(7);
      expect(distinctMeals(p)).toBeLessThanOrEqual(6);
      expect(planError(p)).toBeLessThanOrEqual(TOLERANCE);
      const bySlot = (slot: string) => new Set(p.days.flatMap((d) => d.meals.filter((m) => m.slot === slot).map((m) => m.mealId)));
      expect(bySlot('breakfast').size).toBe(1);
      expect(bySlot('lunch').size).toBeLessThanOrEqual(2);
      expect(bySlot('dinner').size).toBeLessThanOrEqual(2);
      expect(bySlot('snacks').size).toBe(1);
      for (const d of p.days) for (const m of d.meals) expect(fitsDiet(findMeal(m.mealId)!, g.diet ?? 'any')).toBe(true);
    }
  });

  it('has a much shorter shopping list than a varied week', () => {
    for (const g of [GOALS[0], GOALS[2], GOALS[5]]) {
      const short = shoppingList(simple(g)).flatMap((s) => s.items).length;
      const long = shoppingList(plan(g)).flatMap((s) => s.items).length;
      expect(short).toBeLessThanOrEqual(long * 0.5);
    }
  });

  it('swaps a meal on every day it is planned and keeps those days on target', () => {
    const p = simple(GOALS[1]);
    const old = p.days[0].meals[0].mealId;
    const opts = swapOptions(p, 0, 0);
    expect(opts.length).toBeGreaterThan(0);
    const next = applySwap(p, 0, 0, opts[0]);
    const chosen = opts[0].meals[0].mealId;
    expect(next.days.every((d) => d.meals[0].mealId !== old)).toBe(true);
    expect(next.days.filter((d) => d.meals[0].mealId === chosen).length).toBeGreaterThan(1);
    expect(planError(next)).toBeLessThanOrEqual(TOLERANCE);
  });

  it('only changes the chosen day in a varied or older saved plan', () => {
    const p = plan(GOALS[0]);
    const legacy = { ...p, style: undefined, mode: undefined };
    const opt = swapOptions(legacy, 1, 1)[0];
    const next = applySwap(legacy, 1, 1, opt);
    expect(next.days[1]).toBe(opt);
    next.days.forEach((d, i) => i !== 1 && expect(d).toBe(p.days[i]));
  });
});

describe('plan styles', () => {
  it.each(PLAN_STYLES.map((s) => s.key))('%s stays within ±5 % in both modes', (style) => {
    for (const g of [GOALS[0], GOALS[3], GOALS[4], GOALS[7]]) {
      for (const mode of ['simple', 'varied'] as const) {
        const p = generateMealPlan({ ...g, style, mode, seed: 's', startDate: '2026-09-28' });
        expect(p.style).toBe(style);
        expect(planError(p)).toBeLessThanOrEqual(TOLERANCE);
      }
    }
  });

  it('leans the week toward the chosen style', () => {
    const meals = (style: PlanStyle) =>
      generateMealPlan({ ...GOALS[1], style, seed: 'lean', startDate: '2026-09-28' }).days.flatMap((d) => d.meals.map((m) => findMeal(m.mealId)!));
    const mix = meals('mix');
    const share = (list: typeof mix, style: PlanStyle) => list.filter((m) => fitsStyle(m, style)).length / list.length;
    for (const style of ['mediterranean', 'german'] as PlanStyle[]) {
      expect(share(meals(style), style)).toBeGreaterThan(share(mix, style) + 0.15);
    }
    expect(share(meals('high-protein'), 'high-protein')).toBeGreaterThan(share(mix, 'high-protein'));
    const prep = (list: typeof mix) => list.reduce((a, m) => a + m.prepMinutes, 0) / list.length;
    expect(prep(meals('quick'))).toBeLessThan(prep(mix) - 3);
  });

  it('includes well-known dishes, with nutrients computed from ingredients', () => {
    for (const id of ['overnight-oats', 'shakshuka', 'chicken-burrito-bowl', 'spaghetti-bolognese', 'chili-con-carne', 'chicken-caesar-salad', 'quark-berries', 'kaesespaetzle-light', 'linsen-spaetzle', 'salade-nicoise']) {
      const m = findMeal(id);
      expect(m).toBeDefined();
      const kcal = m!.ingredients.reduce((a, i) => a + (INGREDIENTS[i.key].per100.calories * i.grams) / 100, 0);
      expect(m!.nutrients.calories).toBeCloseTo(kcal, 0);
    }
  });
});

describe('favorite meals', () => {
  const ids = (text: string) => favoriteMealIds(text);

  it('splits a free-text list', () => {
    expect(splitFavorites('Pasta, Döner; pancakes\nchicken with rice, ,pasta')).toEqual(['Pasta', 'Döner', 'pancakes', 'chicken with rice', 'pasta']);
  });

  it('matches English and German names, case and accents ignored', () => {
    expect(ids('spaghetti bolognese')).toEqual(['spaghetti-bolognese']);
    expect(ids('SPAGHETTI BOLOGNESE')).toEqual(['spaghetti-bolognese']);
    expect(ids('Döner')).toEqual(expect.arrayContaining(['doner-kebab', 'doner-plate-rice']));
    expect(ids('doener')).toEqual(expect.arrayContaining(['doner-kebab']));
    expect(ids('Käsespätzle')).toContain('kaesespaetzle');
    expect(ids('Currywurst')).toEqual(expect.arrayContaining(['currywurst-fries', 'currywurst-roll']));
  });

  it('knows simple synonyms and plurals', () => {
    const [nudeln] = matchFavorites('Nudeln');
    expect(nudeln.mealIds.length).toBeGreaterThan(2);
    for (const id of nudeln.mealIds) expect(findMeal(id)!.ingredients.some((i) => /pasta|spaetzle/i.test(i.key))).toBe(true);
    expect([...ids('Hähnchen mit Reis')].sort()).toEqual([...ids('chicken with rice')].sort());
    expect(ids('chicken with rice')).toContain('chicken-rice-broccoli');
    expect(ids('pancakes')).toEqual(expect.arrayContaining(['protein-pancakes', 'pancakes-syrup']));
    expect(ids('Lachs')).toContain('salmon-rice-bowl');
  });

  it('uses ingredients when no meal is named after the favorite', () => {
    expect(ids('Garnelen')).toEqual(expect.arrayContaining(['shrimp-fried-rice', 'garlic-shrimp-pasta']));
  });

  it('returns nothing for unknown or empty favorites', () => {
    expect(ids('')).toEqual([]);
    expect(ids('xyzzy')).toEqual([]);
    expect(matchFavorites('Pasta, blorp').map((m) => m.mealIds.length > 0)).toEqual([true, false]);
  });

  it('puts favorites in the plan and still hits the goals', () => {
    const favorites = 'Spaghetti bolognese, Döner, chicken burrito bowl';
    for (const g of [GOALS[0], GOALS[1], GOALS[3], GOALS[7]]) {
      for (const mode of ['simple', 'varied'] as const) {
        const base = generateMealPlan({ ...g, mode, seed: 'fav', startDate: '2026-09-28' });
        const p = generateMealPlan({ ...g, mode, favorites, seed: 'fav', startDate: '2026-09-28' });
        expect(p.favorites).toBe(favorites);
        expect(planError(p)).toBeLessThanOrEqual(Math.max(TOLERANCE, planError(base)));
        const favs = new Set(p.favoriteIds);
        const count = (x: typeof p) => x.days.flatMap((d) => d.meals).filter((m) => favs.has(m.mealId)).length;
        expect(plannedFavorites(p).length).toBeGreaterThan(0);
        expect(count(p)).toBeGreaterThan(count(base));
      }
    }
  });

  it('respects the diet even for favorites', () => {
    const p = generateMealPlan({ ...GOALS[5], favorites: 'Döner, spaghetti bolognese', seed: 'veg', startDate: '2026-09-28' });
    for (const d of p.days) for (const m of d.meals) expect(fitsDiet(findMeal(m.mealId)!, 'vegetarian')).toBe(true);
    expect(planError(p)).toBeLessThanOrEqual(TOLERANCE);
  });

  it('keeps AI-matched ids and ignores unknown ones', () => {
    const p = generateMealPlan({ ...GOALS[1], favorites: 'something fancy', favoriteIds: ['shakshuka', 'not-a-meal'], seed: 'ai', startDate: '2026-09-28' });
    expect(p.favoriteIds).toEqual(['shakshuka']);
    expect(p.days.some((d) => d.meals.some((m) => m.mealId === 'shakshuka'))).toBe(true);
  });

  it('leaves plans without favorites unchanged', () => {
    const a = generateMealPlan({ ...GOALS[1], seed: 'same', startDate: '2026-09-28' });
    const b = generateMealPlan({ ...GOALS[1], favorites: '  ', seed: 'same', startDate: '2026-09-28' });
    expect(b.days).toEqual(a.days);
    expect(a.favorites).toBeUndefined();
  });
});
