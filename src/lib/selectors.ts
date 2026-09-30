import type { AppState, DiaryEntry, ExerciseEntry, Nutrients } from './types';
import { sumItems } from './nutrition';

export interface DaySummary {
  entries: DiaryEntry[];
  totals: Nutrients;
  waterMl: number;
  steps: number;
  exercises: ExerciseEntry[];
  burned: number;
}

export function daySummary(state: AppState, date: string): DaySummary {
  const entries = state.entries.filter((e) => e.date === date);
  const exercises = state.exercises.filter((e) => e.date === date);
  return {
    entries,
    totals: sumItems(entries),
    waterMl: state.water[date] ?? 0,
    steps: state.steps[date] ?? 0,
    exercises,
    burned: exercises.reduce((s, e) => s + e.calories, 0),
  };
}

export function loggedDays(state: AppState): Set<string> {
  return new Set(state.entries.map((e) => e.date));
}

/** Totals per day for a list of dates, computed in one pass. */
export function totalsByDate(state: AppState, dates: string[]): Record<string, Nutrients> {
  const wanted = new Set(dates);
  const groups: Record<string, DiaryEntry[]> = {};
  for (const e of state.entries) {
    if (!wanted.has(e.date)) continue;
    (groups[e.date] ??= []).push(e);
  }
  const out: Record<string, Nutrients> = {};
  for (const d of dates) out[d] = sumItems(groups[d] ?? []);
  return out;
}
