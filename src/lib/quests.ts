import { addDays, todayKey } from './dates';
import { daySummary } from './selectors';
import { doneSets, prExercises } from './training';
import { mondayOf, planDay, plannedSessionsInWeek, trainedOn, weekOf, type Session } from './plan';
import type { AppState, QuestLogEntry } from './types';

export { mondayOf } from './plan';

/*
 * The daily loop: three small, realistic quests that follow your training
 * plan (train on a gym day, recover on a rest day), a chest for finishing all
 * three, a weekly challenge to hit every planned session, a streak that
 * forgives a missed day with earned freezes, and a pet whose mood reflects how
 * you're looking after yourself.
 *
 * Quests are things a normal person can do every day. Nothing asks for a PR or
 * an arbitrary number of logged foods; a PR is at most a weekly bonus. Anything
 * the app can't measure (sleep, a light stretch) is a tap-to-confirm check-in.
 */

export type QuestKind = 'move' | 'nutrition' | 'recovery';

export interface QuestDef {
  id: string;
  kind: QuestKind;
  title: string;
  /** One line under the title: what counts. */
  detail: string;
  icon: string;
  xp: number;
  /** Set when the user confirms it by tapping: the button label ("I slept well"). */
  confirm?: string;
  /** Progress toward the goal for that day (a confirmed check-in always counts as done). */
  progress: (state: AppState, date: string) => { value: number; target: number };
}

const checkedIn = (s: AppState, d: string, id: string) => (s.checkins?.[d] ?? []).includes(id);
const cardioMinutes = (s: AppState, d: string, ids = new Set(s.workouts.map((w) => w.id))) =>
  // Finished workouts also add an exercise entry with the same id; don't count those as cardio.
  s.exercises.filter((e) => e.date === d && !ids.has(e.id)).reduce((n, e) => n + e.minutes, 0);
const binary = (on: boolean) => ({ value: on ? 1 : 0, target: 1 });

// ---------- Move slot: follows the plan ----------

export const trainQuest = (session?: Session): QuestDef => ({
  id: 'train',
  kind: 'move',
  title: session ? `Train: ${session.name} day` : 'Get a workout in',
  detail: session ? 'Finish today’s planned session' : 'Any strength session counts',
  icon: 'barbell',
  xp: 80,
  progress: (s, d) => binary(trainedOn(s, d)),
});

export const REST_QUEST: QuestDef = {
  id: 'rest',
  kind: 'move',
  title: 'Rest properly',
  detail: 'Walk or stretch 10 min, keep it light',
  icon: 'leaf',
  xp: 50,
  confirm: 'Done',
  // A logged walk or mobility session of 10+ minutes counts automatically.
  progress: (s, d) => binary(checkedIn(s, d, 'rest') || cardioMinutes(s, d) >= 10),
};

export const MOVE_QUEST: QuestDef = {
  id: 'move',
  kind: 'move',
  title: 'Move for 20 minutes',
  detail: 'A workout, a run, a bike ride',
  icon: 'walk',
  xp: 60,
  progress: (s, d) => ({ value: trainedOn(s, d) ? 20 : Math.min(20, cardioMinutes(s, d)), target: 20 }),
};

// ---------- Nutrition slot ----------

export const PROTEIN_QUEST: QuestDef = {
  id: 'protein',
  kind: 'nutrition',
  title: 'Hit your protein goal',
  detail: 'Log what you eat to track it',
  icon: 'egg',
  xp: 60,
  progress: (s, d) => ({ value: Math.round(daySummary(s, d).totals.protein), target: s.goals?.protein ?? 120 }),
};

export const VEG_QUEST: QuestDef = {
  id: 'veg',
  kind: 'nutrition',
  title: 'Eat your veg',
  detail: '3 handfuls of veg or 25 g fiber',
  icon: 'nutrition',
  xp: 40,
  confirm: 'I did',
  progress: (s, d) => binary(checkedIn(s, d, 'veg') || (daySummary(s, d).totals.fiber ?? 0) >= 25),
};

export const BREAKFAST_QUEST: QuestDef = {
  id: 'breakfast',
  kind: 'nutrition',
  title: 'Log your breakfast',
  detail: 'Start the day with a real meal',
  icon: 'sunny',
  xp: 25,
  progress: (s, d) => binary(daySummary(s, d).entries.some((e) => e.meal === 'breakfast')),
};

