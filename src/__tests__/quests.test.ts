import { describe, expect, it } from '@jest/globals';
import { initialState, reducer } from '@/store/reducer';
import { activeDays, dailyQuests, petCare, questStates, streakInfo, weeklyChallenge, weeklyPr } from '@/lib/quests';
import { planDay, planFromSplit, swapDays, withDay } from '@/lib/plan';
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

const ppl = planFromSplit('ppl', addDays(today, -14)); // Mon push … Sat legs, Sun rest
const ul = planFromSplit('ul', addDays(today, -14)); // Mon upper, Tue lower, Wed rest …
const confirmCheckin = (s: AppState, id: string, date = today) => reducer(s, { type: 'setCheckin', date, id, on: true });

describe('training plan', () => {
  it('maps weekdays to sessions and rest days', () => {
    const s = { ...base, plan: ul };
    expect(planDay(s, today)).toMatchObject({ kind: 'train', session: { id: 'upper' } });
    expect(planDay(s, addDays(today, 2)).kind).toBe('rest');
    expect(planDay(base, today).kind).toBe('none');
  });

  it('overrides one date and moves a session to tomorrow', () => {
    const rested = withDay(ul, today, null);
    expect(planDay({ ...base, plan: rested }, today).kind).toBe('rest');
    expect(withDay(rested, today, 'upper').overrides).toEqual({});
    // Monday upper, Tuesday lower: swapping puts lower first.
    const swapped = swapDays(ul, today, addDays(today, 1));
    expect(planDay({ ...base, plan: swapped }, today)).toMatchObject({ kind: 'train', session: { id: 'lower' } });
    expect(planDay({ ...base, plan: swapped }, addDays(today, 1))).toMatchObject({ kind: 'train', session: { id: 'upper' } });
    // Wednesday is rest: moving Tuesday's lower there leaves Tuesday resting.
    const moved = swapDays(ul, addDays(today, 1), addDays(today, 2));
    expect(planDay({ ...base, plan: moved }, addDays(today, 1)).kind).toBe('rest');
  });

  it('prefers your own routine when its name matches the session', () => {
    const mine = { id: 'my-push', name: 'push', exercises: [{ exerciseId: 'dip', sets: 3, reps: 10 }] };
    const day = planDay({ ...base, plan: ppl, routines: [mine] }, today);
    expect(day.kind === 'train' && day.session.routine.id).toBe('my-push');
  });
});

