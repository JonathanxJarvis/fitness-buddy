import { describe, expect, it } from '@jest/globals';
import { applySuggestions, suggestNext, weightStep } from '@/lib/progression-suggest';
import { workoutFromRoutine } from '@/lib/training';
import { kgToLb, lbToKg } from '@/lib/units';
import type { Workout } from '@/lib/types';

let n = 0;
const session = (date: string, exerciseId: string, sets: [number, number][], targetReps?: number): Workout => ({
  id: `w${n++}`,
  date,
  name: 'Push',
  startedAt: Date.parse(date + 'T10:00:00Z'),
  endedAt: Date.parse(date + 'T11:00:00Z'),
  exercises: [{ exerciseId, targetReps, sets: sets.map(([kg, reps]) => ({ kg, reps, done: true })) }],
});

describe('smart progression', () => {
  it('suggests nothing the first time', () => {
    expect(suggestNext('bench-press', [])).toBeNull();
  });

  it('adds 2.5 kg on a barbell after hitting the target on every set', () => {
    const s = suggestNext('bench-press', [session('2026-09-20', 'bench-press', [[60, 8], [60, 8], [60, 9]])], { targetReps: 8, sets: 3 })!;
    expect(s.kind).toBe('increase');
    expect(s.sets).toEqual([{ kg: 62.5, reps: 8 }, { kg: 62.5, reps: 8 }, { kg: 62.5, reps: 8 }]);
    expect(s.reason).toMatch(/add 2.5 kg/);
  });

  it('ignores lighter warm-up sets', () => {
    const s = suggestNext('squat', [session('2026-09-20', 'squat', [[40, 10], [80, 5], [80, 5]])], { targetReps: 5 })!;
    expect(s.kind).toBe('increase');
    expect(s.sets[0].kg).toBe(82.5);
  });

  it('uses small dumbbell steps', () => {
    expect(weightStep('dumbbell', 8)).toBe(1);
    expect(weightStep('dumbbell', 20)).toBe(2);
    const s = suggestNext('lateral-raise', [session('2026-09-20', 'lateral-raise', [[8, 15], [8, 15]])], { targetReps: 15 })!;
    expect(s.sets[0]).toEqual({ kg: 9, reps: 15 });
  });

  it('adds a rep on bodyweight exercises', () => {
    const s = suggestNext('pull-up', [session('2026-09-20', 'pull-up', [[0, 8], [0, 8], [0, 8]])], { targetReps: 8 })!;
    expect(s.kind).toBe('increase');
    expect(s.sets.every((x) => x.kg === 0 && x.reps === 9)).toBe(true);
  });

  it('repeats the weight after missing reps', () => {
    const s = suggestNext('bench-press', [session('2026-09-20', 'bench-press', [[62.5, 8], [62.5, 7], [62.5, 6]])], { targetReps: 8 })!;
    expect(s.kind).toBe('repeat');
    expect(s.sets[0]).toEqual({ kg: 62.5, reps: 8 });
    expect(s.reason).toMatch(/8, 7, 6/);
  });

  it('deloads about 10% after two stalls at the same weight', () => {
    const history = [
      session('2026-09-10', 'bench-press', [[60, 8], [60, 8], [60, 8]]),
      session('2026-09-14', 'bench-press', [[62.5, 8], [62.5, 7], [62.5, 6]]),
      session('2026-09-18', 'bench-press', [[62.5, 8], [62.5, 7], [62.5, 7]]),
    ];
    const s = suggestNext('bench-press', history, { targetReps: 8 })!;
    expect(s.kind).toBe('deload');
    expect(s.sets[0]).toEqual({ kg: 57.5, reps: 8 });
    // One stall only: repeat.
    expect(suggestNext('bench-press', history.slice(0, 2), { targetReps: 8 })!.kind).toBe('repeat');
  });

  it('reads the target the routine set last time when none is given', () => {
    const s = suggestNext('ohp', [session('2026-09-20', 'ohp', [[40, 10], [40, 10], [40, 9]], 8)])!;
    expect(s.kind).toBe('increase');
    expect(s.sets[0]).toEqual({ kg: 42.5, reps: 8 });
  });

  it('fills a started routine with the suggestions', () => {
    const history = [session('2026-09-20', 'bench-press', [[60, 8], [60, 8], [60, 8]])];
    const w = workoutFromRoutine({ id: 'r', name: 'Push', exercises: [{ exerciseId: 'bench-press', sets: 3, reps: 8 }, { exerciseId: 'dip', sets: 2, reps: 10 }] }, history, 'n', '2026-09-28');
    expect(w.exercises[0].targetReps).toBe(8);
    const filled = applySuggestions(w, history);
    expect(filled.exercises[0].sets.map((x) => [x.kg, x.reps, x.done])).toEqual([[62.5, 8, false], [62.5, 8, false], [62.5, 8, false]]);
    // Never done before: left as it was.
    expect(filled.exercises[1]).toEqual(w.exercises[1]);
  });

  it('steps in pounds for US lifters', () => {
    const s = suggestNext('bench-press', [session('2026-09-20', 'bench-press', [[lbToKg(135), 8], [lbToKg(135), 8]])], { targetReps: 8, units: 'us' })!;
    expect(s.kind).toBe('increase');
    expect(Number(kgToLb(s.sets[0].kg).toFixed(1))).toBe(140);
    expect(s.reason).toMatch(/135 lb.*add 5 lb/);
  });
});
