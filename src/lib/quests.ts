import { addDays, fromKey } from './dates';
import { daySummary } from './selectors';
import { doneSets, prExercises } from './training';
import type { AppState, QuestLogEntry } from './types';

/*
 * The daily loop that keeps people coming back (the same mechanics Duolingo,
 * Finch and Strava lean on): three small daily quests with a chest for
 * finishing all three, a weekly challenge, a streak that forgives a missed day
 * with earned freezes, and a pet whose mood reflects how you're looking after
 * yourself.
 */

export type QuestKind = 'nutrition' | 'training' | 'bonus';

export interface QuestDef {
  id: string;
  kind: QuestKind;
  title: string;
  icon: string;
  xp: number;
  /** Returns progress toward the goal for that day. */
  progress: (state: AppState, date: string) => { value: number; target: number };
}

const minutesOfCardio = (state: AppState, date: string) => state.exercises.filter((e) => e.date === date).reduce((n, e) => n + e.minutes, 0);
const workoutsOn = (state: AppState, date: string) => state.workouts.filter((w) => w.date === date && doneSets(w) > 0);

export const QUESTS: QuestDef[] = [
  { id: 'meals3', kind: 'nutrition', title: 'Track 3 meals', icon: 'restaurant', xp: 40, progress: (s, d) => ({ value: new Set(daySummary(s, d).entries.map((e) => e.meal)).size, target: 3 }) },
  { id: 'breakfast', kind: 'nutrition', title: 'Log your breakfast', icon: 'sunny', xp: 25, progress: (s, d) => ({ value: daySummary(s, d).entries.some((e) => e.meal === 'breakfast') ? 1 : 0, target: 1 }) },
  { id: 'protein', kind: 'nutrition', title: 'Hit your protein goal', icon: 'egg', xp: 60, progress: (s, d) => ({ value: Math.round(daySummary(s, d).totals.protein), target: s.goals?.protein ?? 120 }) },
  { id: 'fiber', kind: 'nutrition', title: 'Eat 25 g of fiber', icon: 'leaf', xp: 40, progress: (s, d) => ({ value: Math.round(daySummary(s, d).totals.fiber ?? 0), target: 25 }) },
  { id: 'items5', kind: 'nutrition', title: 'Log 5 foods', icon: 'list', xp: 30, progress: (s, d) => ({ value: daySummary(s, d).entries.length, target: 5 }) },
  { id: 'gym', kind: 'training', title: 'Go to the gym', icon: 'barbell', xp: 80, progress: (s, d) => ({ value: workoutsOn(s, d).length, target: 1 }) },
  { id: 'cardio', kind: 'training', title: 'Do 20 min of cardio', icon: 'bicycle', xp: 60, progress: (s, d) => ({ value: minutesOfCardio(s, d), target: 20 }) },
  { id: 'sets12', kind: 'training', title: 'Finish 12 sets', icon: 'checkmark-done', xp: 70, progress: (s, d) => ({ value: workoutsOn(s, d).reduce((n, w) => n + doneSets(w), 0), target: 12 }) },
  { id: 'steps', kind: 'training', title: 'Walk 7,000 steps', icon: 'walk', xp: 40, progress: (s, d) => ({ value: s.steps[d] ?? 0, target: 7000 }) },
  { id: 'water', kind: 'bonus', title: 'Drink 1.5 L of water', icon: 'water', xp: 25, progress: (s, d) => ({ value: s.water[d] ?? 0, target: 1500 }) },
  { id: 'weigh', kind: 'bonus', title: 'Log your weight', icon: 'scale', xp: 20, progress: (s, d) => ({ value: s.weights[d] ? 1 : 0, target: 1 }) },
  {
    id: 'pr',
    kind: 'bonus',
    title: 'Set a new PR',
    icon: 'trophy',
    xp: 100,
    progress: (s, d) => {
      const sorted = [...s.workouts].sort((a, b) => a.startedAt - b.startedAt);
      const hit = sorted.some((w, i) => w.date === d && prExercises(w, sorted.slice(0, i)).length > 0);
      return { value: hit ? 1 : 0, target: 1 };
    },
  },
];

export const CHEST_XP = 50;
export const WEEKLY_XP = 150;
export const WEEKLY_TARGET = 3;

