import { proteinTarget } from '@/lib/nutrition';
import type {
  AppState,
  ChatMessage,
  Exercise,
  Routine,
  Workout,
  DiaryEntry,
  ExerciseEntry,
  Food,
  Goals,
  Profile,
  SavedMeal,
  Settings,
} from '@/lib/types';

/** German-language phones get German supermarket products first. */
function defaultRegion(): Settings['foodRegion'] {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    if (/^de\b|-DE$|-AT$|-CH$/i.test(locale)) return 'de';
    if (/-US$/i.test(locale)) return 'us';
  } catch {}
  return 'world';
}

export const DEFAULT_SETTINGS: Settings = {
  units: 'us',
  foodRegion: defaultRegion(),
  theme: 'system',
  reminders: {
    meals: false,
    mealTimes: { breakfast: '08:00', lunch: '12:30', dinner: '18:30' },
    water: false,
    waterStartHour: 9,
    waterEndHour: 20,
    waterEveryHours: 2,
  },
};

export const initialState: AppState = {
  version: 1,
  profile: null,
  goals: null,
  settings: DEFAULT_SETTINGS,
  entries: [],
  water: {},
  steps: {},
  weights: {},
  exercises: [],
  customFoods: [],
  favorites: [],
  savedMeals: [],
  chat: [],
  workouts: [],
  activeWorkout: null,
  routines: [],
  customExercises: [],
  restSeconds: 90,
};

export type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'setProfile'; profile: Profile; goals: Goals; date: string }
  | { type: 'setName'; name: string }
  | { type: 'updateGoals'; goals: Goals }
  | { type: 'updateSettings'; settings: Partial<Settings> }
  | { type: 'addEntries'; entries: DiaryEntry[] }
  | { type: 'updateEntry'; entry: DiaryEntry }
  | { type: 'deleteEntry'; id: string }
  | { type: 'setWater'; date: string; ml: number }
  | { type: 'setSteps'; date: string; steps: number }
  | { type: 'setWeight'; date: string; kg: number }
  | { type: 'deleteWeight'; date: string }
  | { type: 'addExercise'; exercise: ExerciseEntry }
  | { type: 'deleteExercise'; id: string }
  | { type: 'saveCustomFood'; food: Food }
  | { type: 'deleteCustomFood'; id: string }
  | { type: 'toggleFavorite'; food: Food }
  | { type: 'saveMeal'; meal: SavedMeal }
  | { type: 'deleteMeal'; id: string }
  | { type: 'addChat'; message: ChatMessage }
  | { type: 'clearChat' }
  | { type: 'setActiveWorkout'; workout: Workout | null }
  | { type: 'finishWorkout'; workout: Workout }
  | { type: 'deleteWorkout'; id: string }
  | { type: 'saveRoutine'; routine: Routine }
  | { type: 'deleteRoutine'; id: string }
  | { type: 'saveCustomExercise'; exercise: Exercise }
  | { type: 'setRestSeconds'; seconds: number }
  | { type: 'reset' };

const MAX_CHAT = 80;

/** States saved before the redesign: move protein to 1 g per lb, keeping calories. */
function migrate(saved: AppState): AppState {
  if ((saved as Partial<AppState>).chat !== undefined || !saved.profile || !saved.goals) return saved;
  const g = saved.goals;
  const protein = proteinTarget(saved.profile.weightKg);
  const carbs = Math.max(0, Math.round((g.calories - protein * 4 - g.fat * 9) / 4));
  return { ...saved, goals: { ...g, protein, carbs } };
}

