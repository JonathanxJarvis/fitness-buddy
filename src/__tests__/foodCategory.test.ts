import { describe, expect, it } from '@jest/globals';
import { foodCategory } from '@/components/today/foodCategory';
import { BUILTIN_FOODS } from '@/lib/foodDatabase';
import { GERMAN_FOODS } from '@/lib/germanFoods';

const cat = (name: string) => foodCategory({ name });

describe('foodCategory', () => {
  it('maps German staples', () => {
    expect(cat('Vollkornbrot')).toBe('bread');
    expect(cat('Gouda (jung)')).toBe('cheese');
    expect(cat('Hähnchenbrustfilet (roh)')).toBe('chicken');
    expect(cat('Apfel')).toBe('apple');
    expect(cat('Naturjoghurt 3,5 %')).toBe('yogurt');
    expect(cat('Ei (Größe M)')).toBe('egg');
    expect(cat('Laugenbrezel')).toBe('pastry');
    expect(cat('Rinderhackfleisch (roh)')).toBe('meat');
    expect(cat('Lachsfilet (roh)')).toBe('fish');
    expect(cat('Haferflocken (zart)')).toBe('cereal');
  });

  it('prefers the specific rule over the ingredient inside a compound', () => {
    expect(cat('Apfelsaft')).toBe('juice');
    expect(cat('Apfelstrudel')).toBe('cake');
    expect(cat('Käsekuchen')).toBe('cake');
    expect(cat('Leberkäse')).toBe('sausage');
    expect(cat('Kartoffelchips')).toBe('chips');
    expect(cat('Erdnussbutter')).toBe('nut');
    expect(cat('Buttermilch')).toBe('milk');
    expect(cat('Vollmilchschokolade')).toBe('chocolate');
    expect(cat('Weintrauben')).toBe('grapes');
    expect(cat('Pineapple')).toBe('citrus');
    expect(cat('Watermelon')).toBe('citrus');
    expect(cat('Chocolate chip cookie')).toBe('cookie');
    expect(cat('Spaghetti with meat sauce')).toBe('pasta');
    expect(cat('Champignons')).toBe('greens');
    expect(cat('Cauliflower')).toBe('greens');
    expect(cat('Brötchen (Weizen)')).toBe('bread');
    expect(cat('Reis (gekocht)')).toBe('rice');
    expect(cat('Cola')).toBe('soda');
    expect(cat('Schweineschnitzel (roh)')).toBe('meat');
    expect(cat('Erdbeeren')).toBe('berries');
    expect(cat('Thunfisch im eigenen Saft')).toBe('fish');
    expect(cat('Tuna, canned in water')).toBe('fish');
    expect(cat('Mineralwasser')).toBe('water');
    expect(cat('Alkoholfreies Weizen')).toBe('beer');
    expect(cat('Dark chocolate 70%')).toBe('chocolate');
  });

  it('draws blueberries and other dark berries as blueberries, not a strawberry', () => {
    expect(cat('Heidelbeeren')).toBe('blueberry');
    expect(cat('Heidelbeeren (TK)')).toBe('blueberry');
    expect(cat('Blaubeeren')).toBe('blueberry');
    expect(cat('Blueberries, raw')).toBe('blueberry');
    expect(cat('Brombeeren')).toBe('blueberry');
    expect(cat('Himbeeren')).toBe('berries');
    expect(cat('Erdbeeren')).toBe('berries');
    expect(cat('Rosinen')).toBe('grapes');
    expect(cat('Grapefruit')).toBe('citrus');
  });

  it('falls back to a plate for unknown dishes', () => {
    expect(cat('Grandma’s special')).toBe('dish');
  });

  it('gives every built-in food a specific picture', () => {
    const unmatched = [...BUILTIN_FOODS, ...GERMAN_FOODS].filter((f) => foodCategory(f) === 'dish').map((f) => f.name);
    expect(unmatched).toEqual([]);
  });
});

import { mealSummary, shortFoodName } from '@/components/today/mealSummary';

describe('mealSummary', () => {
  it('shortens names for the one-line meal card', () => {
    expect(shortFoodName('Haferflocken (zart)')).toBe('Haferflocken');
    expect(shortFoodName('Blueberries, raw')).toBe('Blueberries');
    expect(shortFoodName('Skyr')).toBe('Skyr');
  });

  it('lists three foods and folds the rest into a count', () => {
    expect(mealSummary(['Haferflocken (zart)', 'Skyr', 'Heidelbeeren', 'Honig', 'Walnüsse'])).toEqual({ text: 'Haferflocken · Skyr · Heidelbeeren', more: 2 });
    expect(mealSummary(['Skyr'])).toEqual({ text: 'Skyr', more: 0 });
    expect(mealSummary([])).toEqual({ text: '', more: 0 });
  });

  it('drops names that would not fit the line into the count', () => {
    expect(mealSummary(['Haferflocken (zart)', 'Skyr', 'Heidelbeeren', 'Honig'], 3, 20)).toEqual({ text: 'Haferflocken · Skyr', more: 2 });
    expect(mealSummary(['Hähnchenbrustfilet mit Reis und Gemüse', 'Skyr'], 3, 10)).toEqual({ text: 'Hähnchenbrustfilet mit Reis und Gemüse', more: 1 });
  });

  it('counts repeats instead of listing them twice', () => {
    expect(mealSummary(['Ei (Größe M)', 'Ei (Größe M)', 'Toast'])).toEqual({ text: 'Ei ×2 · Toast', more: 0 });
  });
});
