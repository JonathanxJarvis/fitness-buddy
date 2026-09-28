export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export const MEALS: { key: MealType; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { key: 'lunch', label: 'Lunch', icon: 'restaurant-outline' },
  { key: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { key: 'snacks', label: 'Snacks', icon: 'cafe-outline' },
];

/**
 * Nutrient amounts. Macros in grams, calories in kcal,
 * sodium/potassium/calcium/iron/vitamin C in mg, vitamin D in µg.
 * A missing key means "unknown", not zero.
 */
export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  potassium?: number;
  calcium?: number;
  iron?: number;
  vitaminC?: number;
  vitaminD?: number;
}

export type NutrientKey = keyof Nutrients;

export interface Serving {
  label: string;
  /** Multiplier relative to the food's base nutrients. */
  factor: number;
}

export type FoodSource = 'builtin' | 'openfoodfacts' | 'usda' | 'custom' | 'recipe' | 'ai';

/** One item the AI spotted in a meal photo. */
export interface MealComponent {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Food {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  source: FoodSource;
  /** Nutrients for one base serving (servings[0] has factor 1). */
  nutrients: Nutrients;
  servings: Serving[];
  /** For AI photo estimates: the items it recognized. */
  components?: MealComponent[];
  /** For AI photo estimates: a short note on assumptions. */
  note?: string;
}

export interface DiaryEntry {
  id: string;
  date: string; // YYYY-MM-DD
  meal: MealType;
  food: Food;
  servingIndex: number;
  quantity: number;
  createdAt: number;
  /** Small JPEG data URI of the meal photo, for AI-logged meals. */
  photo?: string;
}

export interface SavedMealItem {
  food: Food;
  servingIndex: number;
  quantity: number;
}

export interface SavedMeal {
  id: string;
  name: string;
  items: SavedMealItem[];
  /** 1 for a saved meal; a recipe makes N servings and logs as one food. */
  servings: number;
  isRecipe: boolean;
  createdAt: number;
}

export interface ExerciseEntry {
  id: string;
  date: string;
  name: string;
  minutes: number;
  calories: number;
}

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type GoalType = 'lose' | 'maintain' | 'gain';

export interface Profile {
  name?: string;
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: GoalType;
  /** Target weight change per week in kg (positive number). */
  weeklyRateKg: number;
}

export interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number; // max
  sodium: number; // max, mg
  potassium: number;
  calcium: number;
  iron: number;
  vitaminC: number;
  vitaminD: number;
  steps: number;
}

export type UnitSystem = 'us' | 'metric';
export type ThemePref = 'system' | 'light' | 'dark';

export interface ReminderSettings {
  meals: boolean;
  mealTimes: { breakfast: string; lunch: string; dinner: string }; // "HH:MM"
  water: boolean;
  waterStartHour: number;
  waterEndHour: number;
  waterEveryHours: number;
}

/** Which country's supermarket products come first in search. */
export type FoodRegion = 'de' | 'us' | 'world';

export interface Settings {
  units: UnitSystem;
  foodRegion: FoodRegion;
  theme: ThemePref;
  reminders: ReminderSettings;
  /** Kettle the mascot pops up to cheer you on (default on). */
  mascot?: boolean;
  /** Mascot outfit (Pro). */
  mascotSkin?: string;
  /** Fitness Buddy Pro unlocked on this device. */
  pro?: boolean;
  /** Coach answers with Claude (Pro) instead of the built-in coach. */
  coachAi?: boolean;
  /** Pet species (see PETS in components/Mascot). */
  pet?: string;
  /** The name you gave your pet. */
  petName?: string;
}

/** A claimed reward: daily quest ("q:<id>"), daily chest ("chest"), weekly challenge ("week") or path chest ("path:<n>"). */
export interface QuestLogEntry {
  id: string;
  date: string;
  xp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** Thumbnail data URI when the user attached a photo. */
  photo?: string;
  createdAt: number;
  error?: boolean;
}

export type Muscle = 'chest' | 'back' | 'shoulders' | 'arms' | 'legs' | 'glutes' | 'core' | 'cardio' | 'full';
export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell' | 'band' | 'cardio';

export interface Exercise {
  id: string;
  name: string;
  muscle: Muscle;
  equipment: Equipment;
  /** Tracks time/distance-free "reps only" when true (push-ups, pull-ups). */
  bodyweight?: boolean;
}

export interface WorkoutSet {
  reps: number;
  /** Weight in kg (0 for bodyweight). */
  kg: number;
  done: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  date: string;
  name: string;
  startedAt: number;
  endedAt?: number;
  exercises: WorkoutExercise[];
  calories?: number;
}

export interface Routine {
  id: string;
  name: string;
  exercises: { exerciseId: string; sets: number; reps: number }[];
}

export interface AppState {
  version: 1;
  profile: Profile | null;
  goals: Goals | null;
  settings: Settings;
  entries: DiaryEntry[];
  water: Record<string, number>; // date -> ml
  steps: Record<string, number>; // date -> steps
  weights: Record<string, number>; // date -> kg
  exercises: ExerciseEntry[];
  customFoods: Food[];
  favorites: Food[];
  savedMeals: SavedMeal[];
  chat: ChatMessage[];
  workouts: Workout[];
  activeWorkout: Workout | null;
  routines: Routine[];
  customExercises: Exercise[];
  /** Rest timer length in seconds. */
  restSeconds?: number;
  social?: SocialState;
  questLog?: QuestLogEntry[];
}

/** What friends can see about you: progression only, never food or body data. */
export interface SocialSnapshot {
  name: string;
  score: number;
  stage: number;
  level: number;
  xp: number;
  /** Strength score at the end of each of the last 8 weeks. */
  history: number[];
  /** Level at the end of each of the last 8 weeks. */
  levels: number[];
  weekWorkouts: number;
  totalWorkouts: number;
  lastWorkout?: { name: string; date: string; sets: number };
  skin?: string;
  pet?: string;
  petName?: string;
  /** Rank score parts: strength, consistency, momentum (0–100 each). */
  parts?: { strength: number; consistency: number; momentum: number };
  streak?: number;
  /** Recent highlights for the crew feed, newest first. */
  recent?: SocialEvent[];
  updatedAt: number;
}

export interface SocialEvent {
  kind: 'pr' | 'workout' | 'rank' | 'quests' | 'streak';
  text: string;
  at: number;
}

export interface Friend extends SocialSnapshot {
  id: string;
  code: string;
}

export interface SocialMessage {
  id: string;
  from: string;
  to: string;
  text: string;
  at: number;
}

export interface SocialState {
  me?: { id: string; code: string; secret: string };
  friends: Friend[];
  /** friend id -> messages, oldest first */
  chats: Record<string, SocialMessage[]>;
  /** friend id -> timestamp of the last message read */
  read: Record<string, number>;
}
