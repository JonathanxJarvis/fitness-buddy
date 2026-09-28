import { describe, expect, it } from '@jest/globals';
import { levelFor, liftResults, progression, STAGES, stageFor, standardScore, strengthScore, totalXp, xpForLevel } from '@/lib/progression';
import type { Workout } from '@/lib/types';

const w = (id: string, date: string, exerciseId: string, kg: number, reps: number, sets = 3): Workout => ({
  id,
  date,
  name: 'x',
  startedAt: Date.parse(date + 'T10:00:00Z'),
  endedAt: Date.parse(date + 'T11:00:00Z'),
  exercises: [{ exerciseId, sets: Array.from({ length: sets }, () => ({ kg, reps, done: true })) }],
});

describe('strength standards', () => {
  it('maps values onto 0–100', () => {
    const std = [1, 2, 3, 4, 5];
    expect(standardScore(0, std)).toBe(0);
    expect(standardScore(0.5, std)).toBe(10);
    expect(standardScore(1, std)).toBe(20);
    expect(standardScore(3.5, std)).toBe(70);
    expect(standardScore(9, std)).toBe(100);
  });

  it('ranks an 80 kg man benching 100 kg for 1 as intermediate', () => {
    const [bench] = liftResults([w('a', '2026-09-01', 'bench-press', 100, 1)], 80, 'male');
    expect(bench.key).toBe('bench');
    expect(bench.level).toBe(2); // 1.25 × BW: past intermediate (1.0), short of advanced (1.5)
    expect(bench.next).toBeCloseTo(120);
  });

  it('counts pull-ups by reps', () => {
    const [pu] = liftResults([w('a', '2026-09-01', 'pull-up', 0, 10)], 80, 'male');
    expect(pu.score).toBeCloseTo(60);
  });

  it('rewards training more than one lift', () => {
    const one = strengthScore([{ score: 60 } as never]);
    const three = strengthScore([{ score: 60 }, { score: 60 }, { score: 60 }] as never);
    expect(three).toBeGreaterThan(one);
  });
});

describe('stages and levels', () => {
  it('has 3 divisions per tier and a single Titan stage', () => {
    expect(STAGES).toHaveLength(8 * 3 + 1);
    expect(STAGES[0].label).toBe('Rookie III');
    expect(STAGES[STAGES.length - 1].label).toBe('Titan');
    expect(stageFor(0).label).toBe('Rookie III');
    expect(stageFor(50).tier.name).toBe('Gold');
    expect(stageFor(100).label).toBe('Titan');
  });

  it('levels up as XP grows', () => {
    expect(levelFor(0).level).toBe(1);
    expect(levelFor(xpForLevel(5)).level).toBe(5);
    expect(levelFor(xpForLevel(5) - 1).level).toBe(4);
  });

  it('gives XP for sets, PRs and consistent weeks', () => {
    const a = w('a', '2026-09-01', 'bench-press', 60, 8);
    const b = w('b', '2026-09-03', 'bench-press', 65, 8);
    expect(totalXp([a])).toBe(40 + 24 + 10); // 1,440 kg volume earns 10 bonus XP
    expect(totalXp([a, b])).toBeGreaterThan(2 * 74 + 50); // b is a PR (+60)
  });

  it('tracks growth over weeks', () => {
    const p = progression([w('a', '2026-08-20', 'squat', 80, 5), w('b', '2026-09-25', 'squat', 120, 5)], 80, 'male', '2026-09-28');
    expect(p.history).toHaveLength(8);
    expect(p.history[7].score).toBeGreaterThan(p.history[3].score);
    expect(p.history[0].score).toBe(0);
  });
});
