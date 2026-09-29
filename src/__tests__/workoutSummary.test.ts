import { describe, expect, it, jest } from '@jest/globals';

// Deterministic muscle data, independent of the real exercise info table.
jest.mock('@/lib/exerciseInfo', () => ({
  exerciseInfo: (id: string) =>
    id === 'bench-press'
      ? { primary: ['chest'], secondary: ['triceps', 'front-delts'], cues: [] }
      : id === 'tricep-pushdown'
        ? { primary: ['triceps'], secondary: [], cues: [] }
        : { primary: ['quads'], secondary: ['glutes'], cues: [] },
}));

import { bestSet, compareWorkouts, exerciseSessions, previousSameWorkout, totalReps, workoutMuscleRegions } from '@/lib/workoutSummary';
import { defaultWorkoutName, workoutWithExercises } from '@/lib/training';
import type { Workout } from '@/lib/types';

const t0 = Date.UTC(2026, 8, 20, 8);
const s = (kg: number, reps: number, done = true) => ({ kg, reps, done });
const w = (id: string, day: number, name: string, exercises: Workout['exercises'], minutes = 60): Workout => ({
  id,
  date: `2026-09-${String(day).padStart(2, '0')}`,
  name,
  startedAt: t0 + day * 86400000,
  endedAt: t0 + day * 86400000 + minutes * 60000,
  exercises,
});

describe('workout summary', () => {
  it('picks the strongest done set and counts reps', () => {
    const sets = [s(60, 10), s(70, 5), s(80, 1, false)];
    expect(bestSet(sets)).toEqual(s(70, 5));
    expect(bestSet([s(0, 12), s(0, 15)])?.reps).toBe(15);
    expect(bestSet([s(50, 5, false)])).toBeUndefined();
    expect(totalReps(w('a', 1, 'Push', [{ exerciseId: 'bench-press', sets }]))).toBe(15);
  });

  it('merges muscles: primary anywhere wins over secondary', () => {
    const m = workoutMuscleRegions(
      w('a', 1, 'Push', [
        { exerciseId: 'bench-press', sets: [s(60, 10), s(60, 10)] },
        { exerciseId: 'tricep-pushdown', sets: [s(20, 12)] },
      ]),
    );
    expect(m.primary).toEqual(['chest', 'triceps']);
    expect(m.secondary).toEqual(['front-delts']);
  });

  it('compares with the last workout of the same name', () => {
    const a = w('a', 1, 'Push', [{ exerciseId: 'bench-press', sets: [s(60, 10)] }], 50);
    const other = w('b', 2, 'Legs', [{ exerciseId: 'squat', sets: [s(100, 5)] }]);
    const c = w('c', 3, 'push ', [{ exerciseId: 'bench-press', sets: [s(60, 10), s(65, 8)] }], 55);
    expect(previousSameWorkout(c, [a, other, c])?.id).toBe('a');
    expect(previousSameWorkout(a, [a, other, c])).toBeUndefined();
    expect(compareWorkouts(c, a)).toEqual({ volume: 520, sets: 1, minutes: 5 });
  });

  it('lists an exercise’s sessions newest first with done sets only', () => {
    const a = w('a', 1, 'Push', [{ exerciseId: 'bench-press', sets: [s(60, 10), s(60, 8, false)] }]);
    const b = w('b', 4, 'Push', [{ exerciseId: 'bench-press', sets: [s(62.5, 8)] }]);
    const list = exerciseSessions('bench-press', [a, b]);
    expect(list.map((x) => x.workoutId)).toEqual(['b', 'a']);
    expect(list[1].sets).toHaveLength(1);
  });

  it('starts an empty workout with the chosen exercises pre-filled from history', () => {
    const history = [w('a', 1, 'Push', [{ exerciseId: 'bench-press', sets: [s(60, 10), s(60, 8)] }])];
    const now = new Date(2026, 8, 28, 18, 0).getTime();
    const x = workoutWithExercises(['bench-press', 'squat'], history, 'n', '2026-09-28', now);
    expect(x.name).toBe('Evening workout');
    expect(x.exercises.map((e) => e.exerciseId)).toEqual(['bench-press', 'squat']);
    expect(x.exercises[0].sets).toEqual([s(60, 10, false), s(60, 8, false)]);
    expect(x.exercises[1].sets).toHaveLength(3);
    expect(defaultWorkoutName(new Date(2026, 8, 28, 7))).toBe('Morning workout');
  });
});