export const MEALS_QUEST: QuestDef = {
  id: 'meals3',
  kind: 'nutrition',
  title: 'Log breakfast, lunch and dinner',
  detail: 'Three meals, snacks optional',
  icon: 'restaurant',
  xp: 40,
  progress: (s, d) => {
    const meals = new Set(daySummary(s, d).entries.map((e) => e.meal));
    return { value: (['breakfast', 'lunch', 'dinner'] as const).filter((m) => meals.has(m)).length, target: 3 };
  },
};

// ---------- Recovery / habits slot ----------

export const SLEEP_QUEST: QuestDef = {
  id: 'sleep',
  kind: 'recovery',
  title: 'Sleep 7+ hours',
  detail: 'Morning check-in: did you sleep well?',
  icon: 'moon',
  xp: 40,
  confirm: 'I slept well',
  progress: (s, d) => binary(checkedIn(s, d, 'sleep')),
};

export const WATER_QUEST: QuestDef = {
  id: 'water',
  kind: 'recovery',
  title: 'Drink 2 L of water',
  detail: 'Log glasses on the Today tab',
  icon: 'water',
  xp: 30,
  progress: (s, d) => ({ value: s.water[d] ?? 0, target: 2000 }),
};

export const STEPS_QUEST: QuestDef = {
  id: 'steps',
  kind: 'recovery',
  title: 'Get your steps in',
  detail: 'A walk after a meal does wonders',
  icon: 'footsteps',
  xp: 40,
  progress: (s, d) => ({ value: s.steps[d] ?? 0, target: s.goals?.steps || 8000 }),
};

export const CARDIO_QUEST: QuestDef = {
  id: 'cardio',
  kind: 'recovery',
  title: 'Add 20 min of cardio',
  detail: 'Bike, incline walk or rower after lifting',
  icon: 'bicycle',
  xp: 50,
  progress: (s, d) => ({ value: cardioMinutes(s, d), target: 20 }),
};

/** Every quest that can show up (the move quest's title changes with the plan). */
export const QUESTS: QuestDef[] = [trainQuest(), REST_QUEST, MOVE_QUEST, PROTEIN_QUEST, VEG_QUEST, BREAKFAST_QUEST, MEALS_QUEST, SLEEP_QUEST, WATER_QUEST, STEPS_QUEST, CARDIO_QUEST];

export const CHEST_XP = 50;
export const WEEKLY_XP = 150;
export const WEEKLY_TARGET = 3;
export const WEEKLY_PR_XP = 100;

