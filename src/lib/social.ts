import type { AppState, AvatarConfig, Friend, SocialEvent, SocialMessage, SocialSnapshot, SocialState } from './types';
import { levelFor, STAGES, stageFor, stateProgression, totalXp } from './progression';
import { addDays, fromKey, todayKey } from './dates';
import { doneSets, findExercise, prExercises } from './training';
import { activeDays, streakInfo } from './quests';
import { petAura, PREVIEW } from './pro';
import { avatarFromSeed, cleanAvatar } from '@/components/people/avatarConfig';

/**
 * Friends and chat. With EXPO_PUBLIC_SOCIAL_URL set, this talks to the small
 * Cloudflare Worker in server/social. The web preview (EXPO_PUBLIC_PREVIEW=1)
 * runs a local demo friends list so every screen can be tried. Real builds
 * never get demo friends: without a server the list simply starts empty.
 *
 * Profile photos stay on this phone: there's no image server, so friends get
 * your illustrated avatar config (settings.avatar) instead.
 */
const BASE = (process.env.EXPO_PUBLIC_SOCIAL_URL ?? '').replace(/\/$/, '');
export const DEMO = PREVIEW;
/** A real build with no Friends server yet: everything stays on this phone. */
export const OFFLINE = !DEMO && !BASE;
export const OFFLINE_MESSAGE = 'Adding friends switches on once Fitness Buddy’s Friends server is live.';

type Me = NonNullable<SocialState['me']>;

// ---------- Your snapshot ----------

