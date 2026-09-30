import { useSyncExternalStore } from 'react';
import type { Food, SavedMealItem } from '@/lib/types';

// Short-lived, in-memory state shared between screens (not persisted).

/** Foods passed between screens by id, since route params must be strings. */
const foodCache = new Map<string, Food>();
export function cacheFood(food: Food): string {
  foodCache.set(food.id, food);
  return food.id;
}
export const getCachedFood = (id: string) => foodCache.get(id);

/** Draft items for the saved-meal builder. */
let draft: SavedMealItem[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const mealDraft = {
  get: () => draft,
  set(items: SavedMealItem[]) {
    draft = items;
    emit();
  },
  add(item: SavedMealItem) {
    draft = [...draft, item];
    emit();
  },
  removeAt(index: number) {
    draft = draft.filter((_, i) => i !== index);
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useMealDraft(): SavedMealItem[] {
  return useSyncExternalStore(mealDraft.subscribe, mealDraft.get, mealDraft.get);
}