function seed(text: string): number {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Today's three quests: one food, one training, one bonus. Same for everyone on a given day. */
export function dailyQuests(date: string): QuestDef[] {
  const h = seed(date);
  const pick = (kind: QuestKind, salt: number, not: string[] = []) => {
    const pool = QUESTS.filter((q) => q.kind === kind && !not.includes(q.id));
    return pool[(h >>> salt) % pool.length];
  };
  const food = pick('nutrition', 0);
  const training = pick('training', 5);
  // The bonus slot mixes bonus quests with a second nutrition quest for variety.
  const bonusPool = [...QUESTS.filter((q) => q.kind === 'bonus'), ...QUESTS.filter((q) => q.kind === 'nutrition' && q.id !== food.id)];
  const bonus = bonusPool[(h >>> 11) % bonusPool.length];
  return [food, training, bonus];
}

export interface QuestState {
  quest: QuestDef;
  value: number;
  target: number;
  done: boolean;
  claimed: boolean;
}

export const isClaimed = (log: QuestLogEntry[] | undefined, id: string, date: string) => (log ?? []).some((q) => q.id === id && q.date === date);

export function questStates(state: AppState, date: string): QuestState[] {
  return dailyQuests(date).map((quest) => {
    const { value, target } = quest.progress(state, date);
    return { quest, value, target, done: value >= target, claimed: isClaimed(state.questLog, `q:${quest.id}`, date) };
  });
}

export function mondayOf(date: string): string {
  return addDays(date, -((fromKey(date).getDay() + 6) % 7));
}

/** Weekly challenge: train (gym or 20+ min cardio) three times this week. */
export function weeklyChallenge(state: AppState, date: string) {
  const monday = mondayOf(date);
  const sunday = addDays(monday, 6);
  const days = new Set<string>();
  for (const w of state.workouts) if (w.date >= monday && w.date <= sunday && doneSets(w) > 0) days.add(w.date);
  for (const e of state.exercises) if (e.date >= monday && e.date <= sunday && e.minutes >= 20) days.add(e.date);
  const value = days.size;
  return { monday, value, target: WEEKLY_TARGET, done: value >= WEEKLY_TARGET, claimed: isClaimed(state.questLog, 'week', monday), xp: WEEKLY_XP };
}

// ---------- Streak with freezes ----------

/** Days with anything logged: food, a workout, cardio, water or weight. */
export function activeDays(state: AppState): Set<string> {
  const days = new Set<string>();
  state.entries.forEach((e) => days.add(e.date));
  state.workouts.forEach((w) => days.add(w.date));
  state.exercises.forEach((e) => days.add(e.date));
  Object.entries(state.water).forEach(([d, ml]) => ml > 0 && days.add(d));
  Object.keys(state.weights).forEach((d) => days.add(d));
  return days;
}

export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;

/**
 * Current streak where a missed day is covered by a freeze. You earn one freeze
 * for every 7 active days in a row (holding at most 2). Today doesn't break the
 * streak until it's over.
 */
export function streakInfo(days: Set<string>, today: string): { streak: number; freezes: number; frozen: string[] } {
  const sorted = [...days].filter((d) => d <= today).sort();
  if (!sorted.length) return { streak: 0, freezes: 0, frozen: [] };
  let streak = 0;
  let run = 0;
  let freezes = 0;
  let frozen: string[] = [];
  let day = sorted[0];
  const end = days.has(today) ? today : addDays(today, -1);
  while (day <= end) {
    if (days.has(day)) {
      streak++;
      run++;
      if (run % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
    } else if (freezes > 0) {
      freezes--;
      frozen.push(day);
      run = 0;
    } else {
      streak = 0;
      run = 0;
      frozen = [];
    }
    day = addDays(day, 1);
  }
  return { streak, freezes, frozen };
}

// ---------- Pet care ----------

export interface PetCare {
  /** 0–1: meals logged today. */
  fed: number;
  /** 0–1: trained recently. */
  fit: number;
  /** 0–1: water today. */
  hydrated: number;
  mood: 'happy' | 'pumped' | 'proud' | 'hungry' | 'sleepy' | 'wink';
  line: string;
}

/** How your pet is doing, from how you're looking after yourself today. */
export function petCare(state: AppState, date: string, hour = new Date().getHours()): PetCare {
  const day = daySummary(state, date);
  const meals = new Set(day.entries.map((e) => e.meal)).size;
  const expectedMeals = hour < 10 ? 1 : hour < 14 ? 2 : 3;
  const fed = Math.min(1, meals / expectedMeals);
  const lastTrain = [...state.workouts.map((w) => w.date), ...state.exercises.filter((e) => e.minutes >= 15).map((e) => e.date)].filter((d) => d <= date).sort().pop();
  const daysSince = lastTrain ? Math.round((fromKey(date).getTime() - fromKey(lastTrain).getTime()) / 86_400_000) : 99;
  const fit = daysSince === 0 ? 1 : daysSince <= 1 ? 0.8 : daysSince <= 2 ? 0.55 : daysSince <= 4 ? 0.3 : 0.1;
  const hydrated = Math.min(1, (state.water[date] ?? 0) / 2000);
  const trainedToday = daysSince === 0;
  if (trainedToday && fed >= 1) return { fed, fit, hydrated, mood: 'proud', line: 'Trained and fed. Best day ever!' };
  if (trainedToday) return { fed, fit, hydrated, mood: 'pumped', line: meals ? 'That workout was awesome. Refuel me!' : 'We trained! Now feed us both.' };
  if (hour >= 11 && meals === 0) return { fed, fit, hydrated, mood: 'hungry', line: 'My tummy’s rumbling. Log a meal?' };
  if (daysSince >= 3) return { fed, fit, hydrated, mood: 'sleepy', line: `${daysSince >= 99 ? 'We haven’t trained yet' : `${daysSince} days without training`}. Wake me up with a workout!` };
  if (hydrated < 0.3 && hour >= 13) return { fed, fit, hydrated, mood: 'wink', line: 'A glass of water for me? And for you.' };
  return { fed, fit, hydrated, mood: 'happy', line: fed >= 1 ? 'All fed up. In the good way.' : 'Doing great. Keep logging!' };
}
