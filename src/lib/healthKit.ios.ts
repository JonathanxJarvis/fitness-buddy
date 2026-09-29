// iOS: @kingstinct/react-native-healthkit needs its native code (Nitro modules), which Expo Go
// doesn't have. Requiring it there would throw, so check first and require lazily.
import { isRunningInExpoGo } from 'expo';
import type { HealthUnavailableReason } from './healthKit';

export type { HealthUnavailableReason };
export type HealthKitModule = typeof import('@kingstinct/react-native-healthkit');

let cached: HealthKitModule | null | undefined;
let reason: HealthUnavailableReason | null = null;

export function loadHealthKit(): HealthKitModule | null {
  if (cached !== undefined) return cached;
  cached = null;
  if (isRunningInExpoGo()) {
    reason = 'expo-go';
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@kingstinct/react-native-healthkit') as HealthKitModule;
    if (mod.isHealthDataAvailable()) cached = mod;
    else reason = 'device';
  } catch (e) {
    reason = 'no-native';
    console.warn('[health] unavailable', e);
  }
  return cached;
}

export function healthUnavailableReason(): HealthUnavailableReason | null {
  loadHealthKit();
  return reason;
}
