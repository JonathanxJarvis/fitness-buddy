// Pure data shaping for the iOS home screen widget and the workout Live Activity.
// No native imports here, so it runs in Jest, on web and in Expo Go.
import type { AppState, MealType, Workout } from './types';
import { daySummary } from './selectors';
import { nextMealHint } from '@/components/today/dayContext';
import { findExercise } from './training';

/** App scheme from app.json; deep links look like fitnessbuddy://add-food?meal=lunch. */
export const APP_SCHEME = 'fitnessbuddy';

export interface CalorieWidgetProps {
  /** Calories left today (goal + exercise − eaten), negative when over. */
  left: number;
  eaten: number;
  /** Today's budget: calorie goal plus logged exercise. */
  budget: number;
  /** 0..1 share of the budget eaten. */
  progress: number;
  protein: number;
  proteinGoal: number;
  /** One-line nudge, e.g. "Lunch time, about 650 kcal fits". */
  nudge: string;
  /** Short call to action, e.g. "Log lunch". */
  cta: string;
  /** Deep link opened when the widget is tapped. */
  url: string;
  /** False before onboarding: the widget asks you to open the app. */
  ready: boolean;
}

export interface CalorieDay {
  goal: number;
  proteinGoal: number;
  eaten: number;
  protein: number;
  burned: number;
  logged: MealType[];
}

const MEAL_LABEL: Record<MealType, string> = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner', snacks: 'a snack' };

export function addFoodUrl(meal: MealType): string {
  return `${APP_SCHEME}://add-food?meal=${meal}`;
}

/** Today's numbers from the store, in the shape the widget timeline needs. */
export function calorieDayFromState(state: AppState, date: string): CalorieDay | null {
  if (!state.goals) return null;
  const day = daySummary(state, date);
  return {
    goal: state.goals.calories,
    proteinGoal: state.goals.protein,
    eaten: Math.round(day.totals.calories),
    protein: Math.round(day.totals.protein),
    burned: Math.round(day.burned),
    logged: [...new Set(day.entries.map((e) => e.meal))],
  };
}

/** What the widget shows for a given day's numbers at a given time. */
export function calorieWidgetProps(day: CalorieDay | null, at: Date): CalorieWidgetProps {
  if (!day) {
    return { left: 0, eaten: 0, budget: 0, progress: 0, protein: 0, proteinGoal: 0, nudge: 'Open Fitness Buddy to set your goal', cta: 'Set up', url: `${APP_SCHEME}://`, ready: false };
  }
  const budget = Math.max(0, day.goal + day.burned);
  const left = Math.round(budget - day.eaten);
  const hint = nextMealHint({ hour: at.getHours(), logged: new Set(day.logged), remaining: left, goal: day.goal });
  const meal: MealType = hint?.meal ?? 'snacks';
  return {
    left,
    eaten: day.eaten,
    budget,
    progress: budget > 0 ? Math.max(0, Math.min(1, day.eaten / budget)) : 0,
    protein: day.protein,
    proteinGoal: day.proteinGoal,
    nudge: hint?.text ?? 'Log what you eat',
    cta: left <= 0 ? 'Log food' : `Log ${MEAL_LABEL[meal]}`,
    url: addFoodUrl(meal),
    ready: true,
  };
}

/** Hours where the meal nudge changes (see nextMealHint's windows). */
const NUDGE_HOURS = [5, 11, 15, 17, 22];

/**
 * Timeline entries so the widget keeps up without the app running: the nudge moves on at
 * each meal window, and at midnight it resets to a fresh day (nothing eaten, no exercise).
 */
export function calorieWidgetTimeline(day: CalorieDay | null, now: Date): { date: Date; props: CalorieWidgetProps }[] {
  const entries = [{ date: now, props: calorieWidgetProps(day, now) }];
  if (!day) return entries;
  const at = (base: Date, dayOffset: number, hour: number) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, hour, 0, 0, 0);
  for (const h of NUDGE_HOURS) {
    const t = at(now, 0, h);
    if (t > now) entries.push({ date: t, props: calorieWidgetProps(day, t) });
  }
  const fresh: CalorieDay = { ...day, eaten: 0, protein: 0, burned: 0, logged: [] };
  const midnight = at(now, 1, 0);
  entries.push({ date: midnight, props: calorieWidgetProps(fresh, midnight) });
  for (const h of NUDGE_HOURS) {
    const t = at(now, 1, h);
    entries.push({ date: t, props: calorieWidgetProps(fresh, t) });
  }
  return entries;
}

// ---------- Workout Live Activity ----------

export interface WorkoutActivityProps {
  name: string;
  /** ms since epoch; the layout shows a live count-up timer from here. */
  startedAt: number;
  current: string;
  /** e.g. "Set 2 of 4". */
  currentDetail: string;
  /** Next exercise name, '' when this is the last one. */
  next: string;
  /** ms since epoch when rest ends, 0 when not resting. */
  restEndsAt: number;
  /** ms since epoch when rest began (for the countdown's range). */
  restStartedAt: number;
  setsDone: number;
  setsTotal: number;
}

/** Everything the Live Activity shows for the active workout. */
export function workoutActivityProps(
  w: Workout,
  opts: { customExercises?: AppState['customExercises']; rest?: { startedAt: number; endsAt: number } | null; now?: number } = {},
): WorkoutActivityProps {
  const now = opts.now ?? Date.now();
  const name = (id: string) => findExercise(id, opts.customExercises ?? [])?.name ?? 'Exercise';
  const setsTotal = w.exercises.reduce((s, e) => s + e.sets.length, 0);
  const setsDone = w.exercises.reduce((s, e) => s + e.sets.filter((x) => x.done).length, 0);
  // The current exercise is the first one with an unchecked set (or the last one when all are done).
  let ci = w.exercises.findIndex((e) => e.sets.some((s) => !s.done));
  const allDone = ci === -1;
  if (allDone) ci = w.exercises.length - 1;
  const cur = w.exercises[ci];
  const nextEx = allDone ? undefined : w.exercises.slice(ci + 1).find((e) => e.sets.some((s) => !s.done));
  const setNo = cur ? Math.min(cur.sets.length, cur.sets.filter((s) => s.done).length + 1) : 0;
  const resting = !!opts.rest && opts.rest.endsAt > now;
  return {
    name: w.name,
    startedAt: w.startedAt,
    current: cur ? name(cur.exerciseId) : 'Add an exercise',
    currentDetail: !cur ? '' : allDone ? 'All sets done' : `Set ${setNo} of ${cur.sets.length}`,
    next: nextEx ? name(nextEx.exerciseId) : '',
    restEndsAt: resting ? opts.rest!.endsAt : 0,
    restStartedAt: resting ? opts.rest!.startedAt : 0,
    setsDone,
    setsTotal,
  };
}

/** Number of checked-off sets; a rise means the user just finished a set (and rest starts). */
export function doneSetCount(w: Workout | null): number {
  return w ? w.exercises.reduce((s, e) => s + e.sets.filter((x) => x.done).length, 0) : 0;
}

/** Stable key for "did anything the Live Activity shows change?". */
export function activityKey(p: WorkoutActivityProps): string {
  return [p.name, p.current, p.currentDetail, p.next, p.restEndsAt, p.setsDone, p.setsTotal].join('|');
}