export function makeSnapshot(state: AppState, today = todayKey()): SocialSnapshot | null {
  const p = state.profile;
  if (!p) return null;
  const prog = stateProgression(state, today);
  const weekStart = addDays(today, -6);
  const sorted = [...state.workouts].sort((a, b) => a.startedAt - b.startedAt);
  const last = sorted[sorted.length - 1];
  const bonusBy = (date: string) => (state.questLog ?? []).filter((q) => q.date <= date).reduce((n, q) => n + q.xp, 0);

  // Highlights for friends' feeds: workouts, PRs, rank-ups and cleared quests.
  const recent: SocialEvent[] = [];
  sorted.slice(-6).forEach((w) => {
    const i = sorted.indexOf(w);
    const at = w.endedAt ?? w.startedAt;
    const prs = prExercises(w, sorted.slice(0, i));
    if (prs.length) recent.push({ kind: 'pr', text: `set a PR on ${findExercise(prs[0], state.customExercises)?.name ?? 'a lift'}`, at });
    else recent.push({ kind: 'workout', text: `finished ${w.name} · ${doneSets(w)} sets`, at });
  });
  prog.history.forEach((h, i) => {
    if (i === 0) return;
    const before = stageFor(prog.history[i - 1].score);
    const after = stageFor(h.score);
    if (after.index > before.index) recent.push({ kind: 'rank', text: `reached ${after.label}`, at: fromKey(h.date).getTime() + 12 * 3600_000 });
  });
  (state.questLog ?? [])
    .filter((q) => q.id === 'chest')
    .slice(-3)
    .forEach((q) => recent.push({ kind: 'quests', text: 'cleared all daily quests', at: fromKey(q.date).getTime() + 20 * 3600_000 }));
  const streak = streakInfo(activeDays(state), today).streak;
  if (streak >= 7) recent.push({ kind: 'streak', text: `is on a ${streak}-day streak`, at: Date.now() - 3600_000 });
  recent.sort((a, b) => b.at - a.at);

  return {
    name: p.name?.trim() || 'Lifter',
    score: prog.score,
    stage: prog.stage.index,
    level: prog.level,
    xp: prog.xp,
    history: prog.history.map((h) => h.score),
    levels: prog.history.map((h) => levelFor(totalXp(state.workouts.filter((w) => w.date <= h.date)) + bonusBy(h.date)).level),
    weekWorkouts: state.workouts.filter((w) => w.date >= weekStart && w.date <= today).length,
    totalWorkouts: state.workouts.length,
    lastWorkout: last ? { name: last.name, date: last.date, sets: doneSets(last) } : undefined,
    skin: state.settings.mascotSkin,
    pet: state.settings.pet ?? 'kettle',
    petName: state.settings.petName,
    avatar: cleanAvatar(state.settings.avatar) ?? avatarFromSeed(p.name?.trim() || 'Lifter'),
    icon: state.settings.profileIcon === 'pet' ? 'pet' : undefined,
    aura: petAura(state) !== 'none' ? petAura(state) : undefined,
    parts: prog.parts,
    streak,
    recent: recent.slice(0, 6),
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

// ---------- Demo friends ----------

type DemoPerson = { name: string; code: string; base: number; growth: number; level: number; pace: number; skin: string; last: string; pet: string; petName: string; streak: number; avatar?: AvatarConfig };
const DEMO_PEOPLE: DemoPerson[] = [
  { name: 'Lena', code: 'LENA26', base: 52, growth: 9, level: 23, pace: 4, skin: 'cherry', last: 'Leg day', pet: 'avo', petName: 'Guac', streak: 19, avatar: { face: 0, skin: 1, hair: 9, hairColor: 4, beard: 0, glasses: 0, top: 3, topColor: 2, bg: 0 } },
  { name: 'Marco', code: 'MRC777', base: 70, growth: 4, level: 31, pace: 5, skin: 'midnight', last: 'Push', pet: 'dumbbell', petName: 'Tank', streak: 41, avatar: { face: 2, skin: 3, hair: 1, hairColor: 0, beard: 2, glasses: 0, top: 2, topColor: 5, bg: 2 } },
  { name: 'Aisha', code: 'AISHA1', base: 30, growth: 14, level: 11, pace: 3, skin: 'classic', last: 'Full body', pet: 'flame', petName: 'Sparky', streak: 8, avatar: { face: 3, skin: 5, hair: 10, hairColor: 0, beard: 0, glasses: 0, top: 0, topColor: 0, bg: 3 } },
  { name: 'Tom', code: 'TOMFIT', base: 41, growth: 6, level: 17, pace: 2, skin: 'classic', last: 'Upper body', pet: 'shaker', petName: 'Wheyne', streak: 3, avatar: { face: 1, skin: 0, hair: 0, hairColor: 3, beard: 1, glasses: 1, top: 0, topColor: 1, bg: 1 } },
  { name: 'Sofia', code: 'SOFIA9', base: 58, growth: 11, level: 26, pace: 4, skin: 'gold', last: 'Pull', pet: 'egg', petName: 'Yolko', streak: 12, avatar: { face: 0, skin: 2, hair: 5, hairColor: 2, beard: 0, glasses: 0, top: 1, topColor: 3, bg: 4 } },
];
const PR_LIFTS = ['Squat', 'Bench press', 'Deadlift', 'Overhead press', 'Pull-up', 'Hip thrust'];
const DEMO_NAMES = ['Jonas', 'Mia', 'Tariq', 'Sofia', 'Ben', 'Nora', 'Luca', 'Emma', 'Yusuf', 'Clara'];
const DEMO_WORKOUTS = ['Push', 'Pull', 'Legs', 'Upper body', 'Full body', 'Leg day'];

function demoFriend(p: DemoPerson, today: string): Friend {
  const r = rng(p.code);
  const hour = 3600_000;
  const recent: SocialEvent[] = [
    { kind: 'pr' as const, text: `set a PR on ${PR_LIFTS[Math.floor(r() * PR_LIFTS.length)]}`, at: Date.now() - (1 + Math.floor(r() * 20)) * hour },
    { kind: 'workout' as const, text: `finished ${p.last} · ${14 + Math.floor(r() * 10)} sets`, at: Date.now() - (2 + Math.floor(r() * 30)) * hour },
    { kind: 'quests' as const, text: 'cleared all daily quests', at: Date.now() - (5 + Math.floor(r() * 40)) * hour },
    ...(p.growth > 8 ? [{ kind: 'rank' as const, text: `reached ${stageFor(p.base).label}`, at: Date.now() - (20 + Math.floor(r() * 50)) * hour }] : []),
    ...(p.streak >= 7 ? [{ kind: 'streak' as const, text: `is on a ${p.streak}-day streak`, at: Date.now() - (2 + (p.streak % 9)) * hour }] : []),
  ].sort((a, b) => b.at - a.at);
  const strength = Math.min(100, Math.round(p.base * 1.1));
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
    pet: p.pet,
    petName: p.petName,
    avatar: p.avatar ?? avatarFromSeed(p.code),
    parts: { strength, consistency: Math.min(100, Math.round((p.pace * 4 * 100) / 14)), momentum: Math.min(100, Math.round(p.growth * 5)) },
    streak: p.streak,
    recent,
    updatedAt: Date.now() - Math.floor(r() * 5) * hour,
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
      pet: ['kettle', 'shaker', 'egg', 'dumbbell', 'avo', 'broc', 'plate', 'flame'][Math.floor(r() * 8)],
      petName: ['Bolt', 'Nugget', 'Chip', 'Mochi', 'Rocky', 'Pesto'][Math.floor(r() * 6)],
      streak: Math.floor(r() * 30),
    },
    today,
  );
}

