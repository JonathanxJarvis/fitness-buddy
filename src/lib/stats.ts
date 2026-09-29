import { addDays, fromKey } from './dates';
import { exerciseInfo, type MuscleRegion } from './exerciseInfo';
import { oneRepMax } from './training';
import type { Exercise, Workout } from './types';

/*
 * Deep stats for the Progress screen (Pro): estimated 1-rep max per lift,
 * strength trends by week and weekly sets per muscle. Pure functions over the
 * workout log so they are easy to test. Dates are YYYY-MM-DD keys.
 */

/** Estimated 1RM uses the Epley formula: weight × (1 + reps / 30); a single is the weight itself. */
export const E1RM_FORMULA = 'Epley';

/** Sets above this many reps say little about a max, so they don't count toward e1RM. */
export const E1RM_MAX_REPS = 12;

/** Estimated 1RM of one set, or 0 when it can't tell (no weight, too many reps). */
export function e1rm(kg: number, reps: number): number {
  if (kg <= 0 || reps <= 0 || reps > E1RM_MAX_REPS) return 0;
  return oneRepMax(kg, reps);
}

/** Monday of the week a date falls in. */
export function weekStart(date: string): string {
  return addDays(date, -((fromKey(date).getDay() + 6) % 7));
}

/** The best e1RM for one exercise in each workout, oldest first. */
export function e1rmSessions(exerciseId: string, workouts: Workout[]): { date: string; e1rm: number }[] {
  const out: { date: string; e1rm: number; at: number }[] = [];
  for (const w of workouts) {
    let best = 0;
    for (const e of w.exercises) {
      if (e.exerciseId !== exerciseId) continue;
      for (const s of e.sets) if (s.done) best = Math.max(best, e1rm(s.kg, s.reps));
    }
    if (best > 0) out.push({ date: w.date, e1rm: best, at: w.startedAt });
  }
  return out.sort((a, b) => (a.date === b.date ? a.at - b.at : a.date < b.date ? -1 : 1)).map(({ date, e1rm }) => ({ date, e1rm }));
}

/** Best e1RM per week (weeks start Monday) from `from` to `to` inclusive; weeks without the lift are left out. */
export function weeklyBestE1rm(exerciseId: string, workouts: Workout[], from: string, to: string): { week: string; e1rm: number }[] {
  const best = new Map<string, number>();
  for (const s of e1rmSessions(exerciseId, workouts)) {
    if (s.date < from || s.date > to) continue;
    const wk = weekStart(s.date);
    best.set(wk, Math.max(best.get(wk) ?? 0, s.e1rm));
  }
  return [...best.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([week, e1rm]) => ({ week, e1rm }));
}

/** The big barbell lifts come first when you do them. */
const HEADLINE = ['squat', 'bench-press', 'deadlift', 'ohp'];

/**
 * The lifts worth tracking: weighted exercises you've done in at least
 * `minSessions` workouts since `since`, headline lifts first, then by how
 * often you do them.
 */
export function mainLifts(workouts: Workout[], since: string, limit = 6, minSessions = 2): string[] {
  const count = new Map<string, number>();
  for (const w of workouts) {
    if (w.date < since) continue;
    const seen = new Set<string>();
    for (const e of w.exercises) if (e.sets.some((s) => s.done && e1rm(s.kg, s.reps) > 0)) seen.add(e.exerciseId);
    for (const id of seen) count.set(id, (count.get(id) ?? 0) + 1);
  }
  const rank = (id: string) => (HEADLINE.includes(id) ? HEADLINE.indexOf(id) : 99);
  return [...count.entries()]
    .filter(([, n]) => n >= minSessions)
    .sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .slice(0, limit)
    .map(([id]) => id);
}

export interface LiftSummary {
  exerciseId: string;
  /** Best e1RM in the last 4 weeks, or the latest known one when you haven't done it lately. */
  current: number;
  /** Best e1RM in the 4 weeks before that; undefined when there's nothing to compare. */
  before?: number;
  /** current − before (kg), undefined without a comparison. */
  change?: number;
  /** Best e1RM ever. */
  best: number;
  lastDate: string;
}

/**
 * Where a lift stands today vs 4 weeks ago: the best e1RM of the last 28 days
 * against the best of the 28 days before.
 */
export function liftSummary(exerciseId: string, workouts: Workout[], today: string): LiftSummary | undefined {
  const sessions = e1rmSessions(exerciseId, workouts).filter((s) => s.date <= today);
  if (!sessions.length) return undefined;
  const recentFrom = addDays(today, -27);
  const prevFrom = addDays(today, -55);
  const max = (list: { e1rm: number }[]) => (list.length ? Math.max(...list.map((s) => s.e1rm)) : undefined);
  const recent = max(sessions.filter((s) => s.date >= recentFrom));
  const prev = max(sessions.filter((s) => s.date >= prevFrom && s.date < recentFrom));
  const last = sessions[sessions.length - 1];
  const current = recent ?? last.e1rm;
  return {
    exerciseId,
    current,
    before: recent !== undefined ? prev : undefined,
    change: recent !== undefined && prev !== undefined ? current - prev : undefined,
    best: Math.max(...sessions.map((s) => s.e1rm)),
    lastDate: last.date,
  };
}

