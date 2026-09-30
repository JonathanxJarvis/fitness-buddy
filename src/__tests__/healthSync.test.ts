import { describe, expect, it } from '@jest/globals';
import {
  HEALTH_EXERCISE_PREFIX,
  activityName,
  stepUpdates,
  trimDays,
  weightExports,
  weightImports,
  workoutExports,
  workoutImports,
  type HealthWorkout,
} from '@/lib/healthSync';
import type { ExerciseEntry, Workout } from '@/lib/types';

const OWN = 'com.jonathanxjarvis.fitnessbuddy';
const t = (day: number, h: number, m = 0) => new Date(2026, 8, day, h, m).getTime();

describe('steps', () => {
  it('only raises days where Health has more steps than the phone pedometer', () => {
    expect(stepUpdates({ '2026-09-28': 9000, '2026-09-29': 3000 }, { '2026-09-27': 5000.4, '2026-09-28': 8000, '2026-09-29': 4200, '2026-09-26': 0 })).toEqual([
      { date: '2026-09-27', steps: 5000 },
      { date: '2026-09-29', steps: 4200 },
    ]);
  });
  it('is idempotent once imported', () => {
    const health = { '2026-09-29': 4200 };
    expect(stepUpdates(health, health)).toEqual([]);
  });
});

describe('weight import', () => {
  const sample = (uuid: string, at: number, kg: number, source = 'com.withings.wiScaleNG') => ({ uuid, at, kg, source });

  it('takes the latest reading per day and skips our own samples', () => {
    const out = weightImports(
      [sample('a', t(27, 7), 80.04), sample('b', t(27, 21), 81.26), sample('c', t(28, 7), 79.9, OWN), sample('d', t(29, 7), 79.5)],
      {},
      {},
      OWN,
    );
    expect(out).toEqual([
      { date: '2026-09-27', kg: 81.3 },
      { date: '2026-09-29', kg: 79.5 },
    ]);
  });

  it('never overwrites a weight logged by hand in the app', () => {
    expect(weightImports([sample('a', t(29, 7), 79.5)], { '2026-09-29': 80 }, {}, OWN)).toEqual([]);
    // Edited after an earlier import: still the user's value.
    expect(weightImports([sample('a', t(29, 7), 79.5)], { '2026-09-29': 80 }, { '2026-09-29': 79 }, OWN)).toEqual([]);
  });

  it('updates a day it imported before when Health has a newer value, and does nothing when unchanged', () => {
    expect(weightImports([sample('a', t(29, 7), 79.5)], { '2026-09-29': 79 }, { '2026-09-29': 79 }, OWN)).toEqual([{ date: '2026-09-29', kg: 79.5 }]);
    expect(weightImports([sample('a', t(29, 7), 79.5)], { '2026-09-29': 79.5 }, { '2026-09-29': 79.5 }, OWN)).toEqual([]);
  });

  it('exports app weigh-ins since connecting, once, and not imported ones', () => {
    const meta = { connectedAt: t(28, 12), importedWeights: { '2026-09-28': 80 }, exportedWeights: { '2026-09-29': 79.4 } };
    expect(weightExports({ '2026-09-20': 82, '2026-09-28': 80, '2026-09-29': 79.4, '2026-09-30': 79.1 }, meta)).toEqual([{ date: '2026-09-30', kg: 79.1 }]);
    // Changed after writing: written again with the new value.
    expect(weightExports({ '2026-09-29': 79.0 }, meta)).toEqual([{ date: '2026-09-29', kg: 79.0 }]);
    expect(weightExports({ '2026-09-29': 79 }, { ...meta, connectedAt: undefined })).toEqual([]);
  });
});

describe('workouts', () => {
  const hw = (uuid: string, start: number, end: number, extra: Partial<HealthWorkout> = {}): HealthWorkout => ({
    uuid, start, end, activityType: 37, kcal: 300.4, source: 'com.apple.health.watch', ...extra,
  });
  const appWorkout: Workout = { id: 'w1', date: '2026-09-29', name: 'Push', startedAt: t(29, 18), endedAt: t(29, 19), exercises: [], calories: 250 };

  it('imports workouts from other apps as exercise entries', () => {
    expect(workoutImports([hw('run', t(29, 7), t(29, 7, 45))], [], [], OWN)).toEqual([
      { id: `${HEALTH_EXERCISE_PREFIX}run`, date: '2026-09-29', name: 'Running (Apple Health)', minutes: 45, calories: 300 },
    ]);
  });

  it('skips already imported, own, echoed and overlapping workouts', () => {
    const existing: ExerciseEntry[] = [{ id: `${HEALTH_EXERCISE_PREFIX}run`, date: '2026-09-29', name: 'Running', minutes: 45, calories: 300 }];
    const out = workoutImports(
      [
        hw('run', t(29, 7), t(29, 7, 45)),
        hw('mine', t(29, 18), t(29, 19), { source: OWN }),
        hw('echo', t(28, 18), t(28, 19), { externalId: 'w1' }),
        hw('watch-lift', t(29, 18, 5), t(29, 19, 5), { activityType: 50 }),
        hw('dup', t(29, 12), t(29, 12, 30)),
        hw('dup', t(29, 12), t(29, 12, 30)),
      ],
      existing,
      [appWorkout],
      OWN,
    );
    expect(out.map((e) => e.id)).toEqual([`${HEALTH_EXERCISE_PREFIX}dup`]);
  });

  it('exports finished workouts after connecting, once', () => {
    const older = { ...appWorkout, id: 'w0', startedAt: t(20, 18), endedAt: t(20, 19) };
    const active = { ...appWorkout, id: 'w2', endedAt: undefined };
    const meta = { connectedAt: t(25, 0), exportedWorkouts: [] as string[] };
    expect(workoutExports([older, appWorkout, active], meta).map((w) => w.id)).toEqual(['w1']);
    expect(workoutExports([older, appWorkout], { ...meta, exportedWorkouts: ['w1'] })).toEqual([]);
    expect(workoutExports([appWorkout], { exportedWorkouts: [] })).toEqual([]);
  });

  it('names activity types', () => {
    expect(activityName(50)).toBe('Strength training');
    expect(activityName(9999)).toBe('Workout');
  });
});

it('trims old days', () => {
  expect(trimDays({ '2026-07-01': 1, '2026-09-01': 2, '2026-09-29': 3 }, '2026-09-29', 60)).toEqual({ '2026-09-01': 2, '2026-09-29': 3 });
});
