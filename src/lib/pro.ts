import type { AppState } from './types';
import { hasItem } from './loot';

/**
 * Fitness Buddy Pro. The preview build (EXPO_PUBLIC_PREVIEW=1) unlocks
 * everything so every feature can be tried; store builds unlock it through an
 * in-app subscription (see docs/MONETIZATION.md).
 */
export const PREVIEW = process.env.EXPO_PUBLIC_PREVIEW === '1';

export function isPro(state: Pick<AppState, 'settings'>): boolean {
  return PREVIEW || !!state.settings.pro;
}

/** Friends you can link without Pro. */
export const FREE_FRIEND_LIMIT = 3;

/** The four reasons to buy, shown as tiles on the Pro screen. */
export const PRO_HEADLINES: { icon: string; title: string; line: string }[] = [
  { icon: 'camera', title: 'Snap a meal', line: 'Photo in, macros out' },
  { icon: 'trending-up', title: 'Smart progression', line: 'Know what to lift next' },
  { icon: 'restaurant', title: 'Meal plans', line: 'Your week, planned' },
  { icon: 'sparkles', title: 'AI Coach', line: 'Answers from your data' },
];

/** Everything else Pro adds, shown as small chips under the tiles. */
export const PRO_EXTRAS: { icon: string; label: string }[] = [
  { icon: 'stats-chart', label: 'Deep stats' },
  { icon: 'body', label: 'Recovery map' },
  { icon: 'people', label: `Unlimited friends (free: ${FREE_FRIEND_LIMIT})` },
  { icon: 'paw', label: 'Pro pets and outfits' },
];

export const PLANS = [
  { id: 'yearly', label: 'Yearly', price: '€34.99', per: '/ year', note: '€2.92 a month · 7 days free', best: true },
  { id: 'monthly', label: 'Monthly', price: '€4.99', per: '/ month', note: 'Cancel anytime', best: false },
] as const;

/** The mascot outfit to draw: Pro users pick one, everyone else gets Classic. */
export function mascotSkin(state: Pick<AppState, 'settings'> & { loot?: AppState['loot'] }): string {
  const skin = state.settings.mascotSkin ?? 'classic';
  return hasItem(`skin:${skin}`, isPro(state), state.loot?.owned) ? skin : 'classic';
}

/** The equipped aura, if you still have it. */
export function petAura(state: Pick<AppState, 'settings'> & { loot?: AppState['loot'] }): string {
  const aura = state.settings.petAura ?? 'none';
  return hasItem(`aura:${aura}`, isPro(state), state.loot?.owned) ? aura : 'none';
}

/** Pets everyone gets; the rest come with Pro. */
export const FREE_PETS = ['kettle', 'shaker', 'egg'];

/** The pet to draw: a Pro pet falls back to Kettle if Pro lapses. */
export function petSpecies(state: Pick<AppState, 'settings'> & { loot?: AppState['loot'] }): string {
  const pet = state.settings.pet ?? 'kettle';
  return FREE_PETS.includes(pet) || hasItem(`pet:${pet}`, isPro(state), state.loot?.owned) ? pet : 'kettle';
}

export function petName(state: Pick<AppState, 'settings'>, fallback = 'Kettle'): string {
  return state.settings.petName?.trim() || fallback;
}
