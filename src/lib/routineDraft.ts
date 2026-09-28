import { useSyncExternalStore } from 'react';

/*
 * The workout being built in the routine builder. The exercise picker is its
 * own screen, so picked exercises land here and the builder picks them up.
 */
type Listener = () => void;
let pending: string[] = [];
const listeners = new Set<Listener>();

export function addToDraft(ids: string[]) {
  pending = [...pending, ...ids];
  listeners.forEach((l) => l());
}

/** Takes the exercises picked since the last call. */
export function takeDraft(): string[] {
  const out = pending;
  pending = [];
  return out;
}

export function usePendingDraft(): number {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => pending.length,
  );
}
