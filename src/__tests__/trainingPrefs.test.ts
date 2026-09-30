import { describe, expect, it } from '@jest/globals';
import { SESSIONS, planFromSplit } from '@/lib/plan';
import { findExercise } from '@/lib/training';
import { fitsPlace, planRoutineChanges, restForGoal, swapForPlace, tuneRoutine } from '@/lib/trainingPrefs';
import type { Routine } from '@/lib/types';

const session = (id: string) => SESSIONS.find((s) => s.id === id)!.routine;
const equipment = (r: Routine) => r.exercises.map((x) => findExercise(x.exerciseId)!.equipment);

describe('training preferences', () => {
  it('filters exercises by where you train', () => {
    expect(fitsPlace('bench-press', 'gym')).toBe(true);
    expect(fitsPlace('bench-press', 'home')).toBe(false);
    expect(fitsPlace('db-bench', 'home')).toBe(true);
    expect(fitsPlace('db-bench', 'bodyweight')).toBe(false);
    expect(fitsPlace('push-up', 'bodyweight')).toBe(true);
    expect(fitsPlace('lunge', 'bodyweight')).toBe(true);
  });

  it('swaps to the closest fitting exercise and skips ones already used', () => {
    expect(swapForPlace('bench-press', 'home')).toBe('db-bench');
    expect(swapForPlace('bench-press', 'bodyweight')).toBe('push-up');
    expect(swapForPlace('barbell-row', 'bodyweight', new Set(['pull-up']))).toBe('chin-up');
    expect(swapForPlace('squat', 'gym')).toBe('squat');
  });

  it('never gives home or bodyweight plans barbell, machine or cable work', () => {
    for (const s of SESSIONS) {
      expect(equipment(tuneRoutine(s.routine, { place: 'home' })).every((e) => e === 'dumbbell' || e === 'bodyweight')).toBe(true);
      const bw = tuneRoutine(s.routine, { place: 'bodyweight' });
      expect(bw.exercises.length).toBeGreaterThan(0);
      expect(bw.exercises.every((x) => fitsPlace(x.exerciseId, 'bodyweight'))).toBe(true);
      expect(new Set(bw.exercises.map((x) => x.exerciseId)).size).toBe(bw.exercises.length);
    }
  });

  it('sets reps by goal and trims to the session length', () => {
    const strong = tuneRoutine(session('push'), { goal: 'strength' });
    expect(strong.exercises[0]).toMatchObject({ exerciseId: 'bench-press', sets: 4, reps: 5 });
    const fat = tuneRoutine(session('push'), { goal: 'fat' });
    expect(fat.exercises.every((x) => x.reps >= 12 && x.sets <= 3)).toBe(true);
    expect(tuneRoutine(session('push'), { minutes: 30 }).exercises).toHaveLength(3);
    expect(tuneRoutine(session('push'), {})).toEqual(session('push'));
    expect(restForGoal('strength')).toBeGreaterThan(restForGoal('fat')!);
  });

  it('saves tuned plan workouts without touching your own routines', () => {
    const plan = planFromSplit('ppl', '2026-09-28');
    const own: Routine = { id: 'mine', name: 'Pull', exercises: [{ exerciseId: 'deadlift', sets: 5, reps: 5 }] };
    const { save, remove } = planRoutineChanges({ plan, routines: [own] }, { place: 'home' });
    expect(save.map((r) => r.name).sort()).toEqual(['Legs', 'Push']);
    expect(remove).toEqual([]);
    expect(planRoutineChanges({ plan, routines: [own] }, {}).save).toEqual([]);

    const back = planRoutineChanges({ plan, routines: save }, { place: 'gym' });
    expect(back.save).toEqual([]);
    expect(back.remove.sort()).toEqual(save.map((r) => r.id).sort());
  });
});
