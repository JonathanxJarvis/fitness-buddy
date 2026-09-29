import { describe, expect, it } from '@jest/globals';
import { packPortions, parseAmount } from '@/lib/packPortions';
import { productToFood } from '@/lib/openFoodFacts';
import { itemNutrients } from '@/lib/nutrition';

describe('parseAmount', () => {
  it('reads multipacks', () => {
    expect(parseAmount('6 x 25 g')).toEqual({ count: 6, each: 25, total: 150, measure: 'g' });
    expect(parseAmount('6x25g')).toEqual({ count: 6, each: 25, total: 150, measure: 'g' });
    expect(parseAmount('150 g (6 × 25 g)')).toEqual({ count: 6, each: 25, total: 150, measure: 'g' });
    expect(parseAmount('4 Stück à 125 g')).toEqual({ count: 4, each: 125, total: 500, measure: 'g' });
  });

  it('reads single amounts in German and English formats', () => {
    expect(parseAmount('150g')).toEqual({ count: 1, each: 150, total: 150, measure: 'g' });
    expect(parseAmount('0,33 l')!.total).toBeCloseTo(330);
    expect(parseAmount('0,33 l')!.measure).toBe('ml');
    expect(parseAmount('330 ml')).toEqual({ count: 1, each: 330, total: 330, measure: 'ml' });
    expect(parseAmount('1 kg')!.total).toBe(1000);
    expect(parseAmount('1 Riegel (25 g)')!.total).toBe(25);
  });

  it('reads piece counts without weight', () => {
    expect(parseAmount('4 Stück')).toEqual({ count: 4, measure: 'g' });
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('Packung')).toBeNull();
  });
});

describe('packPortions', () => {
  it('offers one bar and the whole pack for a Corny multipack', () => {
    const p = packPortions({ name: 'Corny Schoko', categories: ['en:snacks', 'en:cereal-bars'], servingSize: '25 g', servingQuantity: 25, quantity: '6 x 25 g', productQuantity: 150 });
    expect(p.unit).toEqual({ name: 'bar', grams: 25, label: '1 bar (25 g)' });
    expect(p.pack).toEqual({ grams: 150, label: 'Whole pack (150 g)' });
  });

  it('uses the multipack unit when there is no serving size', () => {
    const p = packPortions({ name: 'Kinder Riegel', quantity: '10x21g' });
    expect(p.unit?.label).toBe('1 bar (21 g)');
    expect(p.pack?.label).toBe('Whole pack (210 g)');
  });

  it('splits a piece count over the pack weight', () => {
    const p = packPortions({ name: 'Müller Milchreis Klassik', quantity: '4 Stück', productQuantity: 800 });
    expect(p.unit?.label).toBe('1 cup (200 g)');
    expect(p.pack?.label).toBe('Whole pack (800 g)');
  });

  it('names cans and cups when the serving is the whole pack', () => {
    const can = packPortions({ name: 'Red Bull Energy Drink', categories: ['en:energy-drinks'], servingSize: '250 ml', servingQuantity: 250, quantity: '250 ml' });
    expect(can.unit?.label).toBe('1 can (250 ml)');
    expect(can.pack).toBeUndefined();
    const pudding = packPortions({ name: 'High Protein Pudding Schoko', servingSize: '200 g', quantity: '200 g' });
    expect(pudding.unit?.label).toBe('1 cup (200 g)');
  });

  it('picks a single drink even without a serving size', () => {
    expect(packPortions({ name: 'Cola Dose', quantity: '0,33 l' }).unit?.label).toBe('1 can (330 ml)');
  });

  it('keeps a part of a bigger pack as "1 serving"', () => {
    const choc = packPortions({ name: 'Alpenmilch Schokolade', categories: ['en:chocolate-bars'], servingSize: '25 g', quantity: '100 g' });
    expect(choc.unit?.label).toBe('1 serving (25 g)');
    expect(choc.pack?.label).toBe('Whole pack (100 g)');
    const oat = packPortions({ name: 'Oatly Haferdrink', servingSize: '250 ml', quantity: '1 l' });
    expect(oat.unit?.label).toBe('1 serving (250 ml)');
    expect(oat.pack?.label).toBe('Whole pack (1 l)');
  });

  it('trusts the serving label wording', () => {
    expect(packPortions({ name: 'Toast', servingSize: '1 Scheibe (25 g)', quantity: '500 g' }).unit?.label).toBe('1 slice (25 g)');
  });

  it('opens loose products in grams', () => {
    const p = packPortions({ name: 'Haferflocken', quantity: '500 g' });
    expect(p.unit).toBeUndefined();
    expect(p.pack?.label).toBe('Whole pack (500 g)');
  });
});

describe('scanned product portions', () => {
  it('starts a Corny multipack on one bar', () => {
    const food = productToFood(
      {
        product_name: 'Corny Schoko',
        categories_tags: ['en:cereal-bars'],
        serving_size: '25 g',
        serving_quantity: '25',
        quantity: '6 x 25 g',
        product_quantity: '150',
        nutriments: { 'energy-kcal_100g': 440, proteins_100g: 6, carbohydrates_100g: 64, fat_100g: 17 },
      },
      'de',
    )!;
    expect(food.servings.map((s) => s.label)).toEqual(['1 bar (25 g)', '100 g', 'Whole pack (150 g)', '1 oz', '1 g']);
    expect(food.nutrients.calories).toBeCloseTo(110);
    expect(itemNutrients({ food, servingIndex: 2, quantity: 1 }).calories).toBeCloseTo(660);
  });

  it('rebuilds per-100 g values from per-serving nutrition', () => {
    const food = productToFood({ product_name: 'Bar', serving_quantity: 50, nutriments: { 'energy-kcal_serving': 200, proteins_serving: 10 } })!;
    expect(food.nutrients.calories).toBeCloseTo(200);
    expect(itemNutrients({ food, servingIndex: 1, quantity: 1 }).protein).toBeCloseTo(20);
  });
});
