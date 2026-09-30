// Web and Android: no Apple Health. See healthKit.ios.ts.
export type HealthKitModule = typeof import('@kingstinct/react-native-healthkit');
/** Why Apple Health can't be used here. */
export type HealthUnavailableReason = 'expo-go' | 'web' | 'platform' | 'no-native' | 'device';

export function loadHealthKit(): HealthKitModule | null {
  return null;
}

export function healthUnavailableReason(): HealthUnavailableReason | null {
  return typeof document !== 'undefined' ? 'web' : 'platform';
}
