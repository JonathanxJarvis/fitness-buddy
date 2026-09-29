import { findExercise } from './training';
import { kgToLb, lbToKg } from './units';
import type { Equipment, Exercise, UnitSystem, Workout, WorkoutSet } from './types';

/*
 * Smart progression (Pro): what to lift next, from your last sessions.
 *
 * One rule you can say out loud:
 *  - Hit your rep target on every working set last time? Add the smallest
 *    sensible step: 2.5 kg on a barbell, machine or cable, 1 to 2 kg on
 *    dumbbells, one more rep on a bodyweight exercise.
 *  - Missed reps? Repeat the same weight and target.
 *  - Missed at the same weight two sessions running? Take a small deload
 *    (about 10% lighter) and build back up.
 */

export type SuggestKind = 'increase' | 'repeat' | 'deload';

export interface Suggestion {
  kind: SuggestKind;
  /** One target per set, in order. */
  sets: { kg: number; reps: number }[];
  /** Why, in a sentence. */
  reason: string;
  /** The weight step used (0 for bodyweight). */
  step: number;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** The smallest sensible jump in pounds, for people who load plates in lb. */
export function weightStepLb(equipment: Equipment | undefined, lb: number): number {
  switch (equipment) {
    case 'dumbbell':
      return lb < 20 ? 2.5 : 5;
    case 'kettlebell':
      return 9;
    case 'band':
      return 2.5;
    default:
      return 5;
  }
}

/** Weight math in the lifter's own units, so a US lifter gets 140 lb, not 140.5. */
function scale(units: UnitSystem | undefined) {
  const us = units === 'us';
  return {
    unit: us ? 'lb' : 'kg',
    // Working value in display units, snapped to half a unit so kg round-trips don't drift.
    from: (kg: number) => (us ? Math.round(kgToLb(kg) * 2) / 2 : kg),
    to: (v: number) => (us ? Math.round(lbToKg(v) * 1000) / 1000 : r2(v)),
    step: (eq: Equipment | undefined, v: number) => (us ? weightStepLb(eq, v) : weightStep(eq, v)),
    fmt: (v: number) => String(r2(v)),
  };
}

/** The smallest sensible jump for a kind of equipment at a given weight. */
export function weightStep(equipment: Equipment | undefined, kg: number): number {
  switch (equipment) {
    case 'dumbbell':
      return kg < 10 ? 1 : 2;
    case 'kettlebell':
      return 4;
    case 'band':
      return 1;
    default:
      return 2.5;
  }
}

interface Session {
  sets: WorkoutSet[];
  /** Heaviest weight used: the working weight (lighter sets are warm-ups). */
  kg: number;
  work: WorkoutSet[];
  targetReps?: number;
}

/** Your most recent sessions of an exercise, newest first. */
function sessionsOf(exerciseId: string, history: Workout[], max = 4): Session[] {
  const sorted = [...history].sort((a, b) => (a.date === b.date ? a.startedAt - b.startedAt : a.date < b.date ? -1 : 1));
  const out: Session[] = [];
  for (let i = sorted.length - 1; i >= 0 && out.length < max; i--) {
    const e = sorted[i].exercises.find((x) => x.exerciseId === exerciseId);
    const sets = e?.sets.filter((s) => s.done && s.reps > 0) ?? [];
    if (!e || !sets.length) continue;
    const kg = Math.max(...sets.map((s) => s.kg));
    out.push({ sets, kg, work: sets.filter((s) => s.kg === kg), targetReps: e.targetReps });
  }
  return out;
}

const hit = (s: Session, target: number) => s.work.every((x) => x.reps >= target);

/**
 * What to try next for an exercise, or null the first time you do it.
 * `targetReps` is the routine's reps per set; `sets` how many sets you'll do.
 */
export function suggestNext(
  exerciseId: string,
  history: Workout[],
  opts: { targetReps?: number; sets?: number; custom?: Exercise[]; units?: UnitSystem } = {},
): Suggestion | null {
  const sessions = sessionsOf(exerciseId, history);
  const last = sessions[0];
  if (!last) return null;
  const ex = findExercise(exerciseId, opts.custom);
  const bodyweight = !!ex?.bodyweight || last.kg <= 0;
  const target = opts.targetReps ?? last.targetReps ?? Math.max(...last.work.map((s) => s.reps));
  const n = Math.max(1, opts.sets ?? last.sets.length);
  const u = scale(opts.units);
  const same = (kg: number, reps: number) => Array.from({ length: n }, () => ({ kg, reps }));
  const repsDone = last.work.map((s) => s.reps).join(', ');

  // Stalls: sessions in a row, newest first, at this weight without hitting the target.
  let stalls = 0;
  for (const s of sessions) {
    if (s.kg !== last.kg || hit(s, target)) break;
    stalls++;
  }

  if (bodyweight) {
    const kg = last.kg > 0 ? last.kg : 0;
    if (hit(last, target)) {
      return { kind: 'increase', step: 0, sets: same(kg, target + 1), reason: `You got ${target} reps on every set last time, so go for ${target + 1}.` };
    }
    if (stalls >= 2) {
      const easier = Math.max(1, target - 2);
      return { kind: 'deload', step: 0, sets: same(kg, easier), reason: `${target} reps didn't come two sessions running. Do ${easier} clean reps per set and build back up.` };
    }
    return { kind: 'repeat', step: 0, sets: same(kg, target), reason: `Last time: ${repsDone} reps. Aim for ${target} on every set before adding more.` };
  }

  // Work in the lifter's units (kg or lb); `step` is reported in kg.
  const cur = u.from(last.kg);
  const stepU = u.step(ex?.equipment, cur);
  const step = r2(u.to(stepU));
  const f = (v: number) => `${u.fmt(v)} ${u.unit}`;
  if (hit(last, target)) {
    return {
      kind: 'increase',
      step,
      sets: same(u.to(cur + stepU), target),
      reason: `You hit ${target} reps on all ${last.work.length} ${last.work.length === 1 ? 'set' : 'sets'} at ${f(cur)} last time, so add ${f(stepU)}.`,
    };
  }
  if (stalls >= 2) {
    const lighter = Math.max(stepU, Math.min(cur - stepU, Math.round((cur * 0.9) / stepU) * stepU));
    return {
      kind: 'deload',
      step,
      sets: same(u.to(lighter), target),
      reason: `${f(cur)} for ${target} reps stalled two sessions running. Drop to ${f(lighter)}, build back up, and you'll pass it.`,
    };
  }
  return {
    kind: 'repeat',
    step,
    sets: same(last.kg, target),
    reason: `Last time: ${repsDone} reps at ${f(cur)}. Stay at ${f(cur)} until every set reaches ${target}.`,
  };
}

/** A new workout's sets filled in with the suggestions (Pro). Exercises you've never done stay as they are. */
export function applySuggestions(w: Workout, history: Workout[], custom: Exercise[] = [], units?: UnitSystem): Workout {
  return {
    ...w,
    exercises: w.exercises.map((e) => {
      const s = suggestNext(e.exerciseId, history, { targetReps: e.targetReps, sets: e.sets.length, custom, units });
      if (!s) return e;
      return { ...e, sets: e.sets.map((set, i) => (set.done ? set : { ...set, kg: s.sets[i]?.kg ?? set.kg, reps: s.sets[i]?.reps ?? set.reps })) };
    }),
  };
}
