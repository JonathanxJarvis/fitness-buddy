import { describe, expect, it } from '@jest/globals';
import { initialState, reducer } from '@/store/reducer';
import { offlineReply } from '@/lib/offlineCoach';
import { avatarFor, avatarFromSeed, AVATAR_LIMITS, cleanAvatar } from '@/components/people/avatarConfig';
import { addFriend, demoCrew, demoFriends, demoReplyText, formatCode, levelsGained, makeSnapshot, normalizeCode, scoreGained, unreadCount } from '@/lib/social';
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

  const de: AppState = { ...state, settings: { ...state.settings, foodRegion: 'de' } };

  it('suggests real meals with portion, kcal and protein, in German names for German users', () => {
    const dinner = offlineReply('What should I eat for dinner?', de, today);
    expect(dinner).toMatch(/aim for about \*\*\d+ kcal\*\*/);
    const lines = dinner.split('\n').filter((l) => l.startsWith('- '));
    expect(lines).toHaveLength(3);
    for (const l of lines) expect(l).toMatch(/^- \*\*.+\*\* \((1|1½) servings?, \d+ g\): \d+ kcal, \d+ g protein$/);
    expect(dinner).toMatch(/Hähnchen|Lachs|Rind|Pute|Linsen|Seelachs|Gulasch|Thunfisch|Döner/);
    const us = offlineReply('What should I eat for dinner?', state, today);
    expect(us).not.toMatch(/Hähnchen|Mit |mit /);
    expect(offlineReply('How do I hit my protein?', de, today)).toMatch(/176 g more protein[\s\S]*g protein/);
    const plan = offlineReply('Plan my meals for tomorrow', de, today);
    expect(plan).toMatch(/\*\*Breakfast\*\*: .+ · \d+ kcal, \d+ g protein/);
    expect(plan).toMatch(/\*\*Dinner\*\*/);
  });

  it('answers dish questions from the meal library in English or German', () => {
    expect(offlineReply('how many calories in lasagne', state, today)).toMatch(/\*\*Lasagna\*\*.*\*\*\d+ kcal\*\*/);
    const doner = offlineReply('Nährwerte Döner', de, today);
    expect(doner).toMatch(/\*\*Döner Kebab\*\*/);
    expect(doner).toMatch(/treat/);
    expect(offlineReply('Wie viele Kalorien hat ein Döner?', de, today)).toMatch(/Döner/);
    expect(offlineReply('calories in a banana', state, today)).toMatch(/\*\*Banana\*\*/);
    // Questions about your own numbers are not dish lookups.
    expect(offlineReply('how much protein is left?', state, today)).not.toMatch(/offline meal list/);
    expect(offlineReply('how many calories in beef wellington', state, today)).toMatch(/look it up in the USDA/);
  });

  it('looks unknown dishes up online, and falls back when offline', async () => {
    // Imported here so this block stays self-contained.
    const { offlineReplyAsync } = require('@/lib/offlineCoach') as typeof import('@/lib/offlineCoach');
    const realFetch = global.fetch;
    try {
      global.fetch = (() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              foods: [{ fdcId: 1, description: 'Beef Wellington', foodNutrients: [{ nutrientId: 1008, value: 250 }, { nutrientId: 1003, value: 12 }, { nutrientId: 1005, value: 15 }, { nutrientId: 1004, value: 16 }], foodMeasures: [{ disseminationText: '1 slice', gramWeight: 200, rank: 1 }] }],
            }),
        })) as unknown as typeof fetch;
      const online = await offlineReplyAsync('how many calories in beef wellington', state, today);
      expect(online).toMatch(/\*\*Beef Wellington\*\* \(1 slice \(200 g\)\): \*\*500 kcal\*\*/);
      expect(online).toMatch(/USDA/);
      global.fetch = (() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
      expect(await offlineReplyAsync('how many calories in beef wellington', state, today)).toMatch(/couldn’t find/);
      // Known dishes and other questions never hit the network.
      global.fetch = (() => Promise.reject(new Error('should not be called'))) as unknown as typeof fetch;
      expect(await offlineReplyAsync('Nährwerte Döner', de, today)).toBe(offlineReply('Nährwerte Döner', de, today));
      expect(await offlineReplyAsync('How do I rank up?', state, today)).toBe(offlineReply('How do I rank up?', state, today));
    } finally {
      global.fetch = realFetch;
    }
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

describe('avatars', () => {
  it('draws the same person for the same seed, within bounds', () => {
    const a = avatarFromSeed('Lena');
    expect(avatarFromSeed('lena ')).toEqual(a);
    for (const seed of ['a', 'b', 'Marco', 'ZZ9ZZ9', '']) {
      const c = avatarFromSeed(seed);
      for (const [k, n] of Object.entries(AVATAR_LIMITS)) expect(c[k as keyof typeof c]).toBeLessThan(n);
      expect(c.hair).not.toBe(10); // headscarf is a choice, never random
    }
  });

  it('clamps untrusted configs from friends', () => {
    expect(cleanAvatar(null)).toBeUndefined();
    const c = cleanAvatar({ face: 99, skin: -3, hair: 'x', bg: 2.4 })!;
    expect(c).toMatchObject({ face: AVATAR_LIMITS.face - 1, skin: 0, hair: 0, bg: 2 });
    expect(avatarFor({ name: 'Tom' })).toEqual(avatarFromSeed('Tom'));
  });

  it('gives demo friends distinct portraits and shares yours in the snapshot', () => {
    const looks = demoFriends(today).map((f) => JSON.stringify(f.avatar));
    expect(new Set(looks).size).toBe(looks.length);
    const custom = { face: 1, skin: 2, hair: 3, hairColor: 1, beard: 0, glasses: 1, top: 2, topColor: 4, bg: 5 };
    const snap = makeSnapshot({ ...state, settings: { ...state.settings, avatar: custom, photo: 'data:image/jpeg;base64,xx' } }, today)!;
    expect(snap.avatar).toEqual(custom);
    expect(JSON.stringify(snap)).not.toContain('data:image');
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
    expect(s.social!.friends).toHaveLength(demoCrew(today).length - 1);
    expect(s.social!.chats[fid]).toBeUndefined();
  });
});
