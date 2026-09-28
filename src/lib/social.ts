import type { AppState, Friend, SocialMessage, SocialSnapshot, SocialState } from './types';
import { levelFor, progression, STAGES, totalXp } from './progression';
import { addDays, todayKey } from './dates';
import { doneSets } from './training';
import { PREVIEW } from './pro';

/**
 * Friends and chat. With EXPO_PUBLIC_SOCIAL_URL set, this talks to the small
 * Cloudflare Worker in server/social. Without it (and always in the preview)
 * it runs a local demo crew so every screen can be tried.
 */
const BASE = (process.env.EXPO_PUBLIC_SOCIAL_URL ?? '').replace(/\/$/, '');
export const DEMO = PREVIEW || !BASE;

type Me = NonNullable<SocialState['me']>;

// ---------- Your snapshot ----------

export function makeSnapshot(state: AppState, today = todayKey()): SocialSnapshot | null {
  const p = state.profile;
  if (!p) return null;
  const prog = progression(state.workouts, p.weightKg, p.sex, today);
  const weekStart = addDays(today, -6);
  const last = [...state.workouts].sort((a, b) => a.startedAt - b.startedAt).pop();
  return {
    name: p.name?.trim() || 'Lifter',
    score: prog.score,
    stage: prog.stage.index,
    level: prog.level,
    xp: prog.xp,
    history: prog.history.map((h) => h.score),
    levels: prog.history.map((h) => levelFor(totalXp(state.workouts.filter((w) => w.date <= h.date))).level),
    weekWorkouts: state.workouts.filter((w) => w.date >= weekStart && w.date <= today).length,
    totalWorkouts: state.workouts.length,
    lastWorkout: last ? { name: last.name, date: last.date, sets: doneSets(last) } : undefined,
    skin: state.settings.mascotSkin,
    updatedAt: Date.now(),
  };
}

/** Levels gained over the 8-week window: how fast someone is growing. */
export function levelsGained(s: Pick<SocialSnapshot, 'levels' | 'level'>): number {
  return Math.max(0, s.level - (s.levels[0] ?? s.level));
}

export function scoreGained(s: Pick<SocialSnapshot, 'history' | 'score'>): number {
  return Math.max(0, Math.round(s.score - (s.history[0] ?? s.score)));
}

// ---------- Codes ----------

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function normalizeCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}

export const formatCode = (code: string) => (code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code);

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function randomCode(r: () => number = Math.random): string {
  return Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(r() * CODE_CHARS.length)]).join('');
}

// ---------- Demo crew ----------

const DEMO_PEOPLE: { name: string; code: string; base: number; growth: number; level: number; pace: number; skin: string; last: string }[] = [
  { name: 'Lena', code: 'LENA26', base: 52, growth: 9, level: 23, pace: 4, skin: 'cherry', last: 'Leg day' },
  { name: 'Marco', code: 'MRC777', base: 70, growth: 4, level: 31, pace: 5, skin: 'midnight', last: 'Push' },
  { name: 'Aisha', code: 'AISHA1', base: 30, growth: 14, level: 11, pace: 3, skin: 'neon', last: 'Full body' },
];
const DEMO_NAMES = ['Jonas', 'Mia', 'Tariq', 'Sofia', 'Ben', 'Nora', 'Luca', 'Emma', 'Yusuf', 'Clara'];
const DEMO_WORKOUTS = ['Push', 'Pull', 'Legs', 'Upper body', 'Full body', 'Leg day'];

function demoFriend(p: (typeof DEMO_PEOPLE)[number], today: string): Friend {
  const r = rng(p.code);
  const history = Array.from({ length: 8 }, (_, i) => Math.round(Math.max(0, p.base - p.growth + (p.growth * i) / 7 + (r() - 0.5) * 2)));
  history[7] = p.base;
  const levels = Array.from({ length: 8 }, (_, i) => Math.max(1, Math.round(p.level - (7 - i) * (p.pace / 3))));
  levels[7] = p.level;
  return {
    id: `demo-${p.code}`,
    code: p.code,
    name: p.name,
    score: p.base,
    stage: STAGES.filter((s) => s.min <= p.base).pop()?.index ?? 0,
    level: p.level,
    xp: Math.round(120 * Math.pow(p.level - 1, 1.55)) + 40,
    history,
    levels,
    weekWorkouts: p.pace,
    totalWorkouts: p.level * 3 + 4,
    lastWorkout: { name: p.last, date: addDays(today, -Math.floor(r() * 3)), sets: 14 + Math.floor(r() * 10) },
    skin: p.skin,
    updatedAt: Date.now() - Math.floor(r() * 5) * 3600_000,
  };
}

function demoFromCode(code: string, today: string): Friend {
  const known = DEMO_PEOPLE.find((p) => p.code === code);
  if (known) return demoFriend(known, today);
  const r = rng(code);
  return demoFriend(
    {
      name: DEMO_NAMES[Math.floor(r() * DEMO_NAMES.length)],
      code,
      base: 15 + Math.floor(r() * 60),
      growth: 3 + Math.floor(r() * 12),
      level: 4 + Math.floor(r() * 30),
      pace: 1 + Math.floor(r() * 5),
      skin: ['classic', 'gold', 'midnight', 'cherry', 'neon'][Math.floor(r() * 5)],
      last: DEMO_WORKOUTS[Math.floor(r() * DEMO_WORKOUTS.length)],
    },
    today,
  );
}

