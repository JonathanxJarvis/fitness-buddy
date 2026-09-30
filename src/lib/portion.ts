import type { Food } from './types';

/** Index of the "1 g" serving, which every food gets so any amount can be weighed. */
export function gramServingIndex(food: Food): number {
  return food.servings.findIndex((s) => s.label === '1 g');
}

/** Grams in the chosen amount, or null when the food has no gram serving. */
export function amountInGrams(food: Food, servingIndex: number, quantity: number): number | null {
  const g = gramServingIndex(food);
  if (g < 0) return null;
  const serving = food.servings[servingIndex] ?? food.servings[0];
  return (serving.factor * quantity) / food.servings[g].factor;
}
