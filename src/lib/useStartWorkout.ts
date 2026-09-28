import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { todayKey } from './dates';
import { workoutFromRoutine } from './training';
import type { Routine } from './types';

/** Opens the running workout, or starts a new one (empty or from a routine). */
export function useStartWorkout() {
  const { state, dispatch } = useStore();
  return (routine?: Routine) => {
    if (!state.activeWorkout) {
      const now = Date.now();
      const workout = routine
        ? workoutFromRoutine(routine, state.workouts, uid(), todayKey(), now)
        : { id: uid(), date: todayKey(), name: defaultName(new Date(now)), startedAt: now, exercises: [] };
      dispatch({ type: 'setActiveWorkout', workout });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    router.push('/workout');
  };
}

function defaultName(d: Date): string {
  const h = d.getHours();
  return h < 11 ? 'Morning workout' : h < 17 ? 'Afternoon workout' : 'Evening workout';
}
