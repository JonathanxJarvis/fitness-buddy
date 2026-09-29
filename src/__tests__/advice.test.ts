import { describe, expect, it } from '@jest/globals';
import { personalAdvice } from '@/lib/advice';
import { addDays } from '@/lib/dates';
import type { Workout } from '@/lib/types';

const TODAY = '2026-09-29';
const settings = { units: 'metric' } as never;

const lift = (date: string, exerciseId: string, kg: number, reps = 5, sets = 3): Workout => ({
  id: `${exerciseId}-${date}`,
  date,
  name: 'x',
  startedAt: Date.parse(date + 'T10:00:00Z'),
  endedAt: Date.parse(date + 'T11:00:00Z'),
  exercises: [{ exerciseId, sets: Array.from({ length: sets }, () => ({ kg, reps, done: true })) }],
});

const base = { profile: null, goals: null, weights: {}, settings, customExercises: [] } as never as Parameters<typeof personalAdvice>[0];

describe('personal advice', () => {
  it('invites a new user to start', () => {
    const a = personalAdvice({ ...base, workouts: [] }, TODAY);
    expect(a).toHaveLength(1);
    expect(a[0].id).toBe('start');
  });

  it('flags a long break first', () => {
    const a = personalAdvice({ ...base, workouts: [lift(addDays(TODAY, -9), 'bench-press', 80)] }, TODAY);
    expect(a[0].id).toBe('comeback');
    expect(a[0].title).toContain('9 days');
  });

  it('spots a stalled lift and a rising one', () => {
    const days = [-50, -45, -40, -35, -26, -21, -14, -7, -2];
    const bench = days.map((d) => lift(addDays(TODAY, d), 'bench-press', 80));
    const squat = days.map((d, i) => lift(addDays(TODAY, d), 'squat', 100 + i * 2.5));
    const ids = personalAdvice({ ...base, workouts: [...bench, ...squat] }, TODAY, 10).map((x) => x.id);
    expect(ids).toContain('stall:bench-press');
    expect(ids).toContain('up:squat');
  });

  it('nudges low protein with the real numbers', () => {
    const proteinByDay = Object.fromEntries([1, 2, 3, 4].map((i) => [addDays(TODAY, -i), 110]));
    const a = personalAdvice({ ...base, workouts: [lift(addDays(TODAY, -1), 'squat', 100)], goals: { protein: 170 } as never, proteinByDay }, TODAY);
    const p = a.find((x) => x.id === 'protein');
    expect(p?.body).toContain('110 g of your 170 g');
  });

  it('notices a flat weight on a cut', () => {
    const weights = { [addDays(TODAY, -13)]: 80, [addDays(TODAY, -7)]: 80.4, [addDays(TODAY, -1)]: 80.2 };
    const a = personalAdvice({ ...base, workouts: [lift(addDays(TODAY, -1), 'squat', 100)], profile: { goal: 'lose' } as never, weights }, TODAY);
    expect(a.map((x) => x.id)).toContain('weight-flat');
  });
});
