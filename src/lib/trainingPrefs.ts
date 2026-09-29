import { SESSIONS, type Session } from './plan';
import { EXERCISE_LIBRARY, findExercise } from './training';
import type { AppState, Equipment, Routine, TrainingGoal, TrainingPlace, TrainingPrefs } from './types';

export const TRAINING_GOALS: { key: TrainingGoal; label: string; hint: string }[] = [
  { key: 'muscle', label: 'Build muscle', hint: '8–12 reps, steady volume' },
  { key: 'strength', label: 'Get stronger', hint: 'Heavy main lifts, longer rests' },
  { key: 'fitness', label: 'General fitness', hint: 'Balanced, a bit of everything' },
  { key: 'fat', label: 'Lose fat', hint: 'Higher reps, shorter rests' },
];

export const TRAINING_PLACES: { key: TrainingPlace; label: string; hint: string }[] = [
  { key: 'gym', label: 'Gym', hint: 'Barbells, machines, cables' },
  { key: 'home', label: 'Home with dumbbells', hint: 'Dumbbells and bodyweight' },
  { key: 'bodyweight', label: 'Bodyweight only', hint: 'No equipment needed' },
];

export const SESSION_MINUTES = [30, 45, 60, 75];
export const minutesLabel = (m: number) => (m >= 75 ? '75+' : String(m));

const ALLOWED: Record<TrainingPlace, Equipment[] | null> = {
  gym: null,
  home: ['dumbbell', 'bodyweight'],
  bodyweight: ['bodyweight'],
};

/** Dumbbell moves that work fine with no weight at all. */
const NO_LOAD_OK = new Set(['bulgarian-split-squat', 'lunge']);

/** Closest swaps, best first. Anything missing falls back to the same muscle. */
const SWAPS: Record<string, string[]> = {
  'bench-press': ['db-bench', 'push-up'],
  'incline-bench': ['incline-db-press', 'push-up'],
  'chest-press': ['db-bench', 'push-up'],
  'cable-fly': ['db-fly', 'push-up'],
  'pec-deck': ['db-fly', 'push-up'],
  deadlift: ['db-row', 'back-extension'],
  'barbell-row': ['db-row', 'pull-up', 'chin-up'],
  't-bar-row': ['db-row', 'chin-up', 'pull-up'],
  'seated-row': ['db-row', 'chin-up', 'pull-up'],
  'lat-pulldown': ['pull-up', 'chin-up'],
  'face-pull': ['rear-delt-fly', 'back-extension'],
  ohp: ['db-shoulder-press', 'push-up'],
  'upright-row': ['lateral-raise', 'push-up'],
  'cable-lateral': ['lateral-raise'],
  'barbell-curl': ['db-curl', 'chin-up'],
  'preacher-curl': ['hammer-curl', 'chin-up'],
  'cable-curl': ['hammer-curl', 'db-curl', 'chin-up'],
  'tricep-pushdown': ['overhead-extension', 'dip'],
  'skull-crusher': ['overhead-extension', 'dip'],
  'close-grip-bench': ['overhead-extension', 'dip', 'push-up'],
  squat: ['goblet-squat', 'bulgarian-split-squat', 'lunge'],
  'front-squat': ['goblet-squat', 'bulgarian-split-squat', 'lunge'],
  'leg-press': ['goblet-squat', 'lunge', 'bulgarian-split-squat'],
  'hack-squat': ['goblet-squat', 'bulgarian-split-squat', 'lunge'],
  'leg-extension': ['bulgarian-split-squat', 'lunge'],
  rdl: ['glute-bridge', 'back-extension'],
  'leg-curl': ['glute-bridge', 'back-extension'],
  'hip-thrust': ['glute-bridge'],
  'cable-kickback': ['glute-bridge'],
  'hip-abduction': ['glute-bridge'],
  'calf-raise': ['lunge'],
  'cable-crunch': ['crunch'],
  'kb-swing': ['burpee'],
  clean: ['burpee'],
  'farmer-carry': ['burpee'],
};

/** Whether an exercise can be done where you train. */
export function fitsPlace(exerciseId: string, place: TrainingPlace = 'gym'): boolean {
  const allowed = ALLOWED[place];
  if (!allowed) return true;
  const e = findExercise(exerciseId);
  if (!e) return true;
  return allowed.includes(e.equipment) || (place === 'bodyweight' && NO_LOAD_OK.has(e.id));
}

