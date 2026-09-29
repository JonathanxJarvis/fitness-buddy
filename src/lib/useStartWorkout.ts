import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { todayKey } from './dates';
import { workoutFromRoutine, workoutWithExercises } from './training';
import type { Routine } from './types';

/**
 * Opens the running workout, or starts a new one from a routine. Without a
 * routine you choose your exercises first (the picker starts the workout).
 */
export function useStartWorkout() {
  const { state, dispatch } = useStore();
  return (routine?: Routine) => {
    if (state.activeWorkout) {
      router.push('/workout');
      return;
    }
    if (!routine) {
      router.push({ pathname: '/exercise-picker', params: { for: 'new' } });
      return;
    }
    dispatch({ type: 'setActiveWorkout', workout: workoutFromRoutine(routine, state.workouts, uid(), todayKey(), Date.now()) });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push('/workout');
  };
}

/** Starts a workout with exercises picked up front; the picker screen is replaced by it. */
export function useStartWithExercises() {
  const { state, dispatch } = useStore();
  return (exerciseIds: string[]) => {
    const active = state.activeWorkout;
    const fresh = workoutWithExercises(exerciseIds, state.workouts, uid(), todayKey());
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
