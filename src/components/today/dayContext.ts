import type { MealType, Nutrients } from '@/lib/types';
import { MEAL_SHARES } from '@/lib/nutrition';

/** Greeting that follows the clock, including the small hours. */
export function greetingFor(hour: number): string {
  if (hour < 5) return 'Up late';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 22) return 'Good evening';
  return 'Winding down';
}

/** Rough windows for each meal, in hours. Snacks fill the gaps. */
const WINDOWS: { meal: MealType; from: number; to: number; label: string }[] = [
  { meal: 'breakfast', from: 5, to: 11, label: 'Breakfast' },
  { meal: 'lunch', from: 11, to: 15, label: 'Lunch' },
  { meal: 'dinner', from: 17, to: 22, label: 'Dinner' },
];

export interface MealHint {
  meal: MealType;
  text: string;
}

/**
 * A one-line nudge for what to eat next: the meal whose window we're in (or
 * the next one) if it hasn't been logged, with the calories that fit.
 */
export function nextMealHint({ hour, logged, remaining, goal }: { hour: number; logged: Set<MealType>; remaining: number; goal: number }): MealHint | null {
  if (remaining <= 0) return { meal: 'snacks', text: 'Budget reached. Water and a walk from here.' };
  const current = WINDOWS.find((w) => hour >= w.from && hour < w.to && !logged.has(w.meal));
  const upcoming = current ?? WINDOWS.find((w) => w.from > hour && !logged.has(w.meal));
  if (upcoming) {
    const fits = Math.round(Math.min(remaining, goal * MEAL_SHARES[upcoming.meal] * 1.1) / 10) * 10;
    const when = current ? `${upcoming.label} time` : `${upcoming.label} next`;
    return { meal: upcoming.meal, text: `${when}, about ${fits.toLocaleString('en-US')} kcal fits` };
  }
  if (hour >= 22 || hour < 5) return { meal: 'snacks', text: `${Math.round(remaining).toLocaleString('en-US')} kcal left. Fine to leave it.` };
  const snack = Math.round(Math.min(remaining, goal * MEAL_SHARES.snacks * 1.5) / 10) * 10;
  return { meal: 'snacks', text: `Room for a snack, up to ${snack.toLocaleString('en-US')} kcal` };
}

/** A daily water target: about 35 ml per kg, kept between 2 and 3.5 litres. */
export function waterGoalMl(weightKg: number): number {
  const ml = Math.round((weightKg * 35) / 250) * 250;
  return Math.max(2000, Math.min(3500, ml || 2000));
}

/** Share of eaten calories that came from protein, carbs and fat (sums to 1, or all 0). */
export function macroSplit(n: Nutrients): { protein: number; carbs: number; fat: number } {
  const p = Math.max(0, n.protein) * 4;
  const c = Math.max(0, n.carbs) * 4;
  const f = Math.max(0, n.fat) * 9;
  const sum = p + c + f;
  if (sum <= 0) return { protein: 0, carbs: 0, fat: 0 };
  return { protein: p / sum, carbs: c / sum, fat: f / sum };
}

/** German labels list salt, not sodium: salt (g) = sodium (mg) × 2.5 / 1000. */
export const sodiumToSaltG = (mg: number) => (mg * 2.5) / 1000;