describe('daily quests', () => {
  it('picks one move, one food and one recovery quest per day, with no PR or "log 5 foods"', () => {
    const all = new Set<string>();
    for (let i = 0; i < 60; i++) {
      const q = dailyQuests(addDays(today, i));
      expect(q).toHaveLength(3);
      expect(q.map((x) => x.kind)).toEqual(['move', 'nutrition', 'recovery']);
      expect(new Set(q.map((x) => x.id)).size).toBe(3);
      q.forEach((x) => all.add(x.id));
    }
    expect(all.has('pr')).toBe(false);
    expect(all.has('items5')).toBe(false);
    expect(all.has('sleep')).toBe(true);
    const days = new Set(Array.from({ length: 14 }, (_, i) => dailyQuests(addDays(today, i)).map((x) => x.id).join()));
    expect(days.size).toBeGreaterThan(3);
  });

  it('follows the plan: train on a gym day, rest properly on a rest day', () => {
    const s = { ...base, plan: ul };
    const gym = dailyQuests(today, s)[0];
    expect(gym.id).toBe('train');
    expect(gym.title).toBe('Train: Upper day');
    expect(dailyQuests(addDays(today, 2), s)[0].id).toBe('rest');
    // Rest days never ask for cardio on top.
    for (let i = 0; i < 30; i++) {
      const d = addDays(today, i);
      if (planDay(s, d).kind === 'rest') expect(dailyQuests(d, s).map((q) => q.id)).not.toContain('cardio');
    }
  });

  it('tracks progress and claims only once', () => {
    let s: AppState = { ...base, plan: ul, workouts: [workout('a', today, 80)] };
    const move = questStates(s, today)[0];
    expect(move.quest.id).toBe('train');
    expect(move.done).toBe(true);
    s = reducer(s, { type: 'claimReward', entry: { id: `q:${move.quest.id}`, date: today, xp: move.quest.xp } });
    s = reducer(s, { type: 'claimReward', entry: { id: `q:${move.quest.id}`, date: today, xp: move.quest.xp } });
    expect(s.questLog).toHaveLength(1);
    expect(questStates(s, today)[0].claimed).toBe(true);
  });

  it('confirms quests the app cannot measure with a tap', () => {
    const rest = addDays(today, 2);
    let s: AppState = { ...base, plan: ul };
    expect(questStates(s, rest)[0].done).toBe(false);
    s = confirmCheckin(s, 'rest', rest);
    expect(questStates(s, rest)[0].done).toBe(true);
    // A logged 15 min walk also counts as resting properly.
    const walked = { ...base, plan: ul, exercises: [{ id: 'w', date: rest, name: 'Walk', minutes: 15, calories: 60 }] };
    expect(questStates(walked, rest)[0].done).toBe(true);
    s = reducer(confirmCheckin(s, 'sleep', rest), { type: 'setCheckin', date: rest, id: 'sleep', on: false });
    expect(s.checkins?.[rest]).toEqual(['rest']);
  });

  it('runs a weekly challenge from Monday to Sunday', () => {
    const s = { ...base, workouts: [workout('a', today, 80), workout('b', addDays(today, 2), 80), workout('c', addDays(today, -1), 80)] };
    const w = weeklyChallenge(s, addDays(today, 3));
    expect(w.monday).toBe(today);
    expect(w.value).toBe(2);
    expect(w.target).toBe(3);
    expect(w.done).toBe(false);
  });

  it('asks for every planned session when there is a plan', () => {
    const ws = [0, 1, 3, 4].map((i) => workout(`p${i}`, addDays(today, i), 80));
    const w = weeklyChallenge({ ...base, plan: ul, workouts: ws }, addDays(today, 5));
    expect(w.title).toBe('Hit all 4 planned sessions');
    expect(w.target).toBe(4);
    expect(w.done).toBe(true);
    expect(weeklyChallenge({ ...base, plan: withDay(ul, today, null) }, today).target).toBe(3);
  });

  it('turns PRs into a weekly bonus', () => {
    const ws = [workout('a', addDays(today, -7), 80), workout('b', addDays(today, 1), 90)];
    expect(weeklyPr({ ...base, workouts: ws }, addDays(today, 2)).done).toBe(true);
    expect(weeklyPr({ ...base, workouts: ws.slice(0, 1) }, today).done).toBe(false);
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

describe('planned rest days', () => {
  it('keep the streak going', () => {
    // Plan since two weeks ago; Wed–Sun of last week are rest days under upper/lower, but only Wed/Sat/Sun.
    const logged = [-7, -6, -4, -3, -1].map((i) => ({ ...workout(`w${i}`, addDays(today, i), 80) }));
    const withPlan = { ...base, plan: { ...ul, since: addDays(today, -7) }, workouts: logged };
    const days = activeDays(withPlan, today);
    expect(days.has(addDays(today, -5))).toBe(true); // last Wednesday, planned rest
    expect(streakInfo(days, today).streak).toBe(7);
    expect(streakInfo(activeDays({ ...withPlan, plan: undefined }, today), today).streak).toBe(1);
    // Planned rest days before the plan existed don't count.
    expect(activeDays({ ...withPlan, plan: { ...ul, since: today } }, today).has(addDays(today, -5))).toBe(false);
  });
});

describe('pet care', () => {
  it('gets hungry without meals and pumped after training', () => {
    expect(petCare(base, today, 13).mood).toBe('hungry');
    expect(petCare({ ...base, workouts: [workout('a', today, 80)] }, today, 13).mood).toBe('pumped');
    expect(petCare({ ...base, workouts: [workout('a', addDays(today, -5), 80)] }, today, 9).mood).toBe('sleepy');
  });

  it('is relaxed on a planned rest day and knows when you slept well', () => {
    const rest = addDays(today, 2);
    const s = { ...base, plan: ul, workouts: [workout('a', addDays(today, 1), 80)] };
    const p = petCare(s, rest, 9);
    expect(p.mood).toBe('happy');
    expect(p.line).toMatch(/Rest day/);
    expect(petCare(confirmCheckin(s, 'sleep', rest), rest, 9).rested).toBeGreaterThan(p.rested);
  });
});
