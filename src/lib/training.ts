import type { Exercise, Muscle, Routine, Workout, WorkoutExercise, WorkoutSet } from './types';

const ex = (id: string, name: string, muscle: Muscle, equipment: Exercise['equipment'], bodyweight?: boolean): Exercise => ({ id, name, muscle, equipment, bodyweight });

/** Built-in exercise library. Ids are stable because logged workouts reference them. */
export const EXERCISE_LIBRARY: Exercise[] = [
  // chest
  ex('bench-press', 'Bench press', 'chest', 'barbell'),
  ex('incline-bench', 'Incline bench press', 'chest', 'barbell'),
  ex('db-bench', 'Dumbbell bench press', 'chest', 'dumbbell'),
  ex('incline-db-press', 'Incline dumbbell press', 'chest', 'dumbbell'),
  ex('db-fly', 'Dumbbell fly', 'chest', 'dumbbell'),
  ex('cable-fly', 'Cable fly', 'chest', 'cable'),
  ex('chest-press', 'Chest press machine', 'chest', 'machine'),
  ex('pec-deck', 'Pec deck', 'chest', 'machine'),
  ex('push-up', 'Push-up', 'chest', 'bodyweight', true),
  ex('dip', 'Dip', 'chest', 'bodyweight', true),
  // back
  ex('deadlift', 'Deadlift', 'back', 'barbell'),
  ex('barbell-row', 'Barbell row', 'back', 'barbell'),
  ex('db-row', 'One-arm dumbbell row', 'back', 'dumbbell'),
  ex('pull-up', 'Pull-up', 'back', 'bodyweight', true),
  ex('chin-up', 'Chin-up', 'back', 'bodyweight', true),
  ex('lat-pulldown', 'Lat pulldown', 'back', 'cable'),
  ex('seated-row', 'Seated cable row', 'back', 'cable'),
  ex('t-bar-row', 'T-bar row', 'back', 'machine'),
  ex('face-pull', 'Face pull', 'back', 'cable'),
  ex('back-extension', 'Back extension', 'back', 'bodyweight', true),
  // shoulders
  ex('ohp', 'Overhead press', 'shoulders', 'barbell'),
  ex('db-shoulder-press', 'Dumbbell shoulder press', 'shoulders', 'dumbbell'),
  ex('lateral-raise', 'Lateral raise', 'shoulders', 'dumbbell'),
  ex('cable-lateral', 'Cable lateral raise', 'shoulders', 'cable'),
  ex('rear-delt-fly', 'Rear delt fly', 'shoulders', 'dumbbell'),
  ex('arnold-press', 'Arnold press', 'shoulders', 'dumbbell'),
  ex('upright-row', 'Upright row', 'shoulders', 'barbell'),
  ex('shrug', 'Shrug', 'shoulders', 'dumbbell'),
  // arms
  ex('barbell-curl', 'Barbell curl', 'arms', 'barbell'),
  ex('db-curl', 'Dumbbell curl', 'arms', 'dumbbell'),
  ex('hammer-curl', 'Hammer curl', 'arms', 'dumbbell'),
  ex('preacher-curl', 'Preacher curl', 'arms', 'machine'),
  ex('cable-curl', 'Cable curl', 'arms', 'cable'),
  ex('tricep-pushdown', 'Triceps pushdown', 'arms', 'cable'),
  ex('overhead-extension', 'Overhead triceps extension', 'arms', 'dumbbell'),
  ex('skull-crusher', 'Skull crusher', 'arms', 'barbell'),
  ex('close-grip-bench', 'Close-grip bench press', 'arms', 'barbell'),
  // legs & glutes
  ex('squat', 'Back squat', 'legs', 'barbell'),
  ex('front-squat', 'Front squat', 'legs', 'barbell'),
  ex('leg-press', 'Leg press', 'legs', 'machine'),
  ex('hack-squat', 'Hack squat', 'legs', 'machine'),
  ex('goblet-squat', 'Goblet squat', 'legs', 'dumbbell'),
  ex('bulgarian-split-squat', 'Bulgarian split squat', 'legs', 'dumbbell'),
  ex('lunge', 'Walking lunge', 'legs', 'dumbbell'),
  ex('leg-extension', 'Leg extension', 'legs', 'machine'),
  ex('leg-curl', 'Leg curl', 'legs', 'machine'),
  ex('rdl', 'Romanian deadlift', 'legs', 'barbell'),
  ex('calf-raise', 'Calf raise', 'legs', 'machine'),
  ex('hip-thrust', 'Hip thrust', 'glutes', 'barbell'),
  ex('glute-bridge', 'Glute bridge', 'glutes', 'bodyweight', true),
  ex('cable-kickback', 'Cable kickback', 'glutes', 'cable'),
  ex('hip-abduction', 'Hip abduction', 'glutes', 'machine'),
  // core
  ex('plank', 'Plank (seconds as reps)', 'core', 'bodyweight', true),
  ex('crunch', 'Crunch', 'core', 'bodyweight', true),
  ex('hanging-leg-raise', 'Hanging leg raise', 'core', 'bodyweight', true),
  ex('cable-crunch', 'Cable crunch', 'core', 'cable'),
  ex('russian-twist', 'Russian twist', 'core', 'bodyweight', true),
  ex('ab-wheel', 'Ab wheel rollout', 'core', 'bodyweight', true),
  // full body / conditioning
  ex('kb-swing', 'Kettlebell swing', 'full', 'kettlebell'),
  ex('clean', 'Power clean', 'full', 'barbell'),
  ex('burpee', 'Burpee', 'full', 'bodyweight', true),
  ex('farmer-carry', 'Farmer’s carry', 'full', 'dumbbell'),
];

