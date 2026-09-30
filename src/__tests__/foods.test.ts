import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { GERMAN_FOODS } from '@/lib/germanFoods';
import { BUILTIN_FOODS, searchLocal } from '@/lib/foodDatabase';
import { amountInGrams, gramServingIndex } from '@/lib/portion';
import { itemNutrients } from '@/lib/nutrition';
import { searchFoods } from '@/lib/openFoodFacts';

describe('German staples', () => {
  it('have energy that matches their macros (within 15%)', () => {
    for (const f of GERMAN_FOODS) {
      const n = f.nutrients;
      const fromMacros = n.protein * 4 + n.carbs * 4 + n.fat * 9 + (n.fiber ?? 0) * 2;
      // Drinks with alcohol get energy from ethanol, which the macros don't cover.
      if (/Bier|Pils/.test(f.name) || n.calories < 5) continue;
      expect(Math.abs(fromMacros - n.calories) / n.calories).toBeLessThan(0.15);
    }
  });

  it('are found by German search terms', () => {
    expect(searchLocal(GERMAN_FOODS, 'quark').map((f) => f.name)).toContain('Magerquark');
    expect(searchLocal(GERMAN_FOODS, 'hahnchen')[0].name).toMatch(/Hähnchen/);
  });
});

describe('portion in grams', () => {
  const quark = GERMAN_FOODS.find((f) => f.name === 'Magerquark')!;

  it('converts servings to grams and back', () => {
    const g = gramServingIndex(quark);
    expect(g).toBeGreaterThan(0);
    expect(amountInGrams(quark, 0, 1)).toBeCloseTo(250);
    expect(amountInGrams(quark, g, 175)).toBeCloseTo(175);
    // 175 g of 67 kcal/100 g quark
    expect(itemNutrients({ food: quark, servingIndex: g, quantity: 175 }).calories).toBeCloseTo(117.25);
  });

  it('works for every built-in food', () => {
    for (const f of [...BUILTIN_FOODS, ...GERMAN_FOODS]) expect(gramServingIndex(f)).toBeGreaterThanOrEqual(0);
  });
});

describe('Open Food Facts search', () => {
  const product = { code: '4000000000001', product_name_de: 'Skyr Natur', brands: 'Testmarke', nutriments: { 'energy-kcal_100g': 63, proteins_100g: 11, carbohydrates_100g: 4, fat_100g: 0.2 } };
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the search service and filters to Germany', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ hits: [product] })));
    const foods = await searchFoods('skyr', undefined, 'de');
    expect(foods[0].name).toBe('Skyr Natur');
    const url = decodeURIComponent(String(fetchMock.mock.calls[0][0]));
    expect(url).toContain('search.openfoodfacts.org');
    expect(url).toContain('countries_tags:"en:germany"');
  });

  it('falls back to the classic endpoint when the search service fails', async () => {
    const fetchMock = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('busy', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ products: [product] })));
    const foods = await searchFoods('quark natur', undefined, 'de');
    expect(foods).toHaveLength(1);
    expect(String(fetchMock.mock.calls[1][0])).toContain('de.openfoodfacts.org/cgi/search.pl');
  });
});
