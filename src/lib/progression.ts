import { addDays } from './dates';
import { doneSets, oneRepMax, prExercises, workoutVolume } from './training';
import type { Sex, Workout } from './types';

/*
 * Training progression: a strength RANK from how strong you are relative to
 * your body weight, and a LEVEL from the work you put in (XP). Ranks are the
 * stages on the path; levels keep moving even between rank-ups.
 */

export type LiftKey = 'squat' | 'bench' | 'deadlift' | 'ohp' | 'pullup' | 'dip' | 'pushup';

interface LiftDef {
  key: LiftKey;
  label: string;
  /** 'ratio': best estimated 1RM ÷ body weight. 'reps': best set of bodyweight reps. */
  kind: 'ratio' | 'reps';
  /** Exercise ids that count, with a factor converting their best to this lift. */
  sources: Record<string, number>;
  /** Beginner, novice, intermediate, advanced, elite thresholds. */
  standards: Record<Sex, [number, number, number, number, number]>;
}

// Thresholds follow widely used strength standards for adult lifters (1RM as a
// multiple of body weight, or strict reps). They are guides, not grades.
export const LIFTS: LiftDef[] = [
  { key: 'squat', label: 'Squat', kind: 'ratio', sources: { squat: 1, 'front-squat': 1 / 0.85 }, standards: { male: [0.75, 1.25, 1.5, 2.25, 2.75], female: [0.5, 0.75, 1.25, 1.75, 2.25] } },
  { key: 'bench', label: 'Bench press', kind: 'ratio', sources: { 'bench-press': 1, 'incline-bench': 1 / 0.85, 'close-grip-bench': 1 / 0.9 }, standards: { male: [0.5, 0.75, 1.0, 1.5, 2.0], female: [0.25, 0.5, 0.75, 1.0, 1.5] } },
  { key: 'deadlift', label: 'Deadlift', kind: 'ratio', sources: { deadlift: 1, rdl: 1 / 0.75 }, standards: { male: [1.0, 1.5, 2.0, 2.5, 3.0], female: [0.5, 1.0, 1.25, 1.75, 2.5] } },
  { key: 'ohp', label: 'Overhead press', kind: 'ratio', sources: { ohp: 1 }, standards: { male: [0.35, 0.55, 0.75, 1.05, 1.35], female: [0.2, 0.35, 0.5, 0.75, 1.0] } },
  { key: 'pullup', label: 'Pull-ups', kind: 'reps', sources: { 'pull-up': 1, 'chin-up': 1 }, standards: { male: [1, 5, 10, 15, 22], female: [0.5, 1, 4, 8, 13] } },
  { key: 'dip', label: 'Dips', kind: 'reps', sources: { dip: 1 }, standards: { male: [2, 8, 15, 25, 35], female: [0.5, 2, 6, 12, 20] } },
  { key: 'pushup', label: 'Push-ups', kind: 'reps', sources: { 'push-up': 1 }, standards: { male: [5, 15, 30, 45, 65], female: [1, 5, 15, 25, 40] } },
];

export const LEVEL_NAMES = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'] as const;

/** Maps a raw value onto 0–100: beginner = 20, novice = 40 … elite = 100. */
export function standardScore(value: number, standards: readonly number[]): number {
  if (value <= 0) return 0;
  if (value < standards[0]) return (value / standards[0]) * 20;
  for (let i = 1; i < standards.length; i++) {
    if (value < standards[i]) return 20 * i + ((value - standards[i - 1]) / (standards[i] - standards[i - 1])) * 20;
  }
  return 100;
}

export interface LiftResult {
  key: LiftKey;
  label: string;
  kind: 'ratio' | 'reps';
  /** Best e1RM in kg (ratio lifts) or best reps. */
  best: number;
  score: number;
  /** Index into LEVEL_NAMES reached, or -1 below beginner. */
  level: number;
  /** Next threshold as kg (ratio lifts) or reps; null at elite. */
  next: number | null;
  date: string;
}