export function demoFriends(today = todayKey()): Friend[] {
  return DEMO_PEOPLE.map((p) => demoFriend(p, today));
}

/** @deprecated Use demoFriends. */
export const demoCrew = demoFriends;

const DEMO_OPENERS: Record<string, string> = {
  'demo-LENA26': 'Saw your last session. What are you squatting these days?',
  'demo-MRC777': 'Bet you can’t out-train me this week 😤',
  'demo-AISHA1': 'Just hit a new deadlift PR!!',
  'demo-SOFIA9': 'Race you to Gold I this week?',
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
  if (DEMO || OFFLINE) return { id: `local-${randomCode()}`, code: randomCode(), secret: 'demo' };
  return api<Me>('/register', { method: 'POST', body: JSON.stringify({ snapshot }) });
}

export async function publish(me: Me, snapshot: SocialSnapshot): Promise<void> {
  if (DEMO || OFFLINE) return;
  await api('/me', { method: 'PUT', me, body: JSON.stringify({ snapshot }) });
}

export async function fetchFriends(me: Me, current: Friend[]): Promise<Friend[]> {
  // Demo friends are regenerated so they pick up new fields and fresh activity.
  if (DEMO) return current.map((f) => (f.id.startsWith('demo-') ? demoFromCode(f.code, todayKey()) : f));
  if (OFFLINE) return current.filter((f) => !f.id.startsWith('demo-'));
  return (await api<{ friends: Friend[] }>('/friends', { me })).friends;
}

export async function addFriend(me: Me, rawCode: string): Promise<Friend> {
  const code = normalizeCode(rawCode);
  if (code.length !== 6) throw new Error('Friend codes have 6 letters and numbers.');
  if (code === me.code) throw new Error('That’s your own code. Share it with a friend instead!');
  if (OFFLINE) throw new Error(OFFLINE_MESSAGE);
  if (DEMO) {
    await new Promise((r) => setTimeout(r, 500));
    return demoFromCode(code, todayKey());
  }
  return (await api<{ friend: Friend }>('/friends', { method: 'POST', me, body: JSON.stringify({ code }) })).friend;
}

export async function removeFriend(me: Me, id: string): Promise<void> {
  if (DEMO || OFFLINE) return;
  await api(`/friends/${encodeURIComponent(id)}`, { method: 'DELETE', me });
}

export async function sendMessage(me: Me, to: string, text: string): Promise<SocialMessage> {
  const clean = text.trim().slice(0, 500);
  if (DEMO || OFFLINE) return { id: `m-${Date.now()}-${randomCode()}`, from: me.id, to, text: clean, at: Date.now() };
  return (await api<{ message: SocialMessage }>('/messages', { method: 'POST', me, body: JSON.stringify({ to, text: clean }) })).message;
}

export async function fetchMessages(me: Me, friendId: string, since: number): Promise<SocialMessage[]> {
  if (DEMO || OFFLINE) return [];
  return (await api<{ messages: SocialMessage[] }>(`/messages/${encodeURIComponent(friendId)}?since=${since}`, { me })).messages;
}

export function unreadCount(social: SocialState | undefined, myId: string | undefined): number {
  if (!social || !myId) return 0;
  return Object.entries(social.chats).reduce((n, [fid, list]) => n + list.filter((m) => m.from !== myId && m.at > (social.read[fid] ?? 0)).length, 0);
}
