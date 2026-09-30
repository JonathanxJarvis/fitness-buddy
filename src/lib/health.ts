// Apple Health sync: reads steps, active energy, body weight and workouts from other apps;
// writes finished workouts and weigh-ins. Free for everyone.
//
// Only works in an installed iOS build. In Expo Go, on web and on Android `healthStatus()`
// explains why and every call here is a no-op.
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Action } from '@/store/reducer';
import type { AppState } from './types';
import { addDays, fromKey, todayKey, toKey } from './dates';
import { healthUnavailableReason, loadHealthKit, type HealthKitModule, type HealthUnavailableReason } from './healthKit';
import {
  EMPTY_HEALTH_META,
  stepUpdates,
  trimDays,
  weightExports,
  weightImports,
  workoutExports,
  workoutImports,
  type HealthMeta,
  type HealthWeightSample,
  type HealthWorkout,
} from './healthSync';

const META_KEY = 'fitness-buddy:health:v1';
/** How far back each sync looks. */
const LOOKBACK_DAYS = 14;

const STEPS = 'HKQuantityTypeIdentifierStepCount' as const;
const ENERGY = 'HKQuantityTypeIdentifierActiveEnergyBurned' as const;
const WEIGHT = 'HKQuantityTypeIdentifierBodyMass' as const;
const WORKOUT = 'HKWorkoutTypeIdentifier' as const;

// ---------- meta store (persisted, observable) ----------

let meta: HealthMeta = EMPTY_HEALTH_META;
let loaded: Promise<HealthMeta> | null = null;
let syncing = false;
const listeners = new Set<() => void>();

function setMeta(next: HealthMeta) {
  meta = next;
  listeners.forEach((l) => l());
  AsyncStorage.setItem(META_KEY, JSON.stringify(next)).catch(() => {});
}

function loadMeta(): Promise<HealthMeta> {
  loaded ??= AsyncStorage.getItem(META_KEY)
    .then((raw) => {
      if (raw) {
        meta = { ...EMPTY_HEALTH_META, ...JSON.parse(raw) };
        listeners.forEach((l) => l());
      }
      return meta;
    })
    .catch(() => meta);
  return loaded;
}

export interface HealthStatus {
  /** Why Health can't be used here, or null when it can. */
  unavailable: HealthUnavailableReason | null;
  meta: HealthMeta;
  syncing: boolean;
}

let snapshot: HealthStatus | null = null;
function getSnapshot(): HealthStatus {
  if (!snapshot || snapshot.meta !== meta || snapshot.syncing !== syncing) {
    snapshot = { unavailable: healthUnavailableReason(), meta, syncing };
  }
  return snapshot;
}
function subscribe(l: () => void) {
  listeners.add(l);
  loadMeta();
  return () => {
    listeners.delete(l);
  };
}

/** Live Health status for the Profile row. */
export function useHealthStatus(): HealthStatus {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Plain-language status line. */
export function healthStatusText(s: HealthStatus, todayStepsInApp?: number): string {
  switch (s.unavailable) {
    case 'expo-go':
    case 'web':
    case 'no-native':
      return 'Needs the installed app';
    case 'device':
      return 'Apple Health isn’t available on this device';
    case 'platform':
      return 'Apple Health is iPhone only';
  }
  if (!s.meta.connected) return 'Sync steps, active energy, weight and workouts';
  if (s.syncing) return 'Syncing…';
  if (s.meta.lastError && !s.meta.lastSync) return 'Couldn’t sync. Check Settings › Health › Data Access.';
  const today = todayKey();
  const kcal = s.meta.activeKcal[today];
  const steps = Math.max(s.meta.healthSteps[today] ?? 0, todayStepsInApp ?? 0);
  const parts = [`${steps.toLocaleString('en-US')} steps`, kcal ? `${Math.round(kcal).toLocaleString('en-US')} active kcal` : null].filter(Boolean);
  return `Connected · today ${parts.join(' · ')}`;
}

// ---------- connect + sync ----------

function mustLoad(): HealthKitModule | null {
  return loadHealthKit();
}

/** Show Apple's Health permission sheet. Resolves true once the user has answered it. */
export async function connectHealth(): Promise<boolean> {
  const hk = mustLoad();
  if (!hk) return false;
  await loadMeta();
  try {
    await hk.requestAuthorization({
      toRead: [STEPS, ENERGY, WEIGHT, WORKOUT],
      toShare: [WEIGHT, ENERGY, WORKOUT],
    });
    // Apple never tells apps which read permissions were granted (privacy), so from here on we just
    // sync what we can see; types the user said no to simply come back empty.
    setMeta({ ...meta, connected: true, connectedAt: meta.connectedAt ?? Date.now(), lastError: undefined });
    return true;
  } catch (e) {
    setMeta({ ...meta, lastError: (e as Error).message });
    return false;
  }
}

/** Stop syncing (Health permissions stay as they are; the user manages them in the Health app). */
export function disconnectHealth(): void {
  setMeta({ ...meta, connected: false });
}

function dayStart(key: string): Date {
  return fromKey(key);
}

async function dailySums(hk: HealthKitModule, id: typeof STEPS | typeof ENERGY, unit: 'count' | 'kcal', from: string): Promise<Record<string, number>> {
  const rows = await hk.queryStatisticsCollectionForQuantity(id, ['cumulativeSum'], dayStart(from), { day: 1 }, { unit, filter: { date: { startDate: dayStart(from) } } });
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (r.startDate && r.sumQuantity) out[toKey(new Date(r.startDate))] = Math.round(r.sumQuantity.quantity);
  }
  return out;
}

