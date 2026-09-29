import { addDays, fromKey } from './dates';
import { doneSets, TEMPLATES } from './training';
import type { AppState, Routine, TrainingPlan } from './types';

/*
 * The weekly training plan: pick a split, give every weekday a session or a
 * rest day, and move things around for a single date without touching the
 * weekly pattern. Quests, the weekly challenge and the streak read from it.
 */

export interface Session {
  id: string;
  name: string;
  /** Three or four letters for the week strip. */
  short: string;
  color: string;
  routine: Routine;
}

const tpl = (id: string) => TEMPLATES.find((t) => t.id === id)!;
const routine = (id: string, name: string, list: [string, number, number][]): Routine => ({
  id,
  name,
  exercises: list.map(([exerciseId, sets, reps]) => ({ exerciseId, sets, reps })),
});

export const SESSIONS: Session[] = [
  { id: 'push', name: 'Push', short: 'PUSH', color: '#E0673A', routine: tpl('tpl-push') },
  { id: 'pull', name: 'Pull', short: 'PULL', color: '#3F7FD9', routine: tpl('tpl-pull') },
  { id: 'legs', name: 'Legs', short: 'LEGS', color: '#8B6CF6', routine: tpl('tpl-legs') },
  { id: 'upper', name: 'Upper', short: 'UPP', color: '#E0673A', routine: routine('tpl-upper', 'Upper', [['bench-press', 4, 6], ['barbell-row', 4, 8], ['ohp', 3, 8], ['lat-pulldown', 3, 10], ['db-curl', 2, 12], ['tricep-pushdown', 2, 12]]) },
  { id: 'lower', name: 'Lower', short: 'LOW', color: '#8B6CF6', routine: routine('tpl-lower', 'Lower', [['squat', 4, 6], ['rdl', 3, 8], ['bulgarian-split-squat', 3, 10], ['leg-curl', 3, 12], ['calf-raise', 4, 15], ['hanging-leg-raise', 3, 12]]) },
  { id: 'full', name: 'Full body', short: 'FULL', color: '#22A36B', routine: tpl('tpl-full') },
  { id: 'chest', name: 'Chest', short: 'CHST', color: '#E0673A', routine: routine('tpl-chest', 'Chest', [['bench-press', 4, 8], ['incline-db-press', 3, 10], ['cable-fly', 3, 12], ['dip', 3, 10]]) },
  { id: 'back', name: 'Back', short: 'BACK', color: '#3F7FD9', routine: routine('tpl-back', 'Back', [['deadlift', 3, 5], ['pull-up', 3, 8], ['barbell-row', 3, 8], ['seated-row', 3, 12], ['face-pull', 3, 15]]) },
  { id: 'shoulders', name: 'Shoulders', short: 'SHLD', color: '#D9A21F', routine: routine('tpl-shoulders', 'Shoulders', [['ohp', 4, 6], ['lateral-raise', 4, 15], ['rear-delt-fly', 3, 15], ['shrug', 3, 12]]) },
  { id: 'arms', name: 'Arms', short: 'ARMS', color: '#2BA89A', routine: routine('tpl-arms', 'Arms', [['barbell-curl', 3, 10], ['close-grip-bench', 3, 8], ['hammer-curl', 3, 12], ['skull-crusher', 3, 12], ['cable-curl', 2, 15]]) },
];

export interface Split {
  id: string;
  name: string;
  blurb: string;
  sessions: string[];
  /** Monday first; null is rest. */
  week: (string | null)[];
}

export const SPLITS: Split[] = [
  { id: 'ppl', name: 'Push / Pull / Legs', blurb: '6 days · each muscle twice', sessions: ['push', 'pull', 'legs'], week: ['push', 'pull', 'legs', 'push', 'pull', 'legs', null] },
  { id: 'ul', name: 'Upper / Lower', blurb: '4 days · balanced', sessions: ['upper', 'lower'], week: ['upper', 'lower', null, 'upper', 'lower', null, null] },
  { id: 'full3', name: 'Full body 3×', blurb: '3 days · great to start', sessions: ['full'], week: ['full', null, 'full', null, 'full', null, null] },
  { id: 'bro', name: 'Bro split', blurb: '5 days · one muscle a day', sessions: ['chest', 'back', 'legs', 'shoulders', 'arms'], week: ['chest', 'back', 'legs', 'shoulders', 'arms', null, null] },
  { id: 'custom', name: 'Custom', blurb: 'Build your own week', sessions: SESSIONS.map((s) => s.id), week: ['full', null, 'full', null, 'full', null, null] },
];

export const REST = 'rest';

export const findSplit = (id: string | undefined) => SPLITS.find((s) => s.id === id) ?? SPLITS[SPLITS.length - 1];

/** A new plan from a preset split. */
export function planFromSplit(splitId: string, since: string, week?: (string | null)[], name?: string): TrainingPlan {
  const split = findSplit(splitId);
  const clean = split.id === 'custom' ? name?.trim() : undefined;
  return { split: split.id, week: [...(week ?? split.week)], since, ...(clean ? { name: clean } : {}) };
}

/** What to call a plan: your own name for a custom split, else the split's. */
export const planName = (plan: Pick<TrainingPlan, 'split' | 'name'>) => (plan.split === 'custom' && plan.name?.trim()) || findSplit(plan.split).name;

