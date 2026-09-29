import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/exerciseInfo', () => ({
  exerciseInfo: (id: string) =>
    id === 'bench-press'
      ? { primary: ['chest'], secondary: ['triceps', 'front-delts'], cues: [] }
      : id === 'squat'
        ? { primary: ['quads', 'glutes'], secondary: ['lower-back'], cues: [] }
        : { primary: ['biceps'], secondary: [], cues: [] },
}));

import { e1rm, e1rmSessions, liftSummary, mainLifts, muscleSets, volumeStatus, weekStart, weeklyBestE1rm, weeklyMuscleVolume } from '@/lib/stats';
import type { Workout } from '@/lib/types';

const s = (kg: number, reps: number, done = true) => ({ kg, reps, done });
let n = 0;
const w = (date: string, exercises: [string, ReturnType<typeof s>[]][]): Workout => ({
  id: `w${n++}`,
  date,
  name: 'W',
  startedAt: Date.parse(`${date}T10:00:00`),
  exercises: exercises.map(([exerciseId, sets]) => ({ exerciseId, sets })),
});

describe('e1rm', () => {
  it('uses Epley and ignores sets it cannot read', () => {
    expect(e1rm(100, 1)).toBe(100);
    expect(e1rm(100, 5)).toBeCloseTo(116.67, 1);
    expect(e1rm(100, 10)).toBeCloseTo(133.33, 1);
    expect(e1rm(0, 10)).toBe(0);
    expect(e1rm(60, 15)).toBe(0);
  });

  it('weeks start on Monday', () => {
    expect(weekStart('2026-09-29')).toBe('2026-09-28'); // Tuesday
    expect(weekStart('2026-09-28')).toBe('2026-09-28');
    expect(weekStart('2026-10-04')).toBe('2026-09-28'); // Sunday
  });

  it('takes the best done set per session and per week', () => {
    const ws = [
      w('2026-09-01', [['bench-press', [s(80, 5), s(90, 1), s(100, 3, false)]]]),
      w('2026-09-03', [['bench-press', [s(82.5, 5)]]]),
      w('2026-09-10', [['bench-press', [s(85, 5)]], ['squat', [s(120, 5)]]]),
    ];
    const sessions = e1rmSessions('bench-press', ws);
    expect(sessions.map((x) => x.date)).toEqual(['2026-09-01', '2026-09-03', '2026-09-10']);
    expect(sessions[0].e1rm).toBeCloseTo(93.33, 1);
    const weekly = weeklyBestE1rm('bench-press', ws, '2026-08-01', '2026-09-30');
    expect(weekly.map((x) => x.week)).toEqual(['2026-08-31', '2026-09-07']);
    expect(weekly[0].e1rm).toBeCloseTo(96.25, 1);
    expect(weeklyBestE1rm('bench-press', ws, '2026-09-05', '2026-09-30')).toHaveLength(1);
  });

  it('ranks main lifts: headline lifts first, then by frequency', () => {
    const ws = [
      w('2026-09-01', [['curl', [s(15, 10)]], ['bench-press', [s(80, 5)]]]),
      w('2026-09-02', [['curl', [s(15, 10)]], ['bench-press', [s(80, 5)]], ['squat', [s(100, 5)]]]),
      w('2026-09-03', [['curl', [s(15, 10)]]]),
    ];
    expect(mainLifts(ws, '2026-08-01')).toEqual(['bench-press', 'curl']);
    expect(mainLifts(ws, '2026-08-01', 6, 1)).toEqual(['squat', 'bench-press', 'curl']);
  });

  it('compares the last 4 weeks with the 4 before', () => {
    const ws = [
      w('2026-08-10', [['bench-press', [s(80, 5)]]]),
      w('2026-09-20', [['bench-press', [s(85, 5)]]]),
    ];
    const sum = liftSummary('bench-press', ws, '2026-09-29')!;
    expect(sum.current).toBeCloseTo(99.17, 1);
    expect(sum.before).toBeCloseTo(93.33, 1);
    expect(sum.change).toBeCloseTo(5.83, 1);
    // Nothing recent: shows the last known number with no change.
    const old = liftSummary('bench-press', ws.slice(0, 1), '2026-09-29')!;
    expect(old.change).toBeUndefined();
    expect(old.current).toBeCloseTo(93.33, 1);
    expect(liftSummary('squat', ws, '2026-09-29')).toBeUndefined();
  });
});

describe('weekly sets per muscle', () => {
  it('counts primary 1 and secondary 0.5 per done set', () => {
    const sets = muscleSets(w('2026-09-01', [['bench-press', [s(80, 5), s(80, 5), s(80, 5, false)]]]));
    expect(sets).toEqual({ chest: 2, triceps: 1, 'front-delts': 1 });
  });

  it('reads under, in range and over', () => {
    expect(volumeStatus(9.5)).toBe('under');
    expect(volumeStatus(10)).toBe('in');
    expect(volumeStatus(20)).toBe('in');
    expect(volumeStatus(21)).toBe('over');
  });

  it('averages full weeks since you started and keeps this week apart', () => {
    const five = Array.from({ length: 6 }, () => s(80, 5));
    const ws = [
      w('2026-09-14', [['bench-press', five]]), // week of Sep 14
      w('2026-09-16', [['bench-press', five]]),
      w('2026-09-22', [['bench-press', five]]), // week of Sep 21
      w('2026-09-29', [['squat', [s(100, 5), s(100, 5)]]]), // this week
    ];
    const v = weeklyMuscleVolume(ws, '2026-09-29');
    expect(v.weeks).toHaveLength(8);
    expect(v.weeks[7]).toBe('2026-09-21');
    expect(v.weeksCounted).toBe(2);
    const chest = v.muscles.find((m) => m.region === 'chest')!;
    expect(chest.perWeek.slice(-2)).toEqual([12, 6]);
    expect(chest.average).toBe(9);
    expect(chest.status).toBe('under');
    const quads = v.muscles.find((m) => m.region === 'quads')!;
    expect(quads.average).toBe(0);
    expect(quads.thisWeek).toBe(2);
    expect(v.untrained).toContain('calves');
    expect(v.muscles[0].region).toBe('chest');
  });
});
