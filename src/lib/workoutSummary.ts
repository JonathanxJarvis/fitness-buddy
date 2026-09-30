import { exerciseInfo, type MuscleRegion } from './exerciseInfo';
import { doneSets, durationMinutes, oneRepMax, workoutVolume } from './training';
import type { Exercise, Workout, WorkoutSet } from './types';

/*
 * Numbers for the post-workout summary, the history view and the exercise
 * detail screen. Pure functions so they're easy to test.
 */

/** Strength of a set for "best set": estimated 1RM, or reps when there's no weight. */
export const setScore = (s: Pick<WorkoutSet, 'kg' | 'reps'>) => (s.kg > 0 ? oneRepMax(s.kg, s.reps) : s.reps);

/** The strongest completed set, or undefined when none are done. */
export function bestSet(sets: WorkoutSet[]): WorkoutSet | undefined {
  let best: WorkoutSet | undefined;
  for (const s of sets) if (s.done && (!best || setScore(s) > setScore(best))) best = s;
  return best;
}

export function totalReps(w: Workout): number {
  return w.exercises.reduce((n, e) => n + e.sets.reduce((a, s) => a + (s.done ? s.reps : 0), 0), 0);
}

/**
 * Muscles a workout trained. A region is primary when it's a main mover in any
 * exercise, secondary when it only ever helps. Ordered by how many sets hit it.
 */
export function workoutMuscleRegions(w: Workout, custom: Exercise[] = []): { primary: MuscleRegion[]; secondary: MuscleRegion[] } {
  const primary = new Map<MuscleRegion, number>();
  const secondary = new Map<MuscleRegion, number>();
  // A finished workout counts done sets; a plan (nothing done yet) counts every exercise.
  const anyDone = doneSets(w) > 0;
  for (const e of w.exercises) {
    const n = anyDone ? e.sets.filter((s) => s.done).length : Math.max(1, e.sets.length);
    if (!n) continue;
    const info = exerciseInfo(e.exerciseId, custom);
    for (const r of info.primary) primary.set(r, (primary.get(r) ?? 0) + n);
    for (const r of info.secondary) secondary.set(r, (secondary.get(r) ?? 0) + n);
  }
  const order = (m: Map<MuscleRegion, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([r]) => r);
  return { primary: order(primary), secondary: order(secondary).filter((r) => !primary.has(r)) };
}

/** The last finished workout with the same name before this one (for "vs last time"). */
export function previousSameWorkout(w: Workout, workouts: Workout[]): Workout | undefined {
  const name = w.name.trim().toLowerCase();
  let out: Workout | undefined;
  for (const x of workouts) {
    if (x.id === w.id || x.startedAt >= w.startedAt || x.name.trim().toLowerCase() !== name || !doneSets(x)) continue;
    if (!out || x.startedAt > out.startedAt) out = x;
  }
  return out;
}

export interface Comparison {
  volume: number;
  sets: number;
  minutes: number;
}

/** This workout minus the earlier one. */
export function compareWorkouts(w: Workout, prev: Workout): Comparison {
  return {
    volume: workoutVolume(w) - workoutVolume(prev),
    sets: doneSets(w) - doneSets(prev),
    minutes: durationMinutes(w) - durationMinutes(prev),
  };
}

export interface ExerciseSession {
  workoutId: string;
  workoutName: string;
  date: string;
  startedAt: number;
  sets: WorkoutSet[];
}

/** Every finished session of one exercise, newest first. */
export function exerciseSessions(exerciseId: string, workouts: Workout[]): ExerciseSession[] {
  const out: ExerciseSession[] = [];
  for (const w of workouts) {
    for (const e of w.exercises) {
      if (e.exerciseId !== exerciseId) continue;
      const sets = e.sets.filter((s) => s.done);
      if (sets.length) out.push({ workoutId: w.id, workoutName: w.name, date: w.date, startedAt: w.startedAt, sets });
    }
  }
  return out.sort((a, b) => b.startedAt - a.startedAt);
}
