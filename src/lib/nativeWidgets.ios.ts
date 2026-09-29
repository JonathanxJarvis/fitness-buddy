// iOS: expo-widgets only exists in an installed (development or App Store) build.
// Expo Go doesn't ship the ExpoWidgets native module, so we check before requiring anything
// that would call requireNativeModule('ExpoWidgets') and throw.
import { isRunningInExpoGo, requireOptionalNativeModule } from 'expo';
import type { NativeWidgets } from './nativeWidgets.types';

let cached: NativeWidgets | null | undefined;

export function loadNativeWidgets(): NativeWidgets | null {
  if (cached !== undefined) return cached;
  cached = null;
  try {
    if (isRunningInExpoGo() || !requireOptionalNativeModule('ExpoWidgets')) return null;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const layouts = require('../widgets/layouts') as typeof import('../widgets/layouts');
    cached = { calorieWidget: layouts.calorieWidget, workoutActivity: layouts.workoutActivity };
  } catch (e) {
    console.warn('[widgets] unavailable', e);
  }
  return cached;
}
