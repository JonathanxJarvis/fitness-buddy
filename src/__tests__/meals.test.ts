import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { INGREDIENTS, MEALS, mealNutrients, mealToFood, searchMeals, suggestMeals } from '@/lib/meals';
import { estimateRecipe, measureToGrams, parseMealDbMeal, searchRecipes, searchUsdaMeals } from '@/lib/mealsOnline';
import { amountInGrams, gramServingIndex } from '@/lib/portion';

describe('meal library', () => {
  it('has a real library of unique meals for every meal time', () => {
    expect(MEALS.length).toBeGreaterThanOrEqual(140);
    expect(new Set(MEALS.map((m) => m.id)).size).toBe(MEALS.length);
    for (const slot of ['breakfast', 'lunch', 'dinner', 'snacks'] as const) expect(MEALS.filter((m) => m.meals.includes(slot)).length).toBeGreaterThanOrEqual(20);
    expect(MEALS.filter((m) => m.tags.includes('treat')).length).toBeGreaterThan(10);
    expect(MEALS.filter((m) => m.cuisine === 'de').length).toBeGreaterThan(40);
  });

  it('has nutrients consistent with their macros (kcal ≈ 4P + 4C + 9F within 15%)', () => {
    for (const m of MEALS) {
      const n = m.nutrients;
      const fromMacros = n.protein * 4 + n.carbs * 4 + n.fat * 9;
      // Include the id so a failure names the meal.
      expect({ id: m.id, ok: Math.abs(fromMacros - n.calories) / n.calories < 0.15 }).toEqual({ id: m.id, ok: true });
      expect(n.calories).toBeGreaterThan(80);
      expect(m.steps.length).toBeGreaterThanOrEqual(1);
      expect(m.steps.length).toBeLessThanOrEqual(3);
    }
  });

  it('computes nutrients from ingredients whose names resolve in the ingredient table', () => {
    for (const m of MEALS) {
      for (const i of m.ingredients) {
        const ing = INGREDIENTS[i.key];
        expect(ing).toBeDefined();
        expect(i.name).toBe(ing.name);
        expect(i.nameDe).toBe(ing.nameDe);
        expect(i.grams).toBeGreaterThan(0);
      }
      expect(mealNutrients(m)).toEqual(m.nutrients);
      expect(m.grams).toBe(m.ingredients.reduce((s, i) => s + i.grams, 0));
    }
    const quark = MEALS.find((m) => m.id === 'quark-berries')!;
    // 250 g Magerquark (67 kcal/100 g) + 125 g berries (45) + 10 g honey (304)
    expect(quark.nutrients.calories).toBeCloseTo(167.5 + 56.25 + 30.4, 0);
  });

  it('derives diet tags from ingredients', () => {
    const lentil = MEALS.find((m) => m.id === 'lentil-soup')!;
    expect(lentil.tags).toEqual(expect.arrayContaining(['vegan', 'vegetarian']));
    expect(MEALS.find((m) => m.id === 'chicken-rice-broccoli')!.tags).toContain('high-protein');
    expect(MEALS.find((m) => m.id === 'currywurst-fries')!.tags).toContain('treat');
    expect(MEALS.find((m) => m.id === 'currywurst-fries')!.tags).not.toContain('vegetarian');
  });
});