export function demoCrew(today = todayKey()): Friend[] {
  return DEMO_PEOPLE.map((p) => demoFriend(p, today));
}

const DEMO_OPENERS: Record<string, string> = {
  'demo-LENA26': 'Saw your last session 👀 what are you squatting these days?',
  'demo-MRC777': 'Bet you can’t out-train me this week 😤',
  'demo-AISHA1': 'Just hit a new deadlift PR!! 🎉',
};

export function demoOpener(friendId: string, at = Date.now()): SocialMessage | null {
  const text = DEMO_OPENERS[friendId];
  return text ? { id: `${friendId}-hello`, from: friendId, to: 'me', text, at } : null;
}

/** A friend's canned answer in the demo, loosely matched to what you wrote. */
export function demoReplyText(friend: Pick<Friend, 'name' | 'level' | 'lastWorkout'>, text: string): string {
  const t = text.toLowerCase();
  const pick = (xs: string[]) => xs[Math.floor(Math.random() * xs.length)];
  if (/\b(hi|hey|hello|hallo|yo|moin|servus)\b/.test(t)) return pick(['Heyy! Trained today?', 'Yo! What’s the plan today?', 'Hey hey 💪']);
  if (/\bpr\b|record|new best/.test(t)) return pick(['NO WAY. Congrats!! 🔥', 'Let’s gooo! Send a video next time', 'Okay that’s actually huge 👏']);
  if (/rank|level|lvl|tier/.test(t)) return pick([`I’m level ${friend.level}, catching you soon 😏`, 'The path is addictive ngl', 'Next tier by the end of the month, watch']);
  if (/gym|train|workout|session|lift/.test(t)) return pick([`Did ${friend.lastWorkout?.name ?? 'a session'} earlier. You?`, 'Wanna train together Saturday?', 'Going tonight, can’t skip again 😅']);
  if (/squat|bench|dead|press|pull/.test(t)) return pick(['Form first, weight second 😇', 'I’m stuck on that one too. Deload week?', 'Pause reps changed my life honestly']);
  if (/eat|food|protein|meal|diet/.test(t)) return pick(['Skyr + oats every morning, zero regrets', 'Hitting protein is the hardest part tbh', 'Meal prep Sunday 🍗🍚']);
  if (/\?$/.test(t)) return pick(['Hmm good question 🤔', 'Honestly? Yes.', 'Depends how sore you are lol']);
  return pick(['Haha facts', '💪💪', 'Love that', 'Let’s keep the streak going', 'Proud of you tbh']);
}

// ---------- Server API ----------

async function api<T>(path: string, init: RequestInit & { me?: Me } = {}): Promise<T> {
  const { me, ...rest } = init;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: {
      'content-type': 'application/json',
      ...(me ? { authorization: `Bearer ${me.id}:${me.secret}` } : {}),
    },
  });
  if (!res.ok) {
    let msg = `Server error ${res.status}`;
    try {
      msg = ((await res.json()) as { error?: string }).error ?? msg;
    } catch {}
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export async function register(snapshot: SocialSnapshot): Promise<Me> {
  if (DEMO) return { id: `local-${randomCode()}`, code: randomCode(), secret: 'demo' };
  return api<Me>('/register', { method: 'POST', body: JSON.stringify({ snapshot }) });
}

export async function publish(me: Me, snapshot: SocialSnapshot): Promise<void> {
  if (DEMO) return;
  await api('/me', { method: 'PUT', me, body: JSON.stringify({ snapshot }) });
}

export async function fetchFriends(me: Me, current: Friend[]): Promise<Friend[]> {
  if (DEMO) return current;
  return (await api<{ friends: Friend[] }>('/friends', { me })).friends;
}

export async function addFriend(me: Me, rawCode: string): Promise<Friend> {
  const code = normalizeCode(rawCode);
  if (code.length !== 6) throw new Error('Friend codes have 6 letters and numbers.');
  if (code === me.code) throw new Error('That’s your own code. Share it with a friend instead!');
  if (DEMO) {
    await new Promise((r) => setTimeout(r, 500));
    return demoFromCode(code, todayKey());
  }
  return (await api<{ friend: Friend }>('/friends', { method: 'POST', me, body: JSON.stringify({ code }) })).friend;
}

export async function removeFriend(me: Me, id: string): Promise<void> {
  if (DEMO) return;
  await api(`/friends/${encodeURIComponent(id)}`, { method: 'DELETE', me });
}

export async function sendMessage(me: Me, to: string, text: string): Promise<SocialMessage> {
  const clean = text.trim().slice(0, 500);
  if (DEMO) return { id: `m-${Date.now()}-${randomCode()}`, from: me.id, to, text: clean, at: Date.now() };
  return (await api<{ message: SocialMessage }>('/messages', { method: 'POST', me, body: JSON.stringify({ to, text: clean }) })).message;
}

export async function fetchMessages(me: Me, friendId: string, since: number): Promise<SocialMessage[]> {
  if (DEMO) return [];
  return (await api<{ messages: SocialMessage[] }>(`/messages/${encodeURIComponent(friendId)}?since=${since}`, { me })).messages;
}

export function unreadCount(social: SocialState | undefined, myId: string | undefined): number {
  if (!social || !myId) return 0;
  return Object.entries(social.chats).reduce((n, [fid, list]) => n + list.filter((m) => m.from !== myId && m.at > (social.read[fid] ?? 0)).length, 0);
}
