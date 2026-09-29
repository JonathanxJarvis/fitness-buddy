// Home screen widget glue: pushes today's calories to the iOS widget.
// A no-op in Expo Go, on web and on Android (loadNativeWidgets returns null there).
import type { AppState } from './types';
import { calorieDayFromState, calorieWidgetTimeline } from './widgetData';
import { loadNativeWidgets } from './nativeWidgets';
import { todayKey } from './dates';

export const widgetsAvailable = () => loadNativeWidgets() !== null;

let lastKey = '';

/** Refresh the widget's timeline from the store. Cheap to call often: it skips unchanged data. */
export function updateCalorieWidget(state: AppState, now = new Date()): void {
  const native = loadNativeWidgets();
  if (!native) return;
  const date = todayKey();
  const day = calorieDayFromState(state, date);
  const key = JSON.stringify([date, now.getHours(), day]);
  if (key === lastKey) return;
  lastKey = key;
  try {
    native.calorieWidget.updateTimeline(calorieWidgetTimeline(day, now));
  } catch (e) {
    console.warn('[widgets] update failed', e);
  }
}