function seed(text: string): number {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * Today's three quests: one to move (from the plan), one for food, one for
 * recovery. The pick is stable for a date so it doesn't reshuffle while you
 * log. Without a plan the move slot is a generic "get a workout in" / "move".
 */
export function dailyQuests(date: string, state?: Pick<AppState, 'plan' | 'routines'>): QuestDef[] {
  const h = seed(date);
  const pick = <T,>(pool: T[], salt: number) => pool[(h >>> salt) % pool.length];
  const day = state ? planDay(state, date) : ({ kind: 'none' } as const);

  const move = day.kind === 'train' ? trainQuest(day.session) : day.kind === 'rest' ? REST_QUEST : pick([trainQuest(), MOVE_QUEST], 3);
  // Training days lean on protein; rest days on eating well generally.
  const food = pick(day.kind === 'train' ? [PROTEIN_QUEST, PROTEIN_QUEST, VEG_QUEST, BREAKFAST_QUEST] : [PROTEIN_QUEST, VEG_QUEST, BREAKFAST_QUEST, MEALS_QUEST], 7);
  // Sleep comes up most often: it's the recovery habit that matters most.
  const recovery = pick(day.kind === 'train' ? [SLEEP_QUEST, SLEEP_QUEST, WATER_QUEST, CARDIO_QUEST] : [SLEEP_QUEST, SLEEP_QUEST, WATER_QUEST, STEPS_QUEST], 13);
  return [move, food, recovery];
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
  return dailyQuests(date, state).map((quest) => {
    const { value, target } = quest.progress(state, date);
    return { quest, value, target, done: value >= target, claimed: isClaimed(state.questLog, `q:${quest.id}`, date) };
  });
}

/**
 * Weekly challenge. With a plan: hit every planned session this week (a
 * moved session still counts, it's the number that matters). Without one:
 * train three times (gym, or 20+ min cardio).
 */
export function weeklyChallenge(state: AppState, date: string) {
  const monday = mondayOf(date);
  const sunday = addDays(monday, 6);
  const planned = state.plan ? plannedSessionsInWeek(state, date).length : 0;
  const target = planned > 0 ? planned : WEEKLY_TARGET;
  const days = new Set<string>();
  for (const w of state.workouts) if (w.date >= monday && w.date <= sunday && doneSets(w) > 0) days.add(w.date);
  if (!planned) for (const e of state.exercises) if (e.date >= monday && e.date <= sunday && e.minutes >= 20) days.add(e.date);
  const value = Math.min(days.size, target);
  const title = planned > 0 ? `Hit all ${target} planned sessions` : `Train ${target}× this week`;
  return { monday, value, target, title, done: value >= target, claimed: isClaimed(state.questLog, 'week', monday), xp: WEEKLY_XP };
}

/** Weekly bonus: any new personal record this week. Claimed as "pr-week" on the Monday. */
export function weeklyPr(state: AppState, date: string) {
  const monday = mondayOf(date);
  const week = new Set(weekOf(date));
  const sorted = [...state.workouts].sort((a, b) => a.startedAt - b.startedAt);
  const done = sorted.some((w, i) => week.has(w.date) && prExercises(w, sorted.slice(0, i)).length > 0);
  return { monday, done, claimed: isClaimed(state.questLog, 'pr-week', monday), xp: WEEKLY_PR_XP };
}

// ---------- Streak with freezes ----------

/**
 * Days that keep the streak: anything logged (food, a workout, cardio, water,
 * weight, a check-in), plus planned rest days since the plan was set. Resting
 * when your plan says rest is sticking to the plan, so it counts as a kept day
 * rather than a gap. Planned rest days only count up to today.
 */
export function activeDays(state: AppState, today = todayKey()): Set<string> {
  const days = new Set<string>();
  state.entries.forEach((e) => days.add(e.date));
  state.workouts.forEach((w) => days.add(w.date));
  state.exercises.forEach((e) => days.add(e.date));
  Object.entries(state.water).forEach(([d, ml]) => ml > 0 && days.add(d));
  Object.keys(state.weights).forEach((d) => days.add(d));
  Object.entries(state.checkins ?? {}).forEach(([d, ids]) => ids.length && days.add(d));
  const plan = state.plan;
  if (plan && plan.since <= today && plan.week.some(Boolean)) {
    // Bounded walk: at most a year back.
    for (let d = plan.since > addDays(today, -366) ? plan.since : addDays(today, -366); d <= today; d = addDays(d, 1)) {
      if (planDay(state, d).kind === 'rest') days.add(d);
    }
  }
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
  /** 0–1: trained recently (planned rest days don't count against it). */
  fit: number;
  /** 0–1: water today. */
  hydrated: number;
  /** 0–1: slept well (check-in) and resting on a planned rest day. */
  rested: number;
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
  // Days since training, not counting planned rest days in between.
  let daysSince = 99;
  if (lastTrain) {
    daysSince = 0;
    for (let d = lastTrain; d < date; ) {
      d = addDays(d, 1);
      if (planDay(state, d).kind !== 'rest') daysSince++;
    }
  }
  const fit = daysSince === 0 ? 1 : daysSince <= 1 ? 0.8 : daysSince <= 2 ? 0.55 : daysSince <= 4 ? 0.3 : 0.1;
  const hydrated = Math.min(1, (state.water[date] ?? 0) / 2000);
  const restDay = planDay(state, date).kind === 'rest';
  const slept = checkedIn(state, date, 'sleep');
  const rested = Math.min(1, (slept ? 0.6 : 0.2) + (restDay || checkedIn(state, date, 'rest') ? 0.4 : 0.2));
  const trainedToday = lastTrain === date;
  const base = { fed, fit, hydrated, rested };
  if (trainedToday && fed >= 1) return { ...base, mood: 'proud', line: 'Trained and fed. Best day ever!' };
  if (trainedToday) return { ...base, mood: 'pumped', line: meals ? 'That workout was awesome. Refuel me!' : 'We trained! Now feed us both.' };
  if (hour >= 11 && meals === 0) return { ...base, mood: 'hungry', line: 'My tummy’s rumbling. Log a meal?' };
  if (restDay && daysSince < 3) return { ...base, mood: 'happy', line: slept ? 'Rest day and a good night’s sleep. Growing!' : 'Rest day. Muscles grow while we chill.' };
  if (daysSince >= 3) return { ...base, mood: 'sleepy', line: `${daysSince >= 99 ? 'We haven’t trained yet' : `${daysSince} days without training`}. Wake me up with a workout!` };
  if (hydrated < 0.3 && hour >= 13) return { ...base, mood: 'wink', line: 'A glass of water for me? And for you.' };
  return { ...base, mood: 'happy', line: fed >= 1 ? 'All fed up. In the good way.' : 'Doing great. Keep logging!' };
}