export const MUSCLES: { key: Muscle | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'chest', label: 'Chest' },
  { key: 'back', label: 'Back' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'arms', label: 'Arms' },
  { key: 'legs', label: 'Legs' },
  { key: 'glutes', label: 'Glutes' },
  { key: 'core', label: 'Core' },
  { key: 'full', label: 'Full body' },
];

export const TEMPLATES: Routine[] = [
  { id: 'tpl-push', name: 'Push', exercises: [{ exerciseId: 'bench-press', sets: 4, reps: 8 }, { exerciseId: 'ohp', sets: 3, reps: 8 }, { exerciseId: 'incline-db-press', sets: 3, reps: 10 }, { exerciseId: 'lateral-raise', sets: 3, reps: 15 }, { exerciseId: 'tricep-pushdown', sets: 3, reps: 12 }] },
  { id: 'tpl-pull', name: 'Pull', exercises: [{ exerciseId: 'deadlift', sets: 3, reps: 5 }, { exerciseId: 'pull-up', sets: 3, reps: 8 }, { exerciseId: 'barbell-row', sets: 3, reps: 8 }, { exerciseId: 'face-pull', sets: 3, reps: 15 }, { exerciseId: 'db-curl', sets: 3, reps: 12 }] },
  { id: 'tpl-legs', name: 'Legs', exercises: [{ exerciseId: 'squat', sets: 4, reps: 6 }, { exerciseId: 'rdl', sets: 3, reps: 8 }, { exerciseId: 'leg-press', sets: 3, reps: 12 }, { exerciseId: 'leg-curl', sets: 3, reps: 12 }, { exerciseId: 'calf-raise', sets: 4, reps: 15 }] },
  { id: 'tpl-full', name: 'Full body', exercises: [{ exerciseId: 'squat', sets: 3, reps: 8 }, { exerciseId: 'bench-press', sets: 3, reps: 8 }, { exerciseId: 'barbell-row', sets: 3, reps: 8 }, { exerciseId: 'db-shoulder-press', sets: 2, reps: 10 }, { exerciseId: 'plank', sets: 3, reps: 45 }] },
];

export function findExercise(id: string, custom: Exercise[] = []): Exercise | undefined {
  return EXERCISE_LIBRARY.find((e) => e.id === id) ?? custom.find((e) => e.id === id);
}

/** Epley estimate of a one-rep max. */
export function oneRepMax(kg: number, reps: number): number {
  if (kg <= 0 || reps <= 0) return 0;
  return reps === 1 ? kg : kg * (1 + reps / 30);
}