/** The exercise itself if it fits, else the closest one that does and isn't already used. */
export function swapForPlace(exerciseId: string, place: TrainingPlace = 'gym', used: Set<string> = new Set()): string | null {
  if (fitsPlace(exerciseId, place)) return exerciseId;
  const muscle = findExercise(exerciseId)?.muscle;
  const candidates = [...(SWAPS[exerciseId] ?? []), ...EXERCISE_LIBRARY.filter((e) => e.muscle === muscle).map((e) => e.id)];
  return candidates.find((id) => !used.has(id) && fitsPlace(id, place)) ?? null;
}

const MAX_EXERCISES: Record<number, number> = { 30: 3, 45: 4, 60: 5, 75: 6 };

/** A routine adjusted for where you train, your goal and how long you have. */
export function tuneRoutine(r: Routine, prefs: TrainingPrefs = {}): Routine {
  const used = new Set<string>();
  const out: Routine['exercises'] = [];
  for (const item of r.exercises) {
    const id = swapForPlace(item.exerciseId, prefs.place, used);
    if (!id || used.has(id)) continue;
    used.add(id);
    out.push({ ...item, exerciseId: id, ...setsAndReps(id, item.sets, item.reps, out.length, prefs) });
  }
  const max = prefs.minutes ? MAX_EXERCISES[prefs.minutes] : undefined;
  return { ...r, exercises: max ? out.slice(0, max) : out };
}

function setsAndReps(id: string, sets: number, reps: number, index: number, prefs: TrainingPrefs) {
  const loaded = !findExercise(id)?.bodyweight;
  const clamp = (lo: number, hi: number) => Math.min(hi, Math.max(lo, reps));
  // Plank reps are seconds, and bodyweight moves go by feel.
  if (id !== 'plank' && loaded) {
    if (prefs.goal === 'strength') reps = index < 2 ? 5 : clamp(6, 10);
    else if (prefs.goal === 'fitness') reps = clamp(10, 15);
    else if (prefs.goal === 'fat') reps = clamp(12, 15);
  }
  if (prefs.goal === 'strength' && index < 2) sets = Math.max(sets, 4);
  if (prefs.goal === 'fitness' || prefs.goal === 'fat') sets = Math.min(sets, 3);
  if (prefs.minutes === 30) sets = Math.min(sets, 3);
  return { sets, reps };
}

const REST: Record<TrainingGoal, number> = { strength: 150, muscle: 90, fitness: 60, fat: 60 };
export const restForGoal = (goal?: TrainingGoal) => (goal ? REST[goal] : undefined);

/** Personalized copies are saved under this id prefix, so they can be refreshed without touching your own routines. */
const ID_PREFIX = 'pers-';
export const isPersonalized = (r: Routine) => r.id.startsWith(ID_PREFIX);

const sameExercises = (a: Routine, b: Routine) =>
  a.exercises.length === b.exercises.length &&
  a.exercises.every((x, i) => x.exerciseId === b.exercises[i].exerciseId && x.sets === b.exercises[i].sets && x.reps === b.exercises[i].reps);

/**
 * What to save or remove so the built-in workouts in your plan match your
 * preferences. Routines you made yourself are never touched.
 */
export function planRoutineChanges(state: Pick<AppState, 'plan' | 'routines'>, prefs: TrainingPrefs = {}): { save: Routine[]; remove: string[] } {
  const save: Routine[] = [];
  const remove: string[] = [];
  const ids = new Set((state.plan?.week ?? []).filter((x): x is string => !!x));
  const builtIns: Session[] = SESSIONS.filter((s) => ids.has(s.id));
  for (const s of builtIns) {
    const mine = state.routines.find((r) => r.name.trim().toLowerCase() === s.name.toLowerCase());
    if (mine && !isPersonalized(mine)) continue;
    const tuned = tuneRoutine(s.routine, prefs);
    if (sameExercises(tuned, s.routine)) {
      if (mine) remove.push(mine.id);
    } else if (!mine || !sameExercises(mine, tuned)) {
      save.push({ ...tuned, id: mine?.id ?? `${ID_PREFIX}${s.id}`, name: s.name });
    }
  }
  return { save, remove };
}

/** True when the plan's built-in workouts would change with these preferences. */
export const planNeedsTuning = (state: Pick<AppState, 'plan' | 'routines'>, prefs?: TrainingPrefs) => {
  const c = planRoutineChanges(state, prefs);
  return c.save.length + c.remove.length > 0;
};