/** Sessions you can pick for a day: the split's own, then your saved routines. */
export function sessionChoices(state: Pick<AppState, 'plan' | 'routines'>): Session[] {
  const split = findSplit(state.plan?.split);
  // A custom split is built from your own workouts first, then the built-in ones.
  if (split.id === 'custom') {
    const mineNames = new Set(state.routines.map((r) => r.name.trim().toLowerCase()));
    const own = state.routines.map((r) => {
      const builtIn = SESSIONS.find((s) => s.name.toLowerCase() === r.name.trim().toLowerCase());
      return builtIn ? { ...builtIn, routine: r } : routineSession(r);
    });
    return [...own, ...SESSIONS.filter((s) => !mineNames.has(s.name.toLowerCase()))];
  }
  const own = split.sessions.map((id) => SESSIONS.find((s) => s.id === id)!).filter(Boolean);
  const used = new Set(own.map((s) => s.name.toLowerCase()));
  const mine = state.routines.filter((r) => !used.has(r.name.toLowerCase())).map(routineSession);
  return [...own, ...mine];
}

const routineSession = (r: Routine): Session => ({ id: `r:${r.id}`, name: r.name, short: r.name.slice(0, 4).toUpperCase(), color: '#2BA89A', routine: r });

/**
 * The session behind an id. Your own routine wins when its name matches a
 * built-in session (a saved "Push" routine starts instead of the template).
 */
export function findSession(state: Pick<AppState, 'routines'>, id: string | null | undefined): Session | undefined {
  if (!id || id === REST) return undefined;
  if (id.startsWith('r:')) {
    const r = state.routines.find((x) => `r:${x.id}` === id);
    return r ? routineSession(r) : undefined;
  }
  const s = SESSIONS.find((x) => x.id === id);
  if (!s) return undefined;
  const mine = state.routines.find((r) => r.name.trim().toLowerCase() === s.name.toLowerCase());
  return mine ? { ...s, routine: mine } : s;
}

/**
 * The workouts a plan is made of, in the order they first appear in the week
 * (Push, Pull, Legs). Always derived from the plan, so changing the plan
 * changes this list; your own saved routine replaces a built-in of the same name.
 */
export function planSessions(state: Pick<AppState, 'plan' | 'routines'>): Session[] {
  const plan = state.plan;
  if (!plan) return [];
  const split = findSplit(plan.split);
  const inWeek = plan.week.filter((x): x is string => !!x);
  const ids = split.id === 'custom' ? inWeek : [...split.sessions.filter((id) => inWeek.includes(id)), ...inWeek, ...split.sessions];
  const out: Session[] = [];
  for (const id of ids) {
    const s = findSession(state, id);
    if (s && !out.some((o) => o.id === s.id)) out.push(s);
  }
  return out;
}

/** Monday = 0 … Sunday = 6. */
export const weekdayIndex = (date: string) => (fromKey(date).getDay() + 6) % 7;

export const mondayOf = (date: string) => addDays(date, -weekdayIndex(date));

export const weekOf = (date: string) => Array.from({ length: 7 }, (_, i) => addDays(mondayOf(date), i));

/** The session id planned for a date (overrides first), null for rest, undefined without a plan. */
export function plannedId(plan: TrainingPlan | undefined, date: string): string | null | undefined {
  if (!plan) return undefined;
  const o = plan.overrides?.[date];
  if (o) return o === REST ? null : o;
  return plan.week[weekdayIndex(date)] ?? null;
}

export type PlanDay = { kind: 'train'; session: Session } | { kind: 'rest' } | { kind: 'none' };

/** What the plan says about a date: train (which session), rest, or no plan set. */
export function planDay(state: Pick<AppState, 'plan' | 'routines'>, date: string): PlanDay {
  const id = plannedId(state.plan, date);
  if (id === undefined) return { kind: 'none' };
  if (id === null) return { kind: 'rest' };
  const session = findSession(state, id);
  // A deleted routine falls back to rest rather than a broken day.
  return session ? { kind: 'train', session } : { kind: 'rest' };
}

export const isPlannedRest = (state: Pick<AppState, 'plan' | 'routines'>, date: string) => planDay(state, date).kind === 'rest';

/** The plan with one date changed. Setting a date back to its weekly default drops the override. */
export function withDay(plan: TrainingPlan, date: string, id: string | null): TrainingPlan {
  const overrides = { ...plan.overrides };
  const weekly = plan.week[weekdayIndex(date)] ?? null;
  if (id === weekly) delete overrides[date];
  else overrides[date] = id ?? REST;
  // Old overrides are just noise: keep the last ~5 weeks.
  const cutoff = addDays(date, -35);
  for (const d of Object.keys(overrides)) if (d < cutoff) delete overrides[d];
  return { ...plan, overrides };
}

/** Swap two dates (used for "move today's session to tomorrow"). */
export function swapDays(plan: TrainingPlan, a: string, b: string): TrainingPlan {
  const ia = plannedId(plan, a) ?? null;
  const ib = plannedId(plan, b) ?? null;
  return withDay(withDay(plan, a, ib), b, ia);
}

/** Days in a date's Monday–Sunday week with a planned session. */
export function plannedSessionsInWeek(state: Pick<AppState, 'plan' | 'routines'>, date: string): string[] {
  return weekOf(date).filter((d) => planDay(state, d).kind === 'train');
}

/** True when a finished workout (at least one done set) is logged on that date. */
export const trainedOn = (state: Pick<AppState, 'workouts'>, date: string) => state.workouts.some((w) => w.date === date && doneSets(w) > 0);

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
