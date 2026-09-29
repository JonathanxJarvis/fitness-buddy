// Mounted once in the root layout. Watches the store and keeps the iPhone extras in step:
// the home screen calorie widget, the workout Live Activity and Apple Health sync.
// Everything underneath is a no-op in Expo Go, on web and on Android.
import { useEffect, useLayoutEffect, useRef } from 'react';
import { AppState as RNAppState } from 'react-native';
import { useStore } from '@/store/StoreProvider';
import { updateCalorieWidget, widgetsAvailable } from '@/lib/widgets';
import { endWorkoutActivity, showWorkoutActivity } from '@/lib/liveActivity';
import { syncHealth } from '@/lib/health';
import { loadHealthKit } from '@/lib/healthKit';
import { doneSetCount, workoutActivityProps } from '@/lib/widgetData';
import type { AppState } from '@/lib/types';

export function NativeBridges() {
  const { state, dispatch, ready } = useStore();
  const stateRef = useRef<AppState>(state);
  // Kept current before the effects below run, so they always read the latest store.
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  // ----- Home screen widget: today's calories, protein and next meal. -----
  const widgetsOn = widgetsAvailable();
  useEffect(() => {
    if (!ready || !widgetsOn) return;
    const t = setTimeout(() => updateCalorieWidget(stateRef.current), 500);
    return () => clearTimeout(t);
  }, [ready, widgetsOn, state.entries, state.exercises, state.goals]);

  // ----- Workout Live Activity. -----
  const w = state.activeWorkout;
  const rest = useRef<{ startedAt: number; endsAt: number } | null>(null);
  const lastDone = useRef<number | null>(null);
  const restTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!ready || !widgetsOn) return;
    if (!w) {
      rest.current = null;
      lastDone.current = null;
      endWorkoutActivity();
      return;
    }
    // The workout screen starts its rest timer whenever a set gets checked off; mirror that here.
    const done = doneSetCount(w);
    if (lastDone.current !== null && done > lastDone.current) {
      const now = Date.now();
      rest.current = { startedAt: now, endsAt: now + (stateRef.current.restSeconds ?? 90) * 1000 };
    } else if (lastDone.current !== null && done < lastDone.current) {
      rest.current = null;
    }
    lastDone.current = done;
    const push = () =>
      showWorkoutActivity(w.id, workoutActivityProps(w, { customExercises: stateRef.current.customExercises, rest: rest.current }));
    push();
    if (restTimer.current) clearTimeout(restTimer.current);
    if (rest.current && rest.current.endsAt > Date.now()) {
      // Drop the countdown when rest is over (while the app is open; otherwise the stale date does it).
      restTimer.current = setTimeout(() => {
        rest.current = null;
        push();
      }, rest.current.endsAt - Date.now() + 250);
    }
    return () => {
      if (restTimer.current) clearTimeout(restTimer.current);
    };
  }, [ready, widgetsOn, w]);

  // ----- Apple Health: sync on open, on return to the foreground and after new workouts/weigh-ins. -----
  const healthOn = loadHealthKit() !== null;
  useEffect(() => {
    if (!ready || !healthOn) return;
    const run = () => syncHealth(() => stateRef.current, dispatch).catch((e) => console.warn('[health]', e));
    run();
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') {
        run();
        updateCalorieWidget(stateRef.current);
      }
    });
    return () => sub.remove();
  }, [ready, healthOn, dispatch]);

  const workoutsCount = state.workouts.length;
  const weightsKey = JSON.stringify(state.weights);
  const first = useRef(true);
  useEffect(() => {
    if (!ready || !healthOn) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => syncHealth(() => stateRef.current, dispatch).catch(() => {}), 2000);
    return () => clearTimeout(t);
  }, [ready, healthOn, workoutsCount, weightsKey, dispatch]);

  // Widget refresh on foreground also when Health isn't in use.
  useEffect(() => {
    if (!ready || !widgetsOn || healthOn) return;
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') updateCalorieWidget(stateRef.current);
    });
    return () => sub.remove();
  }, [ready, widgetsOn, healthOn]);

  return null;
}
