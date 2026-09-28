import { describe, expect, it } from '@jest/globals';
import { initialState, reducer } from '@/store/reducer';
import { dailyQuests, petCare, questStates, streakInfo, weeklyChallenge } from '@/lib/quests';
import { progression, rankParts, rankScore, stateProgression } from '@/lib/progression';
import { addDays } from '@/lib/dates';
import type { AppState, Workout } from '@/lib/types';

const today = '2026-09-28'; // a Monday
const workout = (id: string, date: string, kg: number, exerciseId = 'bench-press'): Workout => ({
  id,
  date,
  name: 'Push',
  startedAt: Date.parse(date + 'T10:00:00Z'),
  endedAt: Date.parse(date + 'T11:00:00Z'),
  exercises: [{ exerciseId, sets: Array.from({ length: 4 }, () => ({ kg, reps: 5, done: true })) }],
});

const base: AppState = {
  ...initialState,
  profile: { name: 'Jo', sex: 'male', age: 28, heightCm: 180, weightKg: 80, activity: 'moderate', goal: 'gain', weeklyRateKg: 0.25 },
  goals: { calories: 2800, protein: 176, carbs: 330, fat: 80 } as unknown as AppState['goals'],
};

describe('rank score', () => {
  it('rewards training often, not just lifting heavy', () => {
    const rare = [workout('a', addDays(today, -20), 100)];
    const often = Array.from({ length: 12 }, (_, i) => workout(`w${i}`, addDays(today, -i * 2), 100));
    const a = progression(rare, 80, 'male', today);
    const b = progression(often, 80, 'male', today);
    expect(a.parts.strength).toBeCloseTo(b.parts.strength, 0);
    expect(b.parts.consistency).toBeGreaterThan(a.parts.consistency);
    expect(b.score).toBeGreaterThan(a.score);
    expect(b.sessions28).toBe(12);
  });

  it('counts PRs and quest days as momentum, and cardio as sessions', () => {
    const ws = [workout('a', addDays(today, -10), 80), workout('b', addDays(today, -3), 90)];
    const p = rankParts(ws, 80, 'male', today, { cardio: [{ date: today, minutes: 30 }], questDays: [today, addDays(today, -1)] });
    expect(p.momentum).toBe(12 + 2 * 5);
    expect(p.consistency).toBe(Math.round((3 / 14) * 100));
    expect(rankScore(p)).toBeGreaterThan(0);
  });

  it('adds quest and chest XP to levels', () => {
    const s = { ...base, workouts: [workout('a', today, 80)], questLog: [{ id: 'q:gym', date: today, xp: 400 }] };
    expect(stateProgression(s, today).xp).toBe(stateProgression({ ...s, questLog: [] }, today).xp + 400);
  });
});

describe('daily quests', () => {
  it('picks one food, one training and one bonus quest per day', () => {
    const q = dailyQuests(today);
    expect(q).toHaveLength(3);
    expect(q[0].kind).toBe('nutrition');
    expect(q[1].kind).toBe('training');
    expect(new Set(q.map((x) => x.id)).size).toBe(3);
    const days = new Set(Array.from({ length: 14 }, (_, i) => dailyQuests(addDays(today, i)).map((x) => x.id).join()));
    expect(days.size).toBeGreaterThan(4);
  });

  it('tracks progress and claims only once', () => {
    let s: AppState = { ...base, workouts: [workout('a', today, 80)], exercises: [{ id: 'c', date: today, name: 'Bike', minutes: 25, calories: 200 }] };
    const states = questStates(s, today);
    const training = states[1];
    expect(training.done).toBe(true);
    s = reducer(s, { type: 'claimReward', entry: { id: `q:${training.quest.id}`, date: today, xp: training.quest.xp } });
    s = reducer(s, { type: 'claimReward', entry: { id: `q:${training.quest.id}`, date: today, xp: training.quest.xp } });
    expect(s.questLog).toHaveLength(1);
    expect(questStates(s, today)[1].claimed).toBe(true);
  });

  it('runs a weekly challenge from Monday to Sunday', () => {
    const s = { ...base, workouts: [workout('a', today, 80), workout('b', addDays(today, 2), 80), workout('c', addDays(today, -1), 80)] };
    const w = weeklyChallenge(s, addDays(today, 3));
    expect(w.monday).toBe(today);
    expect(w.value).toBe(2);
    expect(w.done).toBe(false);
  });
});

describe('streak freezes', () => {
  it('earns a freeze every 7 days and uses it on a missed day', () => {
    const days = new Set(Array.from({ length: 10 }, (_, i) => addDays(today, -11 + i)));
    // 10 active days, then yesterday missed... today active
    days.add(today);
    const s = streakInfo(days, today);
    expect(s.frozen).toEqual([addDays(today, -1)]);
    expect(s.streak).toBe(11);
    expect(s.freezes).toBe(0);
  });

  it('breaks without a freeze', () => {
    const days = new Set([addDays(today, -3), addDays(today, -2), today]);
    expect(streakInfo(days, today).streak).toBe(1);
  });

  it('does not break before today is over', () => {
    const days = new Set([addDays(today, -2), addDays(today, -1)]);
    expect(streakInfo(days, today).streak).toBe(2);
  });
});

describe('pet care', () => {
  it('gets hungry without meals and pumped after training', () => {
    expect(petCare(base, today, 13).mood).toBe('hungry');
    expect(petCare({ ...base, workouts: [workout('a', today, 80)] }, today, 13).mood).toBe('pumped');
    expect(petCare({ ...base, workouts: [workout('a', addDays(today, -5), 80)] }, today, 9).mood).toBe('sleepy');
  });
});
