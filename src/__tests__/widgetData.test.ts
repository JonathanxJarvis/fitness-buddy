import { describe, expect, it } from '@jest/globals';
import {
  activityKey,
  addFoodUrl,
  calorieDayFromState,
  calorieWidgetProps,
  calorieWidgetTimeline,
  doneSetCount,
  workoutActivityProps,
  type CalorieDay,
} from '@/lib/widgetData';
import { initialState } from '@/store/reducer';
import type { AppState, DiaryEntry, Goals, Workout } from '@/lib/types';

const goals: Goals = {
  calories: 2000, protein: 150, carbs: 200, fat: 70, fiber: 30, sugar: 50, sodium: 2300,
  potassium: 3500, calcium: 1000, iron: 18, vitaminC: 90, vitaminD: 15, steps: 8000,
};
const day = (over: Partial<CalorieDay> = {}): CalorieDay => ({ goal: 2000, proteinGoal: 150, eaten: 0, protein: 0, burned: 0, logged: [], ...over });
const at = (h: number, m = 0) => new Date(2026, 8, 29, h, m);

describe('calorie widget', () => {
  it('asks you to set up before onboarding', () => {
    const p = calorieWidgetProps(null, at(9));
    expect(p.ready).toBe(false);
    expect(p.url).toBe('fitnessbuddy://');
  });

  it('shows calories left including exercise, protein and a breakfast nudge in the morning', () => {
    const p = calorieWidgetProps(day({ eaten: 300, protein: 20, burned: 200 }), at(8));
    expect(p.left).toBe(1900);
    expect(p.budget).toBe(2200);
    expect(p.progress).toBeCloseTo(300 / 2200);
    expect(p.protein).toBe(20);
    expect(p.cta).toBe('Log breakfast');
    expect(p.url).toBe('fitnessbuddy://add-food?meal=breakfast');
    expect(p.nudge).toMatch(/^Breakfast time/);
  });

  it('moves on to lunch at noon, dinner in the evening, and skips logged meals', () => {
    expect(calorieWidgetProps(day({ logged: ['breakfast'] }), at(12)).url).toBe(addFoodUrl('lunch'));
    expect(calorieWidgetProps(day({ logged: ['breakfast', 'lunch'] }), at(18)).cta).toBe('Log dinner');
    expect(calorieWidgetProps(day({ logged: ['breakfast'] }), at(16)).cta).toBe('Log dinner');
  });

  it('reports going over the budget', () => {
    const p = calorieWidgetProps(day({ eaten: 2300 }), at(20));
    expect(p.left).toBe(-300);
    expect(p.progress).toBe(1);
    expect(p.cta).toBe('Log food');
  });

  it('builds a timeline that changes nudges through the day and resets at midnight', () => {
    const now = at(10, 30);
    const tl = calorieWidgetTimeline(day({ eaten: 500, logged: ['breakfast'] }), now);
    expect(tl[0].date).toBe(now);
    const times = tl.map((e) => e.date.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(tl.map((e) => e.date.getHours())).toEqual([10, 11, 15, 17, 22, 0, 5, 11, 15, 17, 22]);
    const midnight = tl.find((e) => e.date.getDate() === 30 && e.date.getHours() === 0)!;
    expect(midnight.props.eaten).toBe(0);
    expect(midnight.props.left).toBe(2000);
    const tomorrow5 = tl.find((e) => e.date.getDate() === 30 && e.date.getHours() === 5)!;
    expect(tomorrow5.props.cta).toBe('Log breakfast');
  });

  it('reads today from the store', () => {
    const entry = (id: string, meal: DiaryEntry['meal'], kcal: number, protein: number): DiaryEntry => ({
      id, date: '2026-09-29', meal, servingIndex: 0, quantity: 1, createdAt: 1,
      food: { id: `f${id}`, name: 'x', source: 'custom', nutrients: { calories: kcal, protein, carbs: 0, fat: 0 }, servings: [{ label: '1', factor: 1 }] },
    });
    const state: AppState = {
      ...initialState,
      goals,
      entries: [entry('a', 'breakfast', 400, 30), entry('b', 'lunch', 600, 40), { ...entry('c', 'dinner', 999, 9), date: '2026-09-28' }],
      exercises: [{ id: 'e', date: '2026-09-29', name: 'Run', minutes: 30, calories: 250 }],
    };
    expect(calorieDayFromState(state, '2026-09-29')).toEqual({ goal: 2000, proteinGoal: 150, eaten: 1000, protein: 70, burned: 250, logged: ['breakfast', 'lunch'] });
    expect(calorieDayFromState({ ...state, goals: null }, '2026-09-29')).toBeNull();
  });
});

describe('workout live activity', () => {
  const s = (done: boolean) => ({ kg: 50, reps: 10, done });
  const w: Workout = {
    id: 'w1', date: '2026-09-29', name: 'Push day', startedAt: 1000,
    exercises: [
      { exerciseId: 'bench-press', sets: [s(true), s(true), s(false)] },
      { exerciseId: 'nope', sets: [s(false), s(false)] },
      { exerciseId: 'bench-press', sets: [s(false)] },
    ],
  };

  it('shows the current exercise, set number and next exercise', () => {
    const p = workoutActivityProps(w, { now: 5000 });
    expect(p.current).toBe('Bench press');
    expect(p.currentDetail).toBe('Set 3 of 3');
    expect(p.next).toBe('Exercise');
    expect(p.setsDone).toBe(2);
    expect(p.setsTotal).toBe(6);
    expect(p.restEndsAt).toBe(0);
    expect(p.startedAt).toBe(1000);
  });

  it('includes the rest countdown only while resting', () => {
    expect(workoutActivityProps(w, { now: 5000, rest: { startedAt: 4000, endsAt: 94000 } }).restEndsAt).toBe(94000);
    expect(workoutActivityProps(w, { now: 95000, rest: { startedAt: 4000, endsAt: 94000 } }).restEndsAt).toBe(0);
  });

  it('handles the last exercise, all sets done and an empty workout', () => {
    const last: Workout = { ...w, exercises: [{ exerciseId: 'bench-press', sets: [s(true), s(false)] }] };
    expect(workoutActivityProps(last).next).toBe('');
    const done: Workout = { ...w, exercises: [{ exerciseId: 'bench-press', sets: [s(true)] }] };
    expect(workoutActivityProps(done).currentDetail).toBe('All sets done');
    expect(workoutActivityProps({ ...w, exercises: [] }).current).toBe('Add an exercise');
  });

  it('counts done sets and keys changes', () => {
    expect(doneSetCount(w)).toBe(2);
    expect(doneSetCount(null)).toBe(0);
    const a = workoutActivityProps(w, { now: 1 });
    expect(activityKey(a)).toBe(activityKey(workoutActivityProps(w, { now: 2 })));
    expect(activityKey(a)).not.toBe(activityKey(workoutActivityProps({ ...w, name: 'Legs' }, { now: 1 })));
  });
});