describe('suggestMeals', () => {
  it('never exceeds the calories left and fits the meal time', () => {
    for (const kcalLeft of [450, 600, 900]) {
      const picks = suggestMeals({ meal: 'dinner', kcalLeft, proteinLeft: 40, region: 'us', n: 3, seed: '2026-09-28' });
      expect(picks).toHaveLength(3);
      for (const m of picks) {
        expect(m.nutrients.calories).toBeLessThanOrEqual(kcalLeft);
        expect(m.meals).toContain('dinner');
      }
    }
    // With only 250 kcal left, dinner turns into something light that still fits.
    for (const m of suggestMeals({ meal: 'dinner', kcalLeft: 250, proteinLeft: 40, region: 'us', n: 3 })) expect(m.nutrients.calories).toBeLessThanOrEqual(250);
  });

  it('prefers protein-dense meals when a lot of protein is left', () => {
    const avg = (ms: { nutrients: { protein: number; calories: number } }[]) => ms.reduce((s, m) => s + m.nutrients.protein / m.nutrients.calories, 0) / ms.length;
    const hungry = suggestMeals({ meal: 'lunch', kcalLeft: 800, proteinLeft: 120, region: 'us', n: 3, seed: 'x' });
    const done = suggestMeals({ meal: 'lunch', kcalLeft: 800, proteinLeft: 0, region: 'us', n: 3, seed: 'x' });
    expect(avg(hungry)).toBeGreaterThan(avg(done));
    expect(hungry.every((m) => m.nutrients.protein >= 30)).toBe(true);
  });

  it('honors tags and exclude, prefers the region, and varies by day', () => {
    const vegan = suggestMeals({ kcalLeft: 700, proteinLeft: 30, region: 'de', n: 3, tags: ['vegan'] });
    expect(vegan.every((m) => m.tags.includes('vegan'))).toBe(true);
    const first = suggestMeals({ meal: 'lunch', kcalLeft: 800, proteinLeft: 60, region: 'de', n: 3, seed: '2026-09-28' });
    const next = suggestMeals({ meal: 'lunch', kcalLeft: 800, proteinLeft: 60, region: 'de', n: 3, seed: '2026-09-28', exclude: first.map((m) => m.id) });
    expect(next.some((m) => first.includes(m))).toBe(false);
    const days = new Set<string>();
    for (let d = 1; d <= 14; d++) days.add(suggestMeals({ meal: 'dinner', kcalLeft: 900, proteinLeft: 60, region: 'de', n: 3, seed: `2026-10-${String(d).padStart(2, '0')}` }).map((m) => m.id).join());
    expect(days.size).toBeGreaterThan(3);
    // Treats only show up when asked for.
    expect(first.some((m) => m.tags.includes('treat'))).toBe(false);
    expect(suggestMeals({ kcalLeft: 1200, proteinLeft: 0, region: 'de', tags: ['treat'] }).every((m) => m.tags.includes('treat'))).toBe(true);
  });

  it('still suggests something tiny when almost nothing is left', () => {
    const picks = suggestMeals({ meal: 'snacks', kcalLeft: 50, proteinLeft: 20, region: 'de', n: 2 });
    expect(picks.length).toBe(2);
    expect(picks[0].nutrients.calories).toBeLessThan(200);
  });
});

describe('searchMeals', () => {
  it('finds meals by German and English names, ignoring umlauts and case', () => {
    expect(searchMeals('döner', 'de')[0].nameDe).toMatch(/Döner/);
    expect(searchMeals('doener', 'de')[0].nameDe).toMatch(/Döner/);
    expect(searchMeals('Linsensuppe', 'de')[0].id).toBe('lentil-soup');
    expect(searchMeals('lentil soup', 'us')[0].id).toBe('lentil-soup');
    expect(searchMeals('lasagne', 'us')[0].id).toBe('lasagna');
    expect(searchMeals('overnight oats', 'us')[0].id).toBe('overnight-oats');
    expect(searchMeals('hähnchen reis', 'de').map((m) => m.id)).toContain('chicken-rice-broccoli');
  });

  it('matches ingredients and returns nothing for gibberish', () => {
    expect(searchMeals('magerquark', 'de').length).toBeGreaterThan(2);
    expect(searchMeals('skyr', 'us').every((m) => m.ingredients.some((i) => i.key === 'skyr'))).toBe(true);
    expect(searchMeals('xyzzy', 'us')).toEqual([]);
    expect(searchMeals('  ', 'us')).toEqual([]);
  });
});

describe('mealToFood', () => {
  it('logs a meal as one serving with gram servings, named for the region', () => {
    const m = MEALS.find((x) => x.id === 'chicken-rice-broccoli')!;
    const de = mealToFood(m, 'de');
    expect(de.name).toBe('Hähnchen mit Reis und Brokkoli');
    expect(de.source).toBe('builtin');
    expect(de.nutrients.calories).toBe(m.nutrients.calories);
    expect(de.servings[0].factor).toBe(1);
    expect(de.servings.map((s) => s.label)).toContain('100 g');
    expect(amountInGrams(de, 0, 1)).toBeCloseTo(m.grams);
    expect(gramServingIndex(de)).toBeGreaterThan(0);
    expect(de.components?.length).toBe(m.ingredients.length);
    expect(mealToFood(m, 'us').name).toBe('Chicken with rice and broccoli');
  });
});

// ---------- online ----------

const okJson = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);

