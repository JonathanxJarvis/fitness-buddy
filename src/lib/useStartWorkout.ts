import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { todayKey } from './dates';
import { workoutFromRoutine, workoutWithExercises } from './training';
import { applySuggestions } from './progression-suggest';
import { isPro } from './pro';
import type { AppState, Routine, Workout } from './types';

/** Pro: fill each set with the smart progression suggestion. */
const withSuggestions = (w: Workout, state: AppState) => (isPro(state) ? applySuggestions(w, state.workouts, state.customExercises, state.settings.units) : w);

/**
 * Opens the running workout, or starts a new one from a routine. Without a
 * routine you choose your exercises first (the picker starts the workout).
 */
export function useStartWorkout() {
  const { state, dispatch } = useStore();
  return (routine?: Routine, opts: { add?: boolean } = {}) => {
    const active = state.activeWorkout;
    if (active && routine && opts.add) {
      // Training already: this workout's exercises join the one in progress.
      const extra = withSuggestions(workoutFromRoutine(routine, state.workouts, uid(), active.date, Date.now()), state).exercises;
      dispatch({ type: 'setActiveWorkout', workout: { ...active, exercises: [...active.exercises, ...extra] } });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      router.push('/workout');
      return;
    }
    if (active) {
      router.push('/workout');
      return;
    }
    if (!routine) {
      router.push({ pathname: '/exercise-picker', params: { for: 'new' } });
      return;
    }
    dispatch({ type: 'setActiveWorkout', workout: withSuggestions(workoutFromRoutine(routine, state.workouts, uid(), todayKey(), Date.now()), state) });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push('/workout');
  };
}

/** Starts a workout with exercises picked up front; the picker screen is replaced by it. */
export function useStartWithExercises() {
  const { state, dispatch } = useStore();
  return (exerciseIds: string[]) => {
    const active = state.activeWorkout;
    const fresh = withSuggestions(workoutWithExercises(exerciseIds, state.workouts, uid(), todayKey()), state);
    // Already training (shouldn't happen from Start, but never lose the picks): add them.
    dispatch({ type: 'setActiveWorkout', workout: active ? { ...active, exercises: [...active.exercises, ...fresh.exercises] } : fresh });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.replace('/workout');
  };
}

/** Back to the Train tab, closing the workout screens on the way. */
export function backToTrain() {
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/train');
}
