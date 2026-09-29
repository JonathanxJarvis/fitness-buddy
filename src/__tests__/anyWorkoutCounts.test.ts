import { describe, expect, it } from '@jest/globals';
import { initialState } from '@/store/reducer';
import { questStates, weeklyChallenge } from '@/lib/quests';
import { planDay, planFromSplit, planSessions, withDay } from '@/lib/plan';
import type { AppState, Workout } from '@/lib/types';

const today = '2026-09-29'; // a Tuesday: Pull in Push / Pull / Legs
const done = (id: string, date: string, name: string, exerciseId = 'bench-press'): Workout => ({
  id,
  date,
  name,
  startedAt: Date.parse(date + 'T10:00:00Z'),
  endedAt: Date.parse(date + 'T11:00:00Z'),
  exercises: [{ exerciseId, sets: [{ kg: 60, reps: 8, done: true }] }],
});
const withPlan = (split: string, extra: Partial<AppState> = {}): AppState => ({ ...initialState, plan: planFromSplit(split, '2026-09-01'), ...extra });

describe('any workout counts for the day', () => {
  it('finishing Push on a planned Pull day completes the training quest and the week', () => {
    const before = withPlan('ppl');
    const day = planDay(before, today);
    expect(day.kind === 'train' && day.session.name).toBe('Pull');
    expect(questStates(before, today)[0].quest.id).toBe('train');
    expect(questStates(before, today)[0].done).toBe(false);
    const wk0 = weeklyChallenge(before, today, 'train').value;

    const after = { ...before, workouts: [done('p', today, 'Push')] };
    expect(questStates(after, today)[0].done).toBe(true);
    expect(weeklyChallenge(after, today, 'train').value).toBe(wk0 + 1);
  });

  it('two workouts on one day count once for the week', () => {
    const s = withPlan('ppl', { workouts: [done('a', today, 'Push'), done('b', today, 'Legs', 'squat')] });
    expect(questStates(s, today)[0].done).toBe(true);
    expect(weeklyChallenge(s, today, 'train').value).toBe(1);
  });
});

describe('plan workouts follow the plan', () => {
  it('lists each workout of the split once, in week order', () => {
    expect(planSessions(withPlan('ppl')).map((s) => s.name)).toEqual(['Push', 'Pull', 'Legs']);
    expect(planSessions(withPlan('ul')).map((s) => s.name)).toEqual(['Upper', 'Lower']);
    expect(planSessions({ ...initialState, plan: undefined })).toEqual([]);
  });

  it('changes with the plan and uses your own version of a workout', () => {
    const mine = { id: 'm', name: 'Push', exercises: [{ exerciseId: 'dip', sets: 3, reps: 10 }] };
    const s = withPlan('ppl', { routines: [mine] });
    expect(planSessions(s)[0].routine).toBe(mine);
    const switched = { ...s, plan: planFromSplit('bro', '2026-09-01') };
    expect(planSessions(switched).map((x) => x.name)).toEqual(['Chest', 'Back', 'Legs', 'Shoulders', 'Arms']);
  });

  it('a custom week lists what the week holds', () => {
    const plan = withDay(planFromSplit('custom', '2026-09-01', ['upper', null, 'lower', null, 'upper', null, null]), today, 'arms');
    expect(planSessions({ ...initialState, plan }).map((x) => x.name)).toEqual(['Upper', 'Lower']);
  });
});