describe('online meal lookups', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });

  it('searches USDA FNDDS prepared dishes and uses their household portions', async () => {
    const fetchMock = jest.fn((_url: string) =>
      okJson({
        foods: [
          {
            fdcId: 2708,
            description: 'Lasagna with meat',
            dataType: 'Survey (FNDDS)',
            foodNutrients: [
              { nutrientId: 1008, value: 165 },
              { nutrientId: 1003, value: 9.4 },
              { nutrientId: 1005, value: 15.2 },
              { nutrientId: 1004, value: 7.2 },
              { nutrientId: 1093, value: 390 },
            ],
            foodMeasures: [
              { disseminationText: 'Quantity not specified', gramWeight: 250, rank: 2 },
              { disseminationText: '1 piece', gramWeight: 220, rank: 1 },
            ],
          },
          { fdcId: 1, description: 'NO NUTRIENTS', foodNutrients: [] },
        ],
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    const foods = await searchUsdaMeals('lasagna');
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain(encodeURIComponent('Survey (FNDDS)'));
    expect(url).not.toContain('Branded');
    expect(foods).toHaveLength(1);
    const f = foods[0];
    expect(f.source).toBe('usda');
    expect(f.servings[0].label).toBe('1 piece (220 g)');
    expect(f.nutrients.calories).toBeCloseTo(165 * 2.2);
    expect(f.servings.find((s) => s.label === '100 g')!.factor).toBeCloseTo(100 / 220);
    expect(gramServingIndex(f)).toBeGreaterThan(0);
  });

  it('fails gracefully when USDA or TheMealDB is unreachable', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    await expect(searchUsdaMeals('lasagna')).resolves.toEqual([]);
    await expect(searchRecipes('lasagna')).resolves.toEqual([]);
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 429, json: () => Promise.resolve({}) } as Response)) as unknown as typeof fetch;
    await expect(searchUsdaMeals('lasagna')).resolves.toEqual([]);
    global.fetch = jest.fn(() => okJson({ meals: null })) as unknown as typeof fetch;
    await expect(searchRecipes('nothing')).resolves.toEqual([]);
  });

  it('times out slow requests', async () => {
    global.fetch = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_res, rej) => init?.signal?.addEventListener('abort', () => rej(new Error('aborted')))),
    ) as unknown as typeof fetch;
    await expect(searchUsdaMeals('lasagna', { timeoutMs: 20 })).resolves.toEqual([]);
  });

  it('parses TheMealDB recipes and estimates nutrients from matched ingredients', async () => {
    global.fetch = jest.fn(() =>
      okJson({
        meals: [
          {
            idMeal: '52772',
            strMeal: 'Teriyaki Chicken Casserole',
            strCategory: 'Chicken',
            strArea: 'Japanese',
            strInstructions: 'Preheat oven to 350.',
            strMealThumb: 'https://www.themealdb.com/images/media/meals/wvpsxx1468256321.jpg',
            strSource: '',
            strYoutube: 'https://www.youtube.com/watch?v=4aZr5hZXP_s',
            strIngredient1: 'soy sauce',
            strMeasure1: '3/4 cup',
            strIngredient2: 'water',
            strMeasure2: '1/2 cup',
            strIngredient3: 'brown sugar',
            strMeasure3: '1/4 cup',
            strIngredient4: 'chicken breasts',
            strMeasure4: '2',
            strIngredient5: 'rice',
            strMeasure5: '200g',
            strIngredient6: 'black pepper',
            strMeasure6: '1 pinch',
            strIngredient7: 'dragonfruit essence',
            strMeasure7: '1 drop',
            strIngredient8: '',
            strMeasure8: '',
            strIngredient9: null,
          },
        ],
      }),
    ) as unknown as typeof fetch;
    const [r] = await searchRecipes('teriyaki');
    expect(r.name).toBe('Teriyaki Chicken Casserole');
    expect(r.area).toBe('Japanese');
    expect(r.thumbnail).toContain('themealdb.com');
    expect(r.sourceUrl).toBe('https://www.themealdb.com/meal/52772');
    expect(r.ingredients.map((i) => i.name)).toEqual(['soy sauce', 'water', 'brown sugar', 'chicken breasts', 'rice', 'black pepper', 'dragonfruit essence']);
    const est = r.nutrition!;
    expect(est.estimate).toBe(true);
    expect(est.matched).toEqual(expect.arrayContaining(['soy sauce', 'brown sugar', 'chicken breasts', 'rice']));
    expect(est.unmatched).toEqual(['dragonfruit essence']);
    // 2 chicken breasts ≈ 340 g raw (≈ 76 g protein) + 200 g dry rice (≈ 14 g) + soy sauce
    expect(est.total.protein).toBeGreaterThan(90);
    expect(est.total.protein).toBeLessThan(120);
    expect(est.perServing.calories).toBeCloseTo(est.total.calories / est.servings, 0);
  });

  it('reads common measures', () => {
    expect(measureToGrams('200g')).toBe(200);
    expect(measureToGrams('1 lb')).toBeCloseTo(453.6);
    expect(measureToGrams('2 tbsp', [/oil/, 'oil', undefined, 0.92])).toBeCloseTo(27.6);
    expect(measureToGrams('1 1/2 cups', [/milk/, 'milk', undefined, 1])).toBeCloseTo(360);
    expect(measureToGrams('3', [/egg/, 'egg', 50])).toBe(150);
    expect(measureToGrams('pinch', [/x/, 'sugar'])).toBe(0);
    expect(estimateRecipe([{ name: 'unobtainium', measure: '1' }])).toBeNull();
    expect(parseMealDbMeal({ idMeal: '1', strMeal: 'Water' }).nutrition).toBeNull();
  });
});