/** Each tracked lift's best performance up to (and including) `asOf`. */
export function liftResults(workouts: Workout[], bodyKg: number, sex: Sex, asOf?: string): LiftResult[] {
  const out: LiftResult[] = [];
  for (const lift of LIFTS) {
    let best = 0;
    let date = '';
    for (const w of workouts) {
      if (asOf && w.date > asOf) continue;
      for (const e of w.exercises) {
        const factor = lift.sources[e.exerciseId];
        if (!factor) continue;
        for (const s of e.sets) {
          if (!s.done) continue;
          const v = lift.kind === 'reps' ? s.reps * factor : oneRepMax(s.kg, s.reps) * factor;
          if (v > best) {
            best = v;
            date = w.date;
          }
        }
      }
    }
    if (best <= 0) continue;
    const std = lift.standards[sex];
    const value = lift.kind === 'ratio' ? best / Math.max(30, bodyKg) : best;
    const level = std.filter((t) => value >= t).length - 1;
    const nextT = std.find((t) => value < t);
    out.push({
      key: lift.key,
      label: lift.label,
      kind: lift.kind,
      best,
      score: standardScore(value, std),
      level,
      next: nextT === undefined ? null : lift.kind === 'ratio' ? nextT * bodyKg : nextT,
      date,
    });
  }
  return out;
}

/**
 * Overall strength score (0–100). The strongest lifts count most, but every
 * lift you train pulls on it, so a balanced lifter ranks higher than one who
 * only benches.
 */
export function strengthScore(results: LiftResult[]): number {
  if (!results.length) return 0;
  const sorted = results.map((r) => r.score).sort((a, b) => b - a);
  const top = sorted.slice(0, 4);
  const avg = top.reduce((a, b) => a + b, 0) / top.length;
  // Fewer than three lifts tracked caps you a little: rank reflects all-round strength.
  const coverage = Math.min(1, 0.7 + 0.1 * results.length);
  return Math.round(avg * coverage * 10) / 10;
}

export interface Tier {
  key: string;
  name: string;
  min: number;
  color: string;
  /** Second color for gradients and glows. */
  glow: string;
  motto: string;
}

export const TIERS: Tier[] = [
  { key: 'rookie', name: 'Rookie', min: 0, color: '#8FA39A', glow: '#C9D8D0', motto: 'Every legend logs a first set.' },
  { key: 'iron', name: 'Iron', min: 12, color: '#6F7E88', glow: '#AAB8C2', motto: 'Raw metal. Forge it.' },
  { key: 'bronze', name: 'Bronze', min: 24, color: '#B8733F', glow: '#E7A874', motto: 'The habit is real now.' },
  { key: 'silver', name: 'Silver', min: 36, color: '#9AA7B4', glow: '#DCE4EC', motto: 'Stronger than most people you know.' },
  { key: 'gold', name: 'Gold', min: 48, color: '#D9A21E', glow: '#FFD66B', motto: 'Serious lifter territory.' },
  { key: 'platinum', name: 'Platinum', min: 60, color: '#2FB2A8', glow: '#8FF0E6', motto: 'The gym regulars notice.' },
  { key: 'diamond', name: 'Diamond', min: 72, color: '#4C8DF6', glow: '#A8CBFF', motto: 'Advanced. Rare air.' },
  { key: 'champion', name: 'Champion', min: 84, color: '#9B5CF6', glow: '#D3B8FF', motto: 'Competition-level strength.' },
  { key: 'titan', name: 'Titan', min: 94, color: '#F04E6E', glow: '#FFB0C0', motto: 'Elite. Top of the mountain.' },
];

export const DIVISIONS = ['III', 'II', 'I'] as const;

export interface Stage {
  index: number;
  tier: Tier;
  /** 'III' | 'II' | 'I', or '' for the final tier. */
  division: string;
  min: number;
  label: string;
}

