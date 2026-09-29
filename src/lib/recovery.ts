import { exerciseInfo, REGION_LABEL, type MuscleRegion } from './exerciseInfo';
import type { Exercise, Workout } from './types';

/*
 * Recovery map (Pro): how tired each muscle still is from recent training.
 *
 * Every done set leaves "fatigue" on the muscles it hits: 1 for a primary
 * mover, 0.5 for a helper. That fatigue fades linearly to zero over the
 * muscle's recovery window: about 72 hours for big muscles, 48 for mid-size
 * ones and 36 for small ones. The sum is in "effective sets", and a muscle is
 * tired from about 5, recovering from 2, fresh below that.
 */

const H = 3600_000;

export const RECOVERY_HOURS: Record<MuscleRegion, number> = {
  quads: 72, hamstrings: 72, glutes: 72, 'lower-back': 72, lats: 72, 'upper-back': 72, chest: 72,
  traps: 48, 'front-delts': 48, triceps: 48, biceps: 48, adductors: 48, abductors: 48,
  'side-delts': 36, 'rear-delts': 36, forearms: 36, abs: 36, obliques: 36, calves: 36,
};

/** Effective sets at which a muscle counts as tired / still recovering. */
export const THRESHOLDS = { tired: 5, recovering: 2 };

export type RecoveryState = 'fresh' | 'recovering' | 'tired';

export const STATE_LABEL: Record<RecoveryState, string> = { fresh: 'Fresh', recovering: 'Recovering', tired: 'Tired' };

export const ALL_REGIONS = Object.keys(RECOVERY_HOURS) as MuscleRegion[];

export function classify(fatigue: number): RecoveryState {
  return fatigue >= THRESHOLDS.tired ? 'tired' : fatigue >= THRESHOLDS.recovering ? 'recovering' : 'fresh';
}

/** When a workout's sets landed: when it ended, else when it started. */
const workoutTime = (w: Workout) => w.endedAt ?? w.startedAt;

interface Hit {
  at: number;
  amount: number;
}

/** Every set's load on each muscle within the longest recovery window. */
function hits(workouts: Workout[], now: number, custom: Exercise[]): Map<MuscleRegion, Hit[]> {
  const out = new Map<MuscleRegion, Hit[]>();
  const oldest = now - 72 * H;
  for (const w of workouts) {
    const at = workoutTime(w);
    if (at > now || at < oldest) continue;
    for (const e of w.exercises) {
      const n = e.sets.filter((s) => s.done).length;
      if (!n) continue;
      const info = exerciseInfo(e.exerciseId, custom);
      const add = (r: MuscleRegion, amount: number) => {
        const list = out.get(r) ?? [];
        list.push({ at, amount });
        out.set(r, list);
      };
      for (const r of info.primary) add(r, n);
      for (const r of info.secondary) if (!info.primary.includes(r)) add(r, n * 0.5);
    }
  }
  return out;
}

const fatigueAt = (list: Hit[], region: MuscleRegion, t: number) => {
  const win = RECOVERY_HOURS[region] * H;
  return list.reduce((sum, h) => sum + h.amount * Math.max(0, 1 - (t - h.at) / win), 0);
};

export interface MuscleRecovery {
  region: MuscleRegion;
  /** Effective sets still weighing on the muscle. */
  fatigue: number;
  state: RecoveryState;
  /** Hours until it's fresh again (0 when fresh). */
  readyInHours: number;
  /** When it was last trained, if in the last 72 hours. */
  lastTrained?: number;
}

/** Recovery for every muscle at `now` (ms). */
export function muscleRecovery(workouts: Workout[], now: number, custom: Exercise[] = []): Record<MuscleRegion, MuscleRecovery> {
  const all = hits(workouts, now, custom);
  const out = {} as Record<MuscleRegion, MuscleRecovery>;
  for (const region of ALL_REGIONS) {
    const list = all.get(region) ?? [];
    const fatigue = fatigueAt(list, region, now);
    const state = classify(fatigue);
    let readyInHours = 0;
    if (state !== 'fresh') {
      // Fatigue only falls, so step forward until it drops under the line.
      while (readyInHours < RECOVERY_HOURS[region] && fatigueAt(list, region, now + readyInHours * H) >= THRESHOLDS.recovering) readyInHours++;
    }
    out[region] = { region, fatigue, state, readyInHours, lastTrained: list.length ? Math.max(...list.map((h) => h.at)) : undefined };
  }
  return out;
}

