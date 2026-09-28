import type { AppState } from './types';

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

export const PRO_FEATURES: { icon: string; title: string; body: string }[] = [
  { icon: 'camera', title: 'Snap a meal', body: 'Photograph your plate. AI finds every food, weighs the portions and logs the macros.' },
  { icon: 'sparkles', title: 'AI Coach', body: 'Chat with an AI coach that sees your log, workouts and rank, and breaks down meal photos.' },
  { icon: 'people', title: 'Unlimited training crew', body: `Link up with as many friends as you want (free: ${FREE_FRIEND_LIMIT}) and race them up the ranks.` },
  { icon: 'color-palette', title: 'Kettle outfits', body: 'Dress your mascot in Gold, Midnight, Cherry or Neon.' },
  { icon: 'heart', title: 'Support an indie app', body: 'No ads, no data selling. Pro keeps it that way.' },
];

export const PLANS = [
  { id: 'yearly', label: 'Yearly', price: '€34.99', per: '/ year', note: '€2.92 a month · 7 days free', best: true },
  { id: 'monthly', label: 'Monthly', price: '€4.99', per: '/ month', note: 'Cancel anytime', best: false },
] as const;

/** The mascot outfit to draw: Pro users pick one, everyone else gets Classic. */
export function mascotSkin(state: Pick<AppState, 'settings'>): string {
  return isPro(state) ? state.settings.mascotSkin ?? 'classic' : 'classic';
}