/** Every stage on the path: three divisions per tier, one final Titan stage. */
export const STAGES: Stage[] = (() => {
  const out: Stage[] = [];
  TIERS.forEach((tier, t) => {
    const last = t === TIERS.length - 1;
    if (last) {
      out.push({ index: out.length, tier, division: '', min: tier.min, label: tier.name });
      return;
    }
    const span = TIERS[t + 1].min - tier.min;
    DIVISIONS.forEach((d, i) => {
      const min = Math.round((tier.min + (span * i) / 3) * 10) / 10;
      out.push({ index: out.length, tier, division: d, min, label: `${tier.name} ${d}` });
    });
  });
  return out;
})();

export function stageFor(score: number): Stage {
  let s = STAGES[0];
  for (const st of STAGES) if (score >= st.min) s = st;
  return s;
}

/** Share of the way from the current stage to the next (0–1). */
export function stageProgress(score: number): number {
  const s = stageFor(score);
  const next = STAGES[s.index + 1];
  if (!next) return 1;
  return Math.max(0, Math.min(1, (score - s.min) / (next.min - s.min)));
}

// ---------- XP & levels ----------

/** XP for one finished workout, given the workouts before it (for PRs). */
export function workoutXp(w: Workout, earlier: Workout[]): number {
  const sets = doneSets(w);
  if (!sets) return 0;
  const volumeBonus = Math.min(60, Math.floor(workoutVolume(w) / 500) * 5);
  const prs = prExercises(w, earlier).length;
  return 40 + sets * 8 + volumeBonus + prs * 60;
}

export function totalXp(workouts: Workout[]): number {
  const sorted = [...workouts].sort((a, b) => a.startedAt - b.startedAt);
  let xp = 0;
  sorted.forEach((w, i) => (xp += workoutXp(w, sorted.slice(0, i))));
  // Consistency bonus: 50 XP for every week with 3+ workouts.
  const weeks = new Map<string, number>();
  for (const w of sorted) {
    const d = new Date(w.startedAt);
    const monday = addDays(w.date, -((d.getDay() + 6) % 7));
    weeks.set(monday, (weeks.get(monday) ?? 0) + 1);
  }
  for (const n of weeks.values()) if (n >= 3) xp += 50;
  return xp;
}

/** Total XP needed to reach `level` (level 1 needs 0). */
export function xpForLevel(level: number): number {
  return level <= 1 ? 0 : Math.round(120 * Math.pow(level - 1, 1.55));
}

export function levelFor(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const base = xpForLevel(level);
  return { level, into: xp - base, needed: xpForLevel(level + 1) - base };
}

// ---------- Summary ----------

/** Extra activity that feeds the rank and XP beyond gym workouts. */
export interface ProgressExtras {
  /** Cardio sessions (date, minutes). */
  cardio?: { date: string; minutes: number }[];
  /** Days a daily quest was completed. */
  questDays?: string[];
  /** XP from quests, chests and challenges. */
  bonusXp?: number;
}

export interface RankParts {
  /** Lift strength vs. body weight (0–100). */
  strength: number;
  /** How often you train: sessions in the last 4 weeks (0–100). */
  consistency: number;
  /** PRs and completed quests lately (0–100). */
  momentum: number;
}

/** How much each part counts toward the rank score. */
export const RANK_WEIGHTS: RankParts = { strength: 0.6, consistency: 0.25, momentum: 0.15 };
/** 14 sessions in 4 weeks (3–4 a week) maxes out consistency. */
export const SESSIONS_FOR_MAX = 14;

function prDates(workouts: Workout[]): string[] {
  const sorted = [...workouts].sort((a, b) => a.startedAt - b.startedAt);
  const out: string[] = [];
  sorted.forEach((w, i) => prExercises(w, sorted.slice(0, i)).forEach(() => out.push(w.date)));
  return out;
}

