import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/exerciseInfo', () => ({
  REGION_LABEL: { chest: 'Chest', triceps: 'Triceps', 'front-delts': 'Front delts', quads: 'Quads', glutes: 'Glutes', lats: 'Lats', biceps: 'Biceps' },
  exerciseInfo: (id: string) =>
    id === 'bench-press'
      ? { primary: ['chest'], secondary: ['triceps', 'front-delts'], cues: [] }
      : id === 'squat'
        ? { primary: ['quads', 'glutes'], secondary: [], cues: [] }
        : id === 'row'
          ? { primary: ['lats'], secondary: ['biceps'], cues: [] }
          : { primary: [], secondary: [], cues: [] },
}));

import { classify, isAre, muscleRecovery, rankSessions, readyLabel, regionList, sessionFit } from '@/lib/recovery';
import type { Workout } from '@/lib/types';

const H = 3600_000;
const now = Date.UTC(2026, 8, 29, 18);
const sets = (n: number, done = true) => Array.from({ length: n }, () => ({ kg: 60, reps: 8, done }));
const w = (hoursAgo: number, ex: [string, number][]): Workout => ({
  id: `w${hoursAgo}`,
  date: '2026-09-29',
  name: 'W',
  startedAt: now - hoursAgo * H - H,
  endedAt: now - hoursAgo * H,
  exercises: ex.map(([exerciseId, n]) => ({ exerciseId, sets: sets(n) })),
});

describe('recovery', () => {
  it('classifies by effective sets', () => {
    expect(classify(0)).toBe('fresh');
    expect(classify(1.9)).toBe('fresh');
    expect(classify(2)).toBe('recovering');
    expect(classify(5)).toBe('tired');
  });

  it('fades fatigue over each muscle\'s window', () => {
    const rec = muscleRecovery([w(24, [['bench-press', 9]])], now);
    // chest: 9 × (1 − 24/72) = 6 → tired
    expect(rec.chest.fatigue).toBeCloseTo(6, 5);
    expect(rec.chest.state).toBe('tired');
    // triceps: 4.5 × (1 − 24/48) = 2.25 → recovering, ready in about 3 h
    expect(rec.triceps.fatigue).toBeCloseTo(2.25, 5);
    expect(rec.triceps.state).toBe('recovering');
    expect(rec.triceps.readyInHours).toBe(3);
    expect(rec.quads.state).toBe('fresh');
    expect(rec.quads.readyInHours).toBe(0);
    // chest drops under 2 once 9 × (1 − h/72) < 2 → h > 56, so 33 more hours
    expect(rec.chest.readyInHours).toBe(33);
  });

  it('ignores old, future and unfinished sets and stacks sessions', () => {
    const rec = muscleRecovery([w(80, [['squat', 10]]), w(-5, [['squat', 10]]), { ...w(1, [['squat', 0]]), id: 'x' }], now);
    expect(rec.quads.fatigue).toBe(0);
    const stacked = muscleRecovery([w(48, [['squat', 6]]), w(12, [['squat', 3]])], now);
    // 6 × (1/3) + 3 × (60/72) = 2 + 2.5
    expect(stacked.quads.fatigue).toBeCloseTo(4.5, 5);
  });

  it('suggests the session that hits fresh muscles', () => {
    const rec = muscleRecovery([w(20, [['bench-press', 10]])], now);
    const push = { id: 'push', name: 'Push', exercises: [{ exerciseId: 'bench-press', sets: 4 }] };
    const legs = { id: 'legs', name: 'Legs', exercises: [{ exerciseId: 'squat', sets: 4 }] };
    const pull = { id: 'pull', name: 'Pull', exercises: [{ exerciseId: 'row', sets: 4 }] };
    const fit = sessionFit(push, rec);
    expect(fit.tiredHits).toEqual(['chest']);
    expect(fit.score).toBeLessThan(40);
    expect(sessionFit(legs, rec).score).toBe(100);
    const ranked = rankSessions([push, legs, pull, { id: 'empty', name: 'E', exercises: [] }], rec);
    expect(ranked.map((f) => f.candidate.id)).toEqual(['legs', 'pull', 'push']);
    expect(ranked[0].freshHits).toEqual(['quads', 'glutes']);
  });

  it('words readiness and muscle lists', () => {
    expect(readyLabel(0)).toBe('Ready now');
    expect(readyLabel(5)).toBe('Ready in ~5\u00A0h');
    expect(readyLabel(30)).toBe('Ready in ~1\u00A0day');
    expect(readyLabel(50)).toBe('Ready in ~2\u00A0days');
    expect(regionList(['chest', 'triceps'])).toBe('Chest and triceps');
    expect(regionList(['chest', 'triceps', 'front-delts', 'quads'])).toBe('Chest, triceps, front delts and 1 more');
    expect(isAre(['chest'])).toBe('is');
    expect(isAre(['lats'])).toBe('are');
    expect(isAre(['chest', 'triceps'])).toBe('are');
  });
});
