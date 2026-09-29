import { describe, expect, it } from '@jest/globals';
import { EXERCISE_LIBRARY } from '@/lib/training';
import { EXERCISE_INFO, REGION_LABEL, exerciseInfo, libraryMatch, workoutMuscles } from '@/lib/exerciseInfo';
import type { Exercise } from '@/lib/types';

describe('exercise info', () => {
  it('covers every library exercise with muscles and cues', () => {
    for (const e of EXERCISE_LIBRARY) {
      const i = exerciseInfo(e.id);
      expect(EXERCISE_INFO[e.id]).toBeDefined();
      expect(i.primary.length).toBeGreaterThan(0);
      expect(i.cues.length).toBeGreaterThanOrEqual(2);
      expect(i.cues.length).toBeLessThanOrEqual(4);
      for (const m of [...i.primary, ...i.secondary]) expect(REGION_LABEL[m]).toBeDefined();
      expect(i.secondary.filter((m) => i.primary.includes(m))).toEqual([]);
    }
  });

  it('falls back sensibly for custom exercises', () => {
    const custom: Exercise[] = [
      { id: 'c1', name: 'Incline hammer curl', muscle: 'arms', equipment: 'dumbbell' },
      { id: 'c2', name: 'Sled push', muscle: 'legs', equipment: 'machine' },
      { id: 'c3', name: 'Rowing', muscle: 'cardio', equipment: 'cardio' },
    ];
    expect(exerciseInfo('c1', custom).primary).toContain('forearms');
    expect(exerciseInfo('c2', custom).primary).toEqual(['quads', 'hamstrings']);
    expect(libraryMatch(custom[2])).toBeUndefined();
    expect(exerciseInfo('nope').primary).toEqual([]);
  });

  it('merges a workout: primary anywhere wins, secondary excludes primaries', () => {
    // bench: chest | front-delts, triceps; dip: chest, triceps | front-delts; ohp: front-delts | side-delts, triceps, traps
    const m = workoutMuscles(['bench-press', 'dip', 'ohp']);
    expect(m.primary).toEqual(['chest', 'triceps', 'front-delts']);
    expect(m.secondary).toEqual(['side-delts', 'traps']);
    expect(workoutMuscles([])).toEqual({ primary: [], secondary: [] });
    expect(workoutMuscles(['squat', 'squat']).primary).toEqual(['quads', 'glutes']);
  });
});
