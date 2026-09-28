import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { useStore } from '@/store/StoreProvider';
import { todayKey } from './dates';

/**
 * Syncs today's step count from the phone's motion sensor.
 * iOS can read the whole day's history; Android only reports steps while the app is open,
 * so there we add live steps on top of whatever is already stored.
 */
export function usePedometer(enabled: boolean) {
  const { state, dispatch } = useStore();
  const [available, setAvailable] = useState<boolean | null>(null);
  const stored = useRef(0);
  stored.current = state.steps[todayKey()] ?? 0;

  useEffect(() => {
    if (!enabled) return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;

    (async () => {
      try {
        const ok = await Pedometer.isAvailableAsync();
        if (!ok) return setAvailable(false);
        const perm = await Pedometer.requestPermissionsAsync();
        if (!perm.granted || cancelled) return setAvailable(false);
        setAvailable(true);

        const day = todayKey();
        let base = stored.current;
        if (Platform.OS === 'ios') {
          const start = new Date();
          start.setHours(0, 0, 0, 0);
          const res = await Pedometer.getStepCountAsync(start, new Date());
          base = Math.max(base, res.steps);
          if (!cancelled) dispatch({ type: 'setSteps', date: day, steps: base });
        }
        if (cancelled) return;
        sub = Pedometer.watchStepCount((r) => {
          dispatch({ type: 'setSteps', date: day, steps: base + r.steps });
        });
      } catch {
        setAvailable(false);
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled, dispatch]);

  return available;
}
