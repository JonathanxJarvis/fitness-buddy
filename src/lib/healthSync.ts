// Pure merge rules for Apple Health sync. No native imports, so it's unit-tested in Jest.
//
// Rules, so nothing is counted twice:
// - Steps: per day, keep the larger of the app's count (phone pedometer) and Health's
//   (which already merges iPhone + Apple Watch without double counting).
// - Weight: per day, the latest Health weigh-in from another app. A weight you logged in
//   Fitness Buddy for that day wins; weights we wrote to Health ourselves are skipped.
// - Workouts from other apps (Apple Watch runs, etc.) become exercise entries with the id
//   "hk-<uuid>", once. Workouts this app wrote, or that overlap a workout tracked here, are skipped.
import type { ExerciseEntry, Workout } from './types';
import { toKey } from './dates';

export const HEALTH_EXERCISE_PREFIX = 'hk-';

/** What we remember between syncs (stored on the phone, next to the app's data). */
export interface HealthMeta {
  /** The user tapped Connect and answered the Health permission sheet. */
  connected: boolean;
  connectedAt?: number;
  lastSync?: number;
  lastError?: string;
  /** date -> active energy (kcal) from Health, shown in Profile. */
  activeKcal: Record<string, number>;
  /** date -> steps Health reported, shown in Profile. */
  healthSteps: Record<string, number>;
  /** date -> weight (kg) imported from Health. If the app's value still matches, a newer Health value may replace it. */
  importedWeights: Record<string, number>;
  /** date -> weight (kg) we wrote to Health. */
  exportedWeights: Record<string, number>;
  /** App workout ids already written to Health. */
  exportedWorkouts: string[];
}

export const EMPTY_HEALTH_META: HealthMeta = {
  connected: false,
  activeKcal: {},
  healthSteps: {},
  importedWeights: {},
  exportedWeights: {},
  exportedWorkouts: [],
};

// ---------- Steps ----------

/** Days where Health knows more steps than the app does. */
export function stepUpdates(appSteps: Record<string, number>, healthSteps: Record<string, number>): { date: string; steps: number }[] {
  return Object.entries(healthSteps)
    .map(([date, steps]) => ({ date, steps: Math.round(steps) }))
    .filter(({ date, steps }) => steps > 0 && steps > (appSteps[date] ?? 0))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- Weight ----------

export interface HealthWeightSample {
  uuid: string;
  /** ms since epoch. */
  at: number;
  kg: number;
  /** Bundle id of the app that wrote it. */
  source: string;
}

const round1 = (kg: number) => Math.round(kg * 10) / 10;

/**
 * Weights to import: one per day (the latest reading), skipping our own samples and
 * days where the user logged a weight in the app themselves.
 */
export function weightImports(
  samples: HealthWeightSample[],
  appWeights: Record<string, number>,
  imported: Record<string, number>,
  ownBundleId: string,
): { date: string; kg: number }[] {
  const latest = new Map<string, HealthWeightSample>();
  for (const s of samples) {
    if (s.source === ownBundleId || !(s.kg > 0)) continue;
    const date = toKey(new Date(s.at));
    const had = latest.get(date);
    if (!had || s.at > had.at) latest.set(date, s);
  }
  const out: { date: string; kg: number }[] = [];
  for (const [date, s] of latest) {
    const kg = round1(s.kg);
    const inApp = appWeights[date];
    // Logged by hand in the app (or edited after an import): the app wins.
    if (inApp !== undefined && imported[date] !== inApp) continue;
    if (inApp !== undefined && round1(inApp) === kg) continue;
    out.push({ date, kg });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Weights logged in the app since connecting that Health doesn't have yet. */
export function weightExports(
  appWeights: Record<string, number>,
  meta: Pick<HealthMeta, 'importedWeights' | 'exportedWeights' | 'connectedAt'>,
): { date: string; kg: number }[] {
  const since = meta.connectedAt ? toKey(new Date(meta.connectedAt)) : '9999-12-31';
  return Object.entries(appWeights)
    .filter(([date, kg]) => date >= since && meta.importedWeights[date] !== kg && meta.exportedWeights[date] !== kg)
    .map(([date, kg]) => ({ date, kg }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ---------- Workouts ----------

export interface HealthWorkout {
  uuid: string;
  start: number;
  end: number;
  /** HKWorkoutActivityType raw value. */
  activityType: number;
  kcal?: number;
  source: string;
  /** HKExternalUUID metadata; we set it to the app workout id when writing. */
  externalId?: string;
}

const ACTIVITY_NAMES: Record<number, string> = {
  11: 'Cross training',
  13: 'Cycling',
  14: 'Dance',
  16: 'Elliptical',
  20: 'Functional strength',
  24: 'Hiking',
  35: 'Rowing',
  37: 'Running',
  44: 'Stair climbing',
  46: 'Swimming',
  50: 'Strength training',
  52: 'Walking',
  57: 'Yoga',
  59: 'Core training',
  63: 'HIIT',
  66: 'Pilates',
  73: 'Cardio',
};

export const activityName = (type: number) => ACTIVITY_NAMES[type] ?? 'Workout';

/** Share of `a` covered by `b` (0..1). */
function overlap(a: { start: number; end: number }, b: { start: number; end: number }): number {
  const len = Math.max(1, a.end - a.start);
  return Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start)) / len;
}

/** Health workouts from other apps that aren't in the app yet, as exercise entries. */
export function workoutImports(
  healthWorkouts: HealthWorkout[],
  appExercises: ExerciseEntry[],
  appWorkouts: Workout[],
  ownBundleId: string,
): ExerciseEntry[] {
  const have = new Set(appExercises.map((e) => e.id));
  const ownIds = new Set(appWorkouts.map((w) => w.id));
  const tracked = appWorkouts.map((w) => ({ start: w.startedAt, end: w.endedAt ?? w.startedAt }));
  const out: ExerciseEntry[] = [];
  for (const h of healthWorkouts) {
    const id = HEALTH_EXERCISE_PREFIX + h.uuid;
    if (have.has(id) || h.source === ownBundleId) continue;
    if (h.externalId && ownIds.has(h.externalId)) continue;
    // The same session recorded here and on a watch: keep the app's copy.
    if (tracked.some((t) => overlap(h, t) > 0.5 || overlap(t, h) > 0.5)) continue;
    have.add(id);
    out.push({
      id,
      date: toKey(new Date(h.start)),
      name: `${activityName(h.activityType)} (Apple Health)`,
      minutes: Math.max(1, Math.round((h.end - h.start) / 60000)),
      calories: Math.max(0, Math.round(h.kcal ?? 0)),
    });
  }
  return out;
}

/** Finished app workouts to write to Health: ended after connecting, not written before. */
export function workoutExports(appWorkouts: Workout[], meta: Pick<HealthMeta, 'exportedWorkouts' | 'connectedAt'>): Workout[] {
  const done = new Set(meta.exportedWorkouts);
  const since = meta.connectedAt ?? Infinity;
  return appWorkouts.filter((w) => w.endedAt && w.endedAt >= since && !done.has(w.id));
}

/** Keep per-day maps small: only the last `days` days. */
export function trimDays<T>(map: Record<string, T>, today: string, days = 60): Record<string, T> {
  const cutoff = new Date(`${today}T00:00:00`);
  cutoff.setDate(cutoff.getDate() - days);
  const min = toKey(cutoff);
  return Object.fromEntries(Object.entries(map).filter(([d]) => d >= min));
}