/* ---------- weekly sets per muscle ---------- */

/** Evidence-based weekly hard sets for growth. */
export const SET_TARGET = { low: 10, high: 20 };

export type VolumeStatus = 'under' | 'in' | 'over';

export function volumeStatus(sets: number, target = SET_TARGET): VolumeStatus {
  return sets < target.low ? 'under' : sets > target.high ? 'over' : 'in';
}

export const VOLUME_LABEL: Record<VolumeStatus, string> = { under: 'Under', in: 'In range', over: 'Over' };

/** Sets per muscle for one workout: done sets, primary movers count 1, helpers 0.5. */
export function muscleSets(w: Workout, custom: Exercise[] = []): Partial<Record<MuscleRegion, number>> {
  const out: Partial<Record<MuscleRegion, number>> = {};
  for (const e of w.exercises) {
    const n = e.sets.filter((s) => s.done).length;
    if (!n) continue;
    const info = exerciseInfo(e.exerciseId, custom);
    for (const r of info.primary) out[r] = (out[r] ?? 0) + n;
    for (const r of info.secondary) if (!info.primary.includes(r)) out[r] = (out[r] ?? 0) + n * 0.5;
  }
  return out;
}

export interface MuscleVolume {
  region: MuscleRegion;
  /** Sets in each of the weeks, oldest first (same order as `weeks`). */
  perWeek: number[];
  /** Average over the weeks you've been training (see `weeksCounted`). */
  average: number;
  /** Sets so far this week. */
  thisWeek: number;
  status: VolumeStatus;
}

export interface WeeklyVolume {
  /** Monday of each full week in the window, oldest first. */
  weeks: string[];
  /** How many of those weeks the average is taken over: weeks since your first workout, at most all of them. */
  weeksCounted: number;
  /** Trained muscles, most sets first. */
  muscles: MuscleVolume[];
  /** Muscles with no sets at all in the window. */
  untrained: MuscleRegion[];
}

const ALL_REGIONS: MuscleRegion[] = [
  'chest', 'front-delts', 'side-delts', 'rear-delts', 'biceps', 'triceps', 'forearms', 'abs', 'obliques',
  'traps', 'lats', 'upper-back', 'lower-back', 'glutes', 'quads', 'hamstrings', 'adductors', 'abductors', 'calves',
];

/**
 * Weekly sets per muscle over the last `n` full weeks (the current,
 * unfinished week is reported separately as `thisWeek`).
 */
export function weeklyMuscleVolume(workouts: Workout[], today: string, n = 8, custom: Exercise[] = []): WeeklyVolume {
  const current = weekStart(today);
  const weeks = Array.from({ length: n }, (_, i) => addDays(current, -7 * (n - i)));
  const idx = new Map(weeks.map((w, i) => [w, i]));
  const per = new Map<MuscleRegion, number[]>();
  const now = new Map<MuscleRegion, number>();
  let first: string | undefined;
  for (const w of workouts) {
    if (w.date > today) continue;
    const sets = muscleSets(w, custom);
    if (!Object.keys(sets).length) continue;
    if (!first || w.date < first) first = w.date;
    const wk = weekStart(w.date);
    for (const [r, v] of Object.entries(sets) as [MuscleRegion, number][]) {
      if (wk === current) now.set(r, (now.get(r) ?? 0) + v);
      const i = idx.get(wk);
      if (i === undefined) continue;
      const arr = per.get(r) ?? Array(n).fill(0);
      arr[i] += v;
      per.set(r, arr);
    }
  }
  // Only average over weeks since you started, so a new user isn't "under" everywhere.
  const firstWeek = first ? weekStart(first) : current;
  const weeksCounted = Math.max(1, weeks.filter((w) => w >= firstWeek).length);
  const muscles: MuscleVolume[] = [];
  for (const region of ALL_REGIONS) {
    const perWeek = per.get(region) ?? Array(n).fill(0);
    const total = perWeek.reduce((a, b) => a + b, 0);
    const thisWeek = now.get(region) ?? 0;
    if (!total && !thisWeek) continue;
    const average = total / weeksCounted;
    muscles.push({ region, perWeek, average, thisWeek, status: volumeStatus(average) });
  }
  muscles.sort((a, b) => b.average - a.average || b.thisWeek - a.thisWeek);
  const trained = new Set(muscles.map((m) => m.region));
  return { weeks, weeksCounted, muscles, untrained: ALL_REGIONS.filter((r) => !trained.has(r)) };
}
