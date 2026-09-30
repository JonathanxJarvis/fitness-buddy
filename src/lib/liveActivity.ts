// Workout Live Activity glue (lock screen + Dynamic Island).
// A no-op in Expo Go, on web and on Android (loadNativeWidgets returns null there).
import type { LiveActivity } from 'expo-widgets';
import { loadNativeWidgets } from './nativeWidgets';
import { APP_SCHEME, activityKey, type WorkoutActivityProps } from './widgetData';

let current: LiveActivity<WorkoutActivityProps> | null = null;
let currentWorkoutId: string | null = null;
let lastKey = '';

export const liveActivitiesAvailable = () => loadNativeWidgets() !== null;

/** Start the activity for a workout, or update it when it's already running. */
export async function showWorkoutActivity(workoutId: string, props: WorkoutActivityProps): Promise<void> {
  const native = loadNativeWidgets();
  if (!native) return;
  const key = activityKey(props);
  // Rest ends on its own on the lock screen: the activity goes stale then and the layout drops the countdown.
  const stale = props.restEndsAt > 0 ? new Date(props.restEndsAt) : undefined;
  try {
    if (!current) {
      // After an app restart the activity may still be on screen: pick it up instead of starting a second one.
      const existing = native.workoutActivity.getInstances();
      if (existing.length && currentWorkoutId === null) {
        current = existing[0];
        for (const extra of existing.slice(1)) await extra.end('immediate');
      }
    }
    if (current && currentWorkoutId !== null && currentWorkoutId !== workoutId) {
      await current.end('immediate');
      current = null;
    }
    currentWorkoutId = workoutId;
    if (!current) {
      current = native.workoutActivity.start(props, `${APP_SCHEME}://workout`, stale);
      lastKey = key;
      return;
    }
    if (key === lastKey) return;
    lastKey = key;
    await current.update(props, stale);
  } catch (e) {
    // Live Activities can be turned off in Settings; the workout itself carries on.
    console.warn('[liveActivity] failed', e);
  }
}

/** End the activity (workout finished or discarded). */
export async function endWorkoutActivity(): Promise<void> {
  const native = loadNativeWidgets();
  if (!native) return;
  const all = current ? [current] : native.workoutActivity.getInstances();
  current = null;
  currentWorkoutId = null;
  lastKey = '';
  for (const a of all) {
    try {
      await a.end('immediate');
    } catch (e) {
      console.warn('[liveActivity] end failed', e);
    }
  }
}
