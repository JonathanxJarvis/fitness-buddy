import { describe, expect, it } from '@jest/globals';
import {
  EXERCISE_LIBRARY,
  countPRs,
  doneSets,
  newBlock,
  oneRepMax,
  personalRecords,
  prExercises,
  previousSets,
  routineFromWorkout,
  TEMPLATES,
  workoutCalories,
  workoutFromRoutine,
  workoutVolume,
} from '@/lib/training';
import { reducer, initialState } from '@/store/reducer';
import type { Workout } from '@/lib/types';

const t0 = Date.UTC(2026, 8, 20, 8);
const bench = (kg: number, reps: number, done = true) => ({ kg, reps, done });
const workout = (id: string, day: number, sets: { kg: number; reps: number; done: boolean }[], exerciseId = 'bench-press'): Workout => ({
  id,
  date: `2026-09-${String(day).padStart(2, '0')}`,
  name: 'Push',
  startedAt: t0 + day * 86400000,
  endedAt: t0 + day * 86400000 + 60 * 60000,
  exercises: [{ exerciseId, sets }],
});

describe('training math', () => {
  it('has unique exercise ids and templates that reference real exercises', () => {
    const ids = EXERCISE_LIBRARY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TEMPLATES) for (const x of t.exercises) expect(ids).toContain(x.exerciseId);
  });

  it('estimates one-rep max with Epley', () => {
    expect(oneRepMax(100, 1)).toBe(100);
    expect(oneRepMax(100, 10)).toBeCloseTo(133.33, 1);
    expect(oneRepMax(0, 5)).toBe(0);
  });

  it('counts only completed sets toward volume', () => {
    const w = workout('a', 1, [bench(60, 10), bench(60, 8), bench(60, 8, false)]);
    expect(workoutVolume(w)).toBe(1080);
    expect(doneSets(w)).toBe(2);
  });

  it('estimates calories from session length and body weight', () => {
    // 1 h at 5 METs for an 80 kg lifter.
    expect(workoutCalories(workout('a', 1, [bench(60, 10)]), 80)).toBe(400);
  });

  it('finds PRs only when an earlier best is beaten', () => {
    const first = workout('a', 1, [bench(60, 10)]);
    const same = workout('b', 2, [bench(60, 10)]);
    const better = workout('c', 3, [bench(65, 10)]);
    expect(countPRs(first, [])).toBe(0); // first attempt is a baseline, not a PR
    expect(prExercises(same, [first])).toEqual([]);
    expect(prExercises(better, [first, same])).toEqual(['bench-press']);
    expect(personalRecords([first, same, better])['bench-press'].kg).toBe(65);
  });

  it('pre-fills a new block from the last session', () => {
    const history = [workout('a', 1, [bench(60, 10), bench(62.5, 8), bench(0, 0, false)])];
    expect(previousSets('bench-press', history)).toHaveLength(2);
    const b = newBlock('bench-press', history);
    expect(b.sets).toEqual([bench(60, 10, false), bench(62.5, 8, false)]);
    expect(newBlock('squat', history, 4, 6).sets).toHaveLength(4);
  });

  it('builds a workout from a routine with the routine set count', () => {
    const history = [workout('a', 1, [bench(60, 10)])];
    const w = workoutFromRoutine({ id: 'r', name: 'Push', exercises: [{ exerciseId: 'bench-press', sets: 3, reps: 8 }] }, history, 'n', '2026-09-28', t0);
    expect(w.exercises[0].sets).toHaveLength(3);
    expect(w.exercises[0].sets.every((s) => s.kg === 60 && !s.done)).toBe(true);
    expect(routineFromWorkout(w, 'r2').exercises[0]).toEqual({ exerciseId: 'bench-press', sets: 3, reps: 10 });
  });
});

describe('workout reducer', () => {
  it('finishing a workout records it and counts its calories for the day', () => {
    const w = { ...workout('w1', 5, [bench(60, 10)]), calories: 300 };
    let s = reducer(initialState, { type: 'setActiveWorkout', workout: w });
    expect(s.activeWorkout?.id).toBe('w1');
    s = reducer(s, { type: 'finishWorkout', workout: w });
    expect(s.activeWorkout).toBeNull();
    expect(s.workouts).toHaveLength(1);
    expect(s.exercises.find((e) => e.id === 'w1')?.calories).toBe(300);
    s = reducer(s, { type: 'deleteWorkout', id: 'w1' });
    expect(s.workouts).toHaveLength(0);
    expect(s.exercises.find((e) => e.id === 'w1')).toBeUndefined();
  });
});
