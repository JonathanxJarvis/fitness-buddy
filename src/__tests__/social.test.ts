import { describe, expect, it } from '@jest/globals';
import { initialState, reducer } from '@/store/reducer';
import { offlineReply } from '@/lib/offlineCoach';
import { addFriend, demoCrew, demoReplyText, formatCode, levelsGained, makeSnapshot, normalizeCode, scoreGained, unreadCount } from '@/lib/social';
import type { AppState, Workout } from '@/lib/types';

const today = '2026-09-28';
const workout = (id: string, date: string, kg: number): Workout => ({
  id,
  date,
  name: 'Push',
  startedAt: Date.parse(date + 'T10:00:00Z'),
  endedAt: Date.parse(date + 'T11:00:00Z'),
  exercises: [{ exerciseId: 'bench-press', sets: Array.from({ length: 3 }, () => ({ kg, reps: 5, done: true })) }],
});

const state: AppState = {
  ...initialState,
  profile: { name: 'Jonathan', sex: 'male', age: 28, heightCm: 180, weightKg: 80, activity: 'moderate', goal: 'gain', weeklyRateKg: 0.25 },
  goals: { calories: 2800, protein: 176, carbs: 330, fat: 80, fiber: 35, water: 0 } as unknown as AppState['goals'],
  workouts: [workout('a', '2026-08-10', 60), workout('b', '2026-09-20', 90), workout('c', '2026-09-27', 100)],
};

describe('offline coach', () => {
  it('answers without any AI, using the user’s own numbers', () => {
    const rankUp = offlineReply('How do I rank up?', state, today);
    expect(rankUp).toMatch(/Platinum|Gold|Silver/);
    expect(rankUp).toContain('**squat**, **deadlift** and **overhead press**');
    expect(offlineReply('how much protein is left?', state, today)).toMatch(/176|protein/i);
    expect(offlineReply('Was soll ich heute trainieren?', state, today).length).toBeGreaterThan(20);
    expect(offlineReply('asdfgh', state, today)).toMatch(/Buddy Coach/);
  });
});

describe('social snapshot', () => {
  it('shares progression but no food or body data', () => {
    const s = makeSnapshot(state, today)!;
    expect(s.name).toBe('Jonathan');
    expect(s.totalWorkouts).toBe(3);
    expect(s.weekWorkouts).toBe(1); // 09-20 is outside the last 7 days
    expect(s.history).toHaveLength(8);
    expect(s.levels).toHaveLength(8);
    expect(s.lastWorkout).toEqual({ name: 'Push', date: '2026-09-27', sets: 3 });
    expect(JSON.stringify(s)).not.toMatch(/weightKg|calories|entries/);
    expect(scoreGained(s)).toBeGreaterThan(0);
    expect(levelsGained(s)).toBeGreaterThanOrEqual(1);
  });

  it('normalizes friend codes', () => {
    expect(normalizeCode(' len-a26 ')).toBe('LENA26');
    expect(formatCode('LENA26')).toBe('LEN-A26');
  });

  it('adds demo friends from any code, but not your own', async () => {
    const me = { id: 'local-x', code: 'ABCDEF', secret: 'demo' };
    await expect(addFriend(me, 'abc-def')).rejects.toThrow(/own code/);
    await expect(addFriend(me, 'ab')).rejects.toThrow(/6/);
    const f = await addFriend(me, 'zz9-zz9');
    expect(f.code).toBe('ZZ9ZZ9');
    expect(f.history).toHaveLength(8);
    const again = await addFriend(me, 'ZZ9ZZ9');
    expect(again.name).toBe(f.name);
  });

  it('gives each demo friend a growth curve that ends at their score', () => {
    for (const f of demoCrew(today)) {
      expect(f.history[7]).toBe(f.score);
      expect(f.levels[7]).toBe(f.level);
      expect(levelsGained(f)).toBeGreaterThan(0);
    }
    expect(demoReplyText({ name: 'Lena', level: 20 }, 'new PR today!')).toBeTruthy();
  });
});

describe('social reducer', () => {
  it('stores chats without duplicates and counts unread', () => {
    let s = reducer(initialState, { type: 'setSocialMe', me: { id: 'me', code: 'ABCDEF', secret: 's' } });
    s = reducer(s, { type: 'setFriends', friends: demoCrew(today) });
    const fid = s.social!.friends[0].id;
    const msg = { id: 'm1', from: fid, to: 'me', text: 'yo', at: 10 };
    s = reducer(s, { type: 'addMessages', friendId: fid, messages: [msg, msg] });
    s = reducer(s, { type: 'addMessages', friendId: fid, messages: [{ id: 'm2', from: 'me', to: fid, text: 'hey', at: 11 }] });
    expect(s.social!.chats[fid]).toHaveLength(2);
    expect(unreadCount(s.social, 'me')).toBe(1);
    s = reducer(s, { type: 'markRead', friendId: fid, at: 11 });
    expect(unreadCount(s.social, 'me')).toBe(0);
    s = reducer(s, { type: 'removeFriend', id: fid });
    expect(s.social!.friends).toHaveLength(2);
    expect(s.social!.chats[fid]).toBeUndefined();
  });
});