function latestWeightDate(weights: Record<string, number>): string | undefined {
  return Object.keys(weights).sort().pop();
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return {
        ...initialState,
        ...migrate(action.state),
        settings: {
          ...DEFAULT_SETTINGS,
          ...action.state.settings,
          reminders: { ...DEFAULT_SETTINGS.reminders, ...action.state.settings?.reminders },
        },
      };
    case 'setProfile':
      return {
        ...state,
        profile: action.profile,
        goals: action.goals,
        weights: { ...state.weights, [action.date]: action.profile.weightKg },
      };
    case 'setName':
      return state.profile ? { ...state, profile: { ...state.profile, name: action.name.trim() || undefined } } : state;
    case 'updateGoals':
      return { ...state, goals: action.goals };
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.settings } };
    case 'addEntries':
      return { ...state, entries: [...state.entries, ...action.entries] };
    case 'updateEntry':
      return { ...state, entries: state.entries.map((e) => (e.id === action.entry.id ? action.entry : e)) };
    case 'deleteEntry':
      return { ...state, entries: state.entries.filter((e) => e.id !== action.id) };
    case 'setWater':
      return { ...state, water: { ...state.water, [action.date]: Math.max(0, Math.round(action.ml)) } };
    case 'setSteps':
      return { ...state, steps: { ...state.steps, [action.date]: Math.max(0, Math.round(action.steps)) } };
    case 'setWeight': {
      const weights = { ...state.weights, [action.date]: action.kg };
      // Keep the profile's weight in sync with the most recent weigh-in.
      const isLatest = latestWeightDate(weights) === action.date;
      return {
        ...state,
        weights,
        profile: state.profile && isLatest ? { ...state.profile, weightKg: action.kg } : state.profile,
      };
    }
    case 'deleteWeight': {
      const weights = { ...state.weights };
      delete weights[action.date];
      const latest = latestWeightDate(weights);
      return {
        ...state,
        weights,
        profile: state.profile && latest ? { ...state.profile, weightKg: weights[latest] } : state.profile,
      };
    }
    case 'addExercise':
      return { ...state, exercises: [...state.exercises, action.exercise] };
    case 'deleteExercise':
      return { ...state, exercises: state.exercises.filter((e) => e.id !== action.id) };
    case 'saveCustomFood': {
      const exists = state.customFoods.some((f) => f.id === action.food.id);
      return {
        ...state,
        customFoods: exists
          ? state.customFoods.map((f) => (f.id === action.food.id ? action.food : f))
          : [action.food, ...state.customFoods],
      };
    }
    case 'deleteCustomFood':
      return {
        ...state,
        customFoods: state.customFoods.filter((f) => f.id !== action.id),
        favorites: state.favorites.filter((f) => f.id !== action.id),
      };
    case 'toggleFavorite': {
      const isFav = state.favorites.some((f) => f.id === action.food.id);
      return {
        ...state,
        favorites: isFav ? state.favorites.filter((f) => f.id !== action.food.id) : [action.food, ...state.favorites],
      };
    }
    case 'saveMeal': {
      const exists = state.savedMeals.some((m) => m.id === action.meal.id);
      return {
        ...state,
        savedMeals: exists
          ? state.savedMeals.map((m) => (m.id === action.meal.id ? action.meal : m))
          : [action.meal, ...state.savedMeals],
      };
    }
    case 'deleteMeal':
      return { ...state, savedMeals: state.savedMeals.filter((m) => m.id !== action.id) };
    case 'addChat':
      return { ...state, chat: [...state.chat, action.message].slice(-MAX_CHAT) };
    case 'clearChat':
      return { ...state, chat: [] };
    case 'setActiveWorkout':
      return { ...state, activeWorkout: action.workout };
    case 'finishWorkout': {
      const w = action.workout;
      // The session also shows up as an exercise entry so its calories count toward the day.
      const minutes = Math.max(1, Math.round(((w.endedAt ?? Date.now()) - w.startedAt) / 60000));
      return {
        ...state,
        activeWorkout: null,
        workouts: [...state.workouts.filter((x) => x.id !== w.id), w].sort((a, b) => a.startedAt - b.startedAt),
        exercises: [...state.exercises.filter((x) => x.id !== w.id), { id: w.id, date: w.date, name: w.name, minutes, calories: w.calories ?? 0 }],
      };
    }
    case 'deleteWorkout':
      return {
        ...state,
        workouts: state.workouts.filter((w) => w.id !== action.id),
        exercises: state.exercises.filter((x) => x.id !== action.id),
      };
    case 'saveRoutine': {
      const exists = state.routines.some((r) => r.id === action.routine.id);
      return {
        ...state,
        routines: exists ? state.routines.map((r) => (r.id === action.routine.id ? action.routine : r)) : [...state.routines, action.routine],
      };
    }
    case 'deleteRoutine':
      return { ...state, routines: state.routines.filter((r) => r.id !== action.id) };
    case 'saveCustomExercise':
      return { ...state, customExercises: [...state.customExercises.filter((e) => e.id !== action.exercise.id), action.exercise] };
    case 'setRestSeconds':
      return { ...state, restSeconds: action.seconds };
    case 'reset':
      return initialState;
  }
}

/** Most recently logged distinct foods, newest first. */
export function recentFoods(entries: DiaryEntry[], limit = 30): Food[] {
  const seen = new Set<string>();
  const out: Food[] = [];
  for (const e of [...entries].sort((a, b) => b.createdAt - a.createdAt)) {
    if (seen.has(e.food.id)) continue;
    seen.add(e.food.id);
    out.push(e.food);
    if (out.length >= limit) break;
  }
  return out;
}

export function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
