import type { AvatarConfig } from '@/lib/types';

/**
 * The building blocks of an illustrated person. Configs store indexes into
 * these lists so they stay tiny and safe to sync to friends.
 */
export const SKIN_TONES = ['#F7DCC8', '#EEC4A6', '#E2AC87', '#C98B64', '#A86C46', '#80512F', '#5B3822'];
export const HAIR_COLORS = ['#1E1916', '#3A281D', '#6A4430', '#96522C', '#C99A5B', '#E4D3B0', '#9D9892', '#2D3A55'];
export const TOP_COLORS = ['#2F5D50', '#3E5C8A', '#B4563F', '#D9A441', '#6D4C7D', '#2B2F36', '#E7E2D8', '#8C9A6B', '#C46B84'];
/** Soft portrait backdrops; the dark set is used in dark mode. */
export const BG_LIGHT = ['#D5E6DA', '#EADFCB', '#D3DFEC', '#F0D8D2', '#DFD8EC', '#DEDCD5'];
export const BG_DARK = ['#27463A', '#4A3F2E', '#2A3C54', '#553833', '#3E3656', '#3A3935'];

export const FACES = ['Oval', 'Round', 'Square', 'Heart'] as const;
export const HAIRS = ['Short', 'Side part', 'Buzz', 'Curls', 'Bun', 'Long', 'Bob', 'Afro', 'Bald', 'Ponytail', 'Headscarf'] as const;
export const BEARDS = ['None', 'Stubble', 'Beard', 'Moustache'] as const;
export const GLASSES = ['None', 'Round', 'Square'] as const;
export const TOPS = ['Tee', 'V-neck', 'Hoodie', 'Tank'] as const;

export const AVATAR_LIMITS: Record<keyof AvatarConfig, number> = {
  face: FACES.length,
  skin: SKIN_TONES.length,
  hair: HAIRS.length,
  hairColor: HAIR_COLORS.length,
  beard: BEARDS.length,
  glasses: GLASSES.length,
  top: TOPS.length,
  topColor: TOP_COLORS.length,
  bg: BG_LIGHT.length,
};

const KEYS = Object.keys(AVATAR_LIMITS) as (keyof AvatarConfig)[];

function rng(seed: string) {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/** The same seed (a name or a code) always draws the same person. */
export function avatarFromSeed(seed: string): AvatarConfig {
  const r = rng(seed.trim().toLowerCase() || 'friend');
  const pick = (n: number) => Math.floor(r() * n);
  const hair = pick(HAIRS.length - 1); // headscarf only by choice
  const bearded = hair !== 4 && hair !== 5 && hair !== 6 && hair !== 9 && r() < 0.35;
  return {
    face: pick(FACES.length),
    skin: pick(SKIN_TONES.length),
    hair,
    // Mostly natural colors; grey and navy dye are rarer.
    hairColor: r() < 0.88 ? pick(6) : 6 + pick(2),
    beard: bearded ? 1 + pick(BEARDS.length - 1) : 0,
    glasses: r() < 0.25 ? 1 + pick(GLASSES.length - 1) : 0,
    top: pick(TOPS.length),
    topColor: pick(TOP_COLORS.length),
    bg: pick(BG_LIGHT.length),
  };
}

/** Clamps anything (e.g. from a friend's snapshot) into a valid config, or undefined. */
export function cleanAvatar(raw: unknown): AvatarConfig | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const out = {} as AvatarConfig;
  for (const k of KEYS) {
    const v = o[k];
    out[k] = typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(AVATAR_LIMITS[k] - 1, Math.round(v))) : 0;
  }
  return out;
}

/** The config to draw for someone: theirs if set, otherwise one from their name. */
export function avatarFor(p: { avatar?: AvatarConfig; name?: string; code?: string }): AvatarConfig {
  return cleanAvatar(p.avatar) ?? avatarFromSeed(p.code || p.name || 'friend');
}
