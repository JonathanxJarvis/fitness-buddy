import { describe, expect, it } from '@jest/globals';
import { greetingFor, macroSplit, nextMealHint, sodiumToSaltG, waterGoalMl } from '@/components/today/dayContext';
import type { MealType } from '@/lib/types';

const none = new Set<MealType>();

describe('day context', () => {
  it('greets by the clock', () => {
    expect(greetingFor(3)).toBe('Up late');
    expect(greetingFor(8)).toBe('Good morning');
    expect(greetingFor(13)).toBe('Good afternoon');
    expect(greetingFor(19)).toBe('Good evening');
    expect(greetingFor(23)).toBe('Winding down');
  });

  it('suggests the meal whose window we are in', () => {
    const h = nextMealHint({ hour: 12, logged: new Set<MealType>(['breakfast']), remaining: 1500, goal: 2000 });
    expect(h?.meal).toBe('lunch');
    expect(h?.text).toMatch(/^Lunch time, about 770 kcal fits$/);
  });

  it('looks ahead to the next unlogged meal and caps at what is left', () => {
    const h = nextMealHint({ hour: 15, logged: new Set<MealType>(['breakfast', 'lunch']), remaining: 400, goal: 2000 });
    expect(h?.meal).toBe('dinner');
    expect(h?.text).toContain('400 kcal');
  });

  it('says so when the budget is used up', () => {
    expect(nextMealHint({ hour: 12, logged: none, remaining: -50, goal: 2000 })?.text).toMatch(/Budget reached/);
  });

  it('keeps water targets sensible', () => {
    expect(waterGoalMl(50)).toBe(2000);
    expect(waterGoalMl(80)).toBe(2750);
    expect(waterGoalMl(140)).toBe(3500);
  });

  it('splits calories by macro', () => {
    const s = macroSplit({ calories: 400, protein: 25, carbs: 50, fat: 0 });
    expect(s.protein).toBeCloseTo(1 / 3);
    expect(s.carbs).toBeCloseTo(2 / 3);
    expect(macroSplit({ calories: 0, protein: 0, carbs: 0, fat: 0 })).toEqual({ protein: 0, carbs: 0, fat: 0 });
    expect(sodiumToSaltG(2300)).toBeCloseTo(5.75);
  });
});