export function setVolume(s: WorkoutSet): number {
  return s.done ? s.kg * s.reps : 0;
}

export function workoutVolume(w: Workout): number {
  return w.exercises.reduce((sum, e) => sum + e.sets.reduce((a, s) => a + setVolume(s), 0), 0);
}

export function doneSets(w: Workout): number {
  return w.exercises.reduce((sum, e) => sum + e.sets.filter((s) => s.done).length, 0);
}

export function durationMinutes(w: Workout, now = Date.now()): number {
  return Math.max(1, Math.round(((w.endedAt ?? now) - w.startedAt) / 60000));
}

/** Calories for a strength session: ~5 METs averaged over the whole session, rest included. */
export function workoutCalories(w: Workout, weightKg: number, now = Date.now()): number {
  const minutes = durationMinutes(w, now);
  const met = doneSets(w) > 0 ? 5 : 2;
  return Math.round(met * weightKg * (minutes / 60));
}

/** Best estimated 1RM per exercise across finished workouts. */
export function personalRecords(workouts: Workout[]): Record<string, { e1rm: number; kg: number; reps: number; date: string }> {
  const out: Record<string, { e1rm: number; kg: number; reps: number; date: string }> = {};
  for (const w of workouts) {
    for (const e of w.exercises) {
      for (const s of e.sets) {
        if (!s.done) continue;
        const e1rm = s.kg > 0 ? oneRepMax(s.kg, s.reps) : s.reps;
        if (!out[e.exerciseId] || e1rm > out[e.exerciseId].e1rm) out[e.exerciseId] = { e1rm, kg: s.kg, reps: s.reps, date: w.date };
      }
    }
  }
  return out;
}

/** Exercises in `w` whose best set beats every earlier workout's best (first-ever attempts don't count). */
export function prExercises(w: Workout, earlier: Workout[]): string[] {
  const before = personalRecords(earlier);
  const out: string[] = [];
  for (const e of w.exercises) {
    const best = Math.max(0, ...e.sets.filter((s) => s.done).map((s) => (s.kg > 0 ? oneRepMax(s.kg, s.reps) : s.reps)));
    const prev = before[e.exerciseId];
    if (prev && best > prev.e1rm) out.push(e.exerciseId);
  }
  return out;
}

export function countPRs(w: Workout, earlier: Workout[]): number {
  return prExercises(w, earlier).length;
}

/** The sets from the last time this exercise was done, for the "previous" column. */
export function previousSets(exerciseId: string, workouts: Workout[]): WorkoutSet[] {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const e = workouts[i].exercises.find((x) => x.exerciseId === exerciseId);
    if (e && e.sets.some((s) => s.done)) return e.sets.filter((s) => s.done);
  }
  return [];
}

/** A new exercise block, pre-filled from last time (or the routine's targets). */
export function newBlock(exerciseId: string, workouts: Workout[], sets = 3, reps = 10): WorkoutExercise {
  const prev = previousSets(exerciseId, workouts);
  const rows = prev.length ? prev.map((s) => ({ reps: s.reps, kg: s.kg, done: false })) : Array.from({ length: sets }, () => ({ reps, kg: 0, done: false }));
  return { exerciseId, sets: rows };
}

export function workoutFromRoutine(r: Routine, workouts: Workout[], id: string, date: string, now = Date.now()): Workout {
  return {
    id,
    date,
    name: r.name,
    startedAt: now,
    exercises: r.exercises.map((x) => {
      const b = newBlock(x.exerciseId, workouts, x.sets, x.reps);
      // Keep the routine's set count even if last time had more or fewer.
      while (b.sets.length < x.sets) b.sets.push({ ...(b.sets[b.sets.length - 1] ?? { reps: x.reps, kg: 0 }), done: false });
      return { ...b, sets: b.sets.slice(0, x.sets) };
    }),
  };
}

export function routineFromWorkout(w: Workout, id: string, name = w.name): Routine {
  return {
    id,
    name,
    exercises: w.exercises.map((e) => ({ exerciseId: e.exerciseId, sets: Math.max(1, e.sets.length), reps: e.sets[0]?.reps || 10 })),
  };
}