/** Gym workouts plus cardio of 15+ minutes between two dates (inclusive). */
export function sessionsBetween(workouts: Workout[], extras: ProgressExtras, from: string, to: string): number {
  const inWindow = (d: string) => d >= from && d <= to;
  return workouts.filter((w) => inWindow(w.date) && doneSets(w) > 0).length + (extras.cardio ?? []).filter((c) => c.minutes >= 15 && inWindow(c.date)).length;
}

export function rankParts(workouts: Workout[], bodyKg: number, sex: Sex, asOf: string, extras: ProgressExtras = {}, prs = prDates(workouts)): RankParts {
  const from28 = addDays(asOf, -27);
  const from14 = addDays(asOf, -13);
  const inWindow = (d: string, from: string) => d >= from && d <= asOf;
  const sessions = sessionsBetween(workouts, extras, from28, asOf);
  const recentPrs = prs.filter((d) => inWindow(d, from28)).length;
  const questDays = new Set((extras.questDays ?? []).filter((d) => inWindow(d, from14))).size;
  return {
    strength: strengthScore(liftResults(workouts, bodyKg, sex, asOf)),
    consistency: Math.min(100, Math.round((sessions / SESSIONS_FOR_MAX) * 100)),
    momentum: Math.min(100, recentPrs * 12 + questDays * 5),
  };
}

export function rankScore(p: RankParts): number {
  return Math.round((p.strength * RANK_WEIGHTS.strength + p.consistency * RANK_WEIGHTS.consistency + p.momentum * RANK_WEIGHTS.momentum) * 10) / 10;
}

export interface Progression {
  score: number;
  parts: RankParts;
  stage: Stage;
  progress: number;
  lifts: LiftResult[];
  xp: number;
  level: number;
  levelInto: number;
  levelNeeded: number;
  /** Rank score at the end of each of the last 8 weeks, oldest first. */
  history: { date: string; score: number }[];
  weakest: LiftResult | null;
  /** Sessions (workouts + cardio) in the last 4 weeks. */
  sessions28: number;
  prs28: number;
}

export function progression(workouts: Workout[], bodyKg: number, sex: Sex, today: string, extras: ProgressExtras = {}): Progression {
  const lifts = liftResults(workouts, bodyKg, sex);
  const prs = prDates(workouts);
  const parts = rankParts(workouts, bodyKg, sex, today, extras, prs);
  const score = rankScore(parts);
  const xp = totalXp(workouts) + (extras.bonusXp ?? 0);
  const lv = levelFor(xp);
  const history = Array.from({ length: 8 }, (_, i) => {
    const date = addDays(today, -7 * (7 - i));
    return { date, score: i === 7 ? score : rankScore(rankParts(workouts, bodyKg, sex, date, extras, prs)) };
  });
  const weakest = lifts.length > 1 ? [...lifts].sort((a, b) => a.score - b.score)[0] : null;
  const from28 = addDays(today, -27);
  return {
    score,
    parts,
    stage: stageFor(score),
    progress: stageProgress(score),
    lifts,
    xp,
    level: lv.level,
    levelInto: lv.into,
    levelNeeded: lv.needed,
    history,
    weakest,
    sessions28: sessionsBetween(workouts, extras, from28, today),
    prs28: prs.filter((d) => d >= from28 && d <= today).length,
  };
}

/** Everything the app state knows, fed into the rank. */
export function stateProgression(
  state: { workouts: Workout[]; exercises: { date: string; minutes: number }[]; profile: { weightKg: number; sex: Sex } | null; questLog?: { date: string; xp: number; id: string }[] },
  today: string,
): Progression {
  const log = state.questLog ?? [];
  return progression(state.workouts, state.profile?.weightKg ?? 75, state.profile?.sex ?? 'male', today, {
    cardio: state.exercises,
    questDays: log.filter((q) => q.id.startsWith('q:')).map((q) => q.date),
    bonusXp: log.reduce((n, q) => n + q.xp, 0),
  });
}