/** Short, rounded wording for when a muscle is fresh again. */
export function readyLabel(hours: number): string {
  if (hours <= 0) return 'Ready now';
  if (hours < 2) return 'Ready within the hour';
  if (hours < 24) return `Ready in ~${hours}\u00A0h`;
  const days = Math.round(hours / 24);
  return `Ready in ~${days}\u00A0day${days === 1 ? '' : 's'}`;
}

/* ---------- what to train today ---------- */

export interface Candidate {
  id: string;
  name: string;
  exercises: { exerciseId: string; sets: number }[];
}

export interface Fit {
  candidate: Candidate;
  /** 0–100: how much of the session's work lands on fresh muscles (recovering ones count a third). */
  score: number;
  /** Tired muscles the session would hit as a main mover. */
  tiredHits: MuscleRegion[];
  /** The fresh muscles it trains hardest. */
  freshHits: MuscleRegion[];
}

const READINESS: Record<RecoveryState, number> = { fresh: 1, recovering: 1 / 3, tired: 0 };

/** How well one session fits today's recovery. */
export function sessionFit(c: Candidate, rec: Record<MuscleRegion, MuscleRecovery>, custom: Exercise[] = []): Fit {
  const load = new Map<MuscleRegion, number>();
  const primaries = new Map<MuscleRegion, number>();
  for (const e of c.exercises) {
    const info = exerciseInfo(e.exerciseId, custom);
    const n = Math.max(1, e.sets);
    for (const r of info.primary) {
      load.set(r, (load.get(r) ?? 0) + n);
      primaries.set(r, (primaries.get(r) ?? 0) + n);
    }
    for (const r of info.secondary) if (!info.primary.includes(r)) load.set(r, (load.get(r) ?? 0) + n * 0.5);
  }
  let total = 0;
  let good = 0;
  for (const [r, v] of load) {
    total += v;
    good += v * READINESS[rec[r].state];
  }
  // Main movers, most direct work first.
  const main = [...primaries.entries()].sort((a, b) => b[1] - a[1]).map(([r]) => r);
  return {
    candidate: c,
    score: total ? Math.round((good / total) * 100) : 0,
    tiredHits: main.filter((r) => rec[r].state === 'tired'),
    freshHits: main.filter((r) => rec[r].state === 'fresh').slice(0, 4),
  };
}

/** Sessions ranked best fit first; ties keep the given order (so the plan's own sessions win). */
export function rankSessions(candidates: Candidate[], rec: Record<MuscleRegion, MuscleRecovery>, custom: Exercise[] = []): Fit[] {
  return candidates
    .filter((c) => c.exercises.length)
    .map((c, i) => ({ fit: sessionFit(c, rec, custom), i }))
    .sort((a, b) => b.fit.score - a.fit.score || a.fit.tiredHits.length - b.fit.tiredHits.length || a.i - b.i)
    .map((x) => x.fit);
}

/** Muscle names joined for a sentence: "Chest, triceps and front delts". */
export function regionList(regions: MuscleRegion[], max = 3): string {
  const names = regions.slice(0, max).map((r, i) => (i ? REGION_LABEL[r].toLowerCase() : REGION_LABEL[r]));
  const more = regions.length - names.length;
  if (more > 0) return `${names.join(', ')} and ${more} more`;
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : (names[0] ?? '');
}

/** Muscle names that read as one thing ("chest is"), not a pair or group ("lats are"). */
const SINGULAR: MuscleRegion[] = ['chest', 'upper-back', 'lower-back'];

/** "is" or "are" to follow a list of muscles. */
export function isAre(regions: MuscleRegion[]): 'is' | 'are' {
  return regions.length === 1 && SINGULAR.includes(regions[0]) ? 'is' : 'are';
}