type Dispatch = (a: Action) => void;

/**
 * Pull from Health into the app and push new app data to Health.
 * Safe to call often (app open, back to foreground, after a workout): it never runs twice at once.
 */
export async function syncHealth(getState: () => AppState, dispatch: Dispatch): Promise<void> {
  const hk = mustLoad();
  if (!hk || syncing) return;
  await loadMeta();
  if (!meta.connected) return;
  syncing = true;
  listeners.forEach((l) => l());
  const today = todayKey();
  const from = addDays(today, -(LOOKBACK_DAYS - 1));
  const since = dayStart(from);
  let next: HealthMeta = { ...meta };
  const errors: string[] = [];
  const attempt = async (label: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (e) {
      errors.push(`${label}: ${(e as Error).message}`);
    }
  };
  let own = '';
  try {
    own = hk.currentAppSource().bundleIdentifier;
  } catch {}

  // Steps (Health merges iPhone + Watch; we keep the larger per day).
  await attempt('steps', async () => {
    const steps = await dailySums(hk, STEPS, 'count', from);
    next.healthSteps = trimDays({ ...next.healthSteps, ...steps }, today);
    for (const u of stepUpdates(getState().steps, steps)) dispatch({ type: 'setSteps', date: u.date, steps: u.steps });
  });

  // Active energy: kept for display (the app's calorie budget counts logged exercise, not all-day movement).
  await attempt('energy', async () => {
    const kcal = await dailySums(hk, ENERGY, 'kcal', from);
    next.activeKcal = trimDays({ ...next.activeKcal, ...kcal }, today);
  });

  // Body weight from other apps and scales.
  await attempt('weight', async () => {
    const samples = await hk.queryQuantitySamples(WEIGHT, { limit: 0, unit: 'kg', ascending: true, filter: { date: { startDate: since } } });
    const plain: HealthWeightSample[] = samples.map((s) => ({
      uuid: s.uuid,
      at: new Date(s.endDate).getTime(),
      kg: s.quantity,
      source: s.sourceRevision?.source?.bundleIdentifier ?? '',
    }));
    const state = getState();
    const imports = weightImports(plain, state.weights, next.importedWeights, own);
    for (const w of imports) dispatch({ type: 'setWeight', date: w.date, kg: w.kg });
    next.importedWeights = trimDays({ ...next.importedWeights, ...Object.fromEntries(imports.map((w) => [w.date, w.kg])) }, today, 400);
  });

  // Workouts recorded by other apps (Apple Watch, running apps).
  await attempt('workouts', async () => {
    const proxies = await hk.queryWorkoutSamples({ limit: 0, ascending: true, filter: { date: { startDate: since } } });
    const plain: HealthWorkout[] = proxies.map((w) => {
      const j = w.toJSON();
      const meta = (j.metadata ?? {}) as Record<string, unknown>;
      return {
        uuid: j.uuid,
        start: new Date(j.startDate).getTime(),
        end: new Date(j.endDate).getTime(),
        activityType: Number(j.workoutActivityType),
        kcal: j.totalEnergyBurned?.unit === 'kcal' ? j.totalEnergyBurned.quantity : j.totalEnergyBurned ? j.totalEnergyBurned.quantity / (j.totalEnergyBurned.unit === 'kJ' ? 4.184 : 1) : undefined,
        source: j.sourceRevision?.source?.bundleIdentifier ?? '',
        externalId: typeof meta.HKExternalUUID === 'string' ? meta.HKExternalUUID : undefined,
      };
    });
    proxies.forEach((w) => w.dispose?.());
    const state = getState();
    for (const e of workoutImports(plain, state.exercises, state.workouts, own)) dispatch({ type: 'addExercise', exercise: e });
  });

  // Push: finished workouts and weigh-ins logged here.
  await attempt('export', async () => {
    next = await pushToHealth(hk, getState(), next);
  });

  next.lastSync = Date.now();
  next.lastError = errors.length ? errors.join('; ') : undefined;
  if (errors.length) console.warn('[health] sync issues', errors);
  syncing = false;
  setMeta(next);
}

async function pushToHealth(hk: HealthKitModule, state: AppState, m: HealthMeta): Promise<HealthMeta> {
  const next = { ...m, exportedWorkouts: [...m.exportedWorkouts], exportedWeights: { ...m.exportedWeights } };
  for (const w of workoutExports(state.workouts, m)) {
    const start = new Date(w.startedAt);
    const end = new Date(w.endedAt ?? w.startedAt);
    const kcal = w.calories ?? 0;
    await hk.saveWorkoutSample(
      hk.WorkoutActivityType.traditionalStrengthTraining,
      kcal > 0 ? [{ quantityType: ENERGY, quantity: kcal, unit: 'kcal', startDate: start, endDate: end }] : [],
      start,
      end,
      kcal > 0 ? { energyBurned: kcal } : undefined,
      { HKExternalUUID: w.id, HKWorkoutBrandName: 'Fitness Buddy' },
    );
    next.exportedWorkouts = [...next.exportedWorkouts, w.id].slice(-500);
  }
  for (const { date, kg } of weightExports(state.weights, m)) {
    // Weigh-ins are logged per day; record them at 8:00 that morning (or now, for today).
    const at = date === todayKey() ? new Date() : new Date(fromKey(date).getTime() + 8 * 3600_000);
    await hk.saveQuantitySample(WEIGHT, 'kg', kg, at, at, { HKWasUserEntered: true });
    next.exportedWeights[date] = kg;
  }
  next.exportedWeights = trimDays(next.exportedWeights, todayKey(), 400);
  return next;
}
