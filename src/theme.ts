import { useColorScheme, type TextStyle } from 'react-native';
import { useStore } from '@/store/StoreProvider';
import { SESSIONS, SESSION_TINT } from '@/lib/plan';
import type { AccentKey, LookPref } from '@/lib/types';

export interface Colors {
  primary: string;
  primarySoft: string;
  onPrimary: string;
  background: string;
  card: string;
  cardAlt: string;
  text: string;
  textMuted: string;
  border: string;
  track: string;
  danger: string;
  warning: string;
  warningSoft: string;
  success: string;
  info: string;
  infoSoft: string;
  ink: string;
  onInk: string;
  /** Hero card gradient, darkest first. */
  hero: readonly [string, string, string];
  shadow: string;
}

type Base = Omit<Colors, 'primary' | 'primarySoft' | 'onPrimary' | 'hero' | 'shadow'>;

const greenBase: { light: Base; dark: Base } = {
  light: {
    background: '#F3F5F2',
    card: '#FFFFFF',
    cardAlt: '#EDF1EC',
    text: '#0F1A14',
    textMuted: '#6A766F',
    border: '#E2E7E1',
    track: '#E7ECE6',
    danger: '#D6453D',
    warning: '#D98A1C',
    warningSoft: '#FBF1E1',
    success: '#17804F',
    info: '#2F6FD0',
    infoSoft: '#E7EFFB',
    ink: '#0F1A14',
    onInk: '#FFFFFF',
  },
  dark: {
    background: '#090D0B',
    card: '#121915',
    cardAlt: '#19221D',
    text: '#EDF3EE',
    textMuted: '#8D9A92',
    border: '#212B25',
    track: '#222C26',
    danger: '#FF7A70',
    warning: '#F2B35C',
    warningSoft: '#2A2114',
    success: '#5CD69A',
    info: '#7DAEF7',
    infoSoft: '#142033',
    ink: '#EDF3EE',
    onInk: '#0B120E',
  },
};

const neutralBase: { light: Base; dark: Base } = {
  light: {
    ...greenBase.light,
    background: '#F4F4F3',
    cardAlt: '#EEEEED',
    text: '#141516',
    textMuted: '#6E7072',
    border: '#E4E4E3',
    track: '#E8E8E7',
    ink: '#141516',
  },
  dark: {
    ...greenBase.dark,
    background: '#0B0B0C',
    card: '#151517',
    cardAlt: '#1C1C1F',
    text: '#EEEEEF',
    textMuted: '#9A9B9F',
    border: '#26262A',
    track: '#27272B',
    ink: '#EEEEEF',
    onInk: '#0E0E10',
  },
};

interface Accent {
  label: string;
  /** Swatch and theme-independent uses (calorie color in Simple). */
  mid: string;
  light: Pick<Colors, 'primary' | 'primarySoft' | 'onPrimary' | 'hero' | 'shadow'>;
  dark: Pick<Colors, 'primary' | 'primarySoft' | 'onPrimary' | 'hero' | 'shadow'>;
}

export const ACCENTS: Record<AccentKey, Accent> = {
  emerald: {
    label: 'Emerald',
    mid: '#22B573',
    light: { primary: '#17804F', primarySoft: '#E3F2E9', onPrimary: '#FFFFFF', hero: ['#0E3B28', '#17613F', '#1F7A50'], shadow: '#0B2418' },
    dark: { primary: '#5CD69A', primarySoft: '#15291F', onPrimary: '#062012', hero: ['#0C2A1D', '#124530', '#185A3D'], shadow: '#000000' },
  },
  blue: {
    label: 'Blue',
    mid: '#4C8DF6',
    light: { primary: '#2A5FC4', primarySoft: '#E6EEFB', onPrimary: '#FFFFFF', hero: ['#0F2447', '#1A3C73', '#24509A'], shadow: '#0A1830' },
    dark: { primary: '#86AEF7', primarySoft: '#141F33', onPrimary: '#08152B', hero: ['#0B1A33', '#132C55', '#1B3D73'], shadow: '#000000' },
  },
  violet: {
    label: 'Violet',
    mid: '#8B6CF6',
    light: { primary: '#6246C4', primarySoft: '#EEEAFB', onPrimary: '#FFFFFF', hero: ['#23174A', '#382676', '#4A349A'], shadow: '#150E2E' },
    dark: { primary: '#B4A2F8', primarySoft: '#1F1933', onPrimary: '#170D33', hero: ['#181033', '#271B55', '#352573'], shadow: '#000000' },
  },
  orange: {
    label: 'Amber',
    mid: '#EE8A4A',
    light: { primary: '#B9531C', primarySoft: '#FBEDE4', onPrimary: '#FFFFFF', hero: ['#40200D', '#6A3517', '#8C4820'], shadow: '#2A1408' },
    dark: { primary: '#F4A06C', primarySoft: '#2C1C12', onPrimary: '#2B1206', hero: ['#2C160A', '#4A2612', '#63341A'], shadow: '#000000' },
  },
  graphite: {
    label: 'Graphite',
    mid: '#7A838C',
    light: { primary: '#2F3439', primarySoft: '#ECEDEE', onPrimary: '#FFFFFF', hero: ['#1B1E21', '#2A2F34', '#3A4046'], shadow: '#0A0B0C' },
    dark: { primary: '#D5D9DD', primarySoft: '#1F2226', onPrimary: '#111315', hero: ['#131517', '#1E2226', '#2A2F34'], shadow: '#000000' },
  },
};

export const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];

const cache = new Map<string, Colors>();

/** The full color set for a mode, look and accent (same object for the same inputs). */
export function themeColors(dark: boolean, look: LookPref = 'colorful', accent: AccentKey = 'emerald'): Colors {
  const k = `${dark}:${look}:${accent}`;
  let c = cache.get(k);
  if (!c) cache.set(k, (c = buildColors(dark, look, accent)));
  return c;
}

function buildColors(dark: boolean, look: LookPref = 'colorful', accent: AccentKey = 'emerald'): Colors {
  const mode = dark ? 'dark' : 'light';
  const a = (ACCENTS[accent] ?? ACCENTS.emerald)[mode];
  if (look === 'simple') {
    const base = neutralBase[mode];
    const calm = ACCENTS.graphite[mode];
    return {
      ...base,
      ...a,
      info: a.primary,
      infoSoft: base.cardAlt,
      warningSoft: base.cardAlt,
      success: a.primary,
      hero: calm.hero,
      shadow: calm.shadow,
    };
  }
  return { ...(accent === 'emerald' ? greenBase : neutralBase)[mode], ...a };
}

const COLORFUL_NUTRIENTS = {
  calories: '#22B573',
  protein: '#8B6CF6',
  carbs: '#F2A93B',
  fat: '#4C8DF6',
  fiber: '#2BB6A3',
  water: '#38B6F2',
  steps: '#EC6A9C',
};

const SIMPLE_NUTRIENTS: Omit<typeof COLORFUL_NUTRIENTS, 'calories'> = {
  protein: '#7D84A3',
  carbs: '#B39B72',
  fat: '#6F93A8',
  fiber: '#7FA08F',
  water: '#7FA3B8',
  steps: '#A88595',
};

/**
 * Soft nutrient colors that read well on both themes. Many screens import this
 * object directly, so the look is applied by updating it in place (useTheme).
 */
export const nutrientColors = { ...COLORFUL_NUTRIENTS };

const COLORFUL_SESSIONS = Object.fromEntries(SESSIONS.map((s) => [s.id, s.color]));
const COLORFUL_ROUTINE = SESSION_TINT.routine;
const SIMPLE_SESSIONS: Record<string, string> = {
  push: '#8A6F62',
  chest: '#8A6F62',
  upper: '#8A6F62',
  pull: '#5F7390',
  back: '#5F7390',
  legs: '#766B8C',
  lower: '#766B8C',
  full: '#5E7F6E',
  shoulders: '#8A7B58',
  arms: '#5A807B',
};

/** Nutrient colors and a session color for a look, without applying it (previews). */
export function lookSample(look: LookPref, accent: AccentKey) {
  const simple = look === 'simple';
  const n = simple ? { ...SIMPLE_NUTRIENTS, calories: (ACCENTS[accent] ?? ACCENTS.emerald).mid } : COLORFUL_NUTRIENTS;
  return { nutrients: n, session: simple ? SIMPLE_SESSIONS.push : COLORFUL_SESSIONS.push };
}

let applied = '';
/** Points the shared color objects (nutrients, plan sessions) at the chosen look. */
function applyLook(look: LookPref, accent: AccentKey) {
  const k = `${look}:${accent}`;
  if (k === applied) return;
  applied = k;
  const simple = look === 'simple';
  Object.assign(nutrientColors, lookSample(look, accent).nutrients);
  for (const s of SESSIONS) s.color = (simple ? SIMPLE_SESSIONS[s.id] : undefined) ?? COLORFUL_SESSIONS[s.id] ?? s.color;
  SESSION_TINT.routine = simple ? '#6B7580' : COLORFUL_ROUTINE;
}

export function useTheme() {
  const system = useColorScheme();
  const { state } = useStore();
  const { theme: pref, look = 'colorful', accent = 'emerald' } = state.settings;
  const dark = pref === 'system' ? system === 'dark' : pref === 'dark';
  applyLook(look, accent);
  return { dark, colors: themeColors(dark, look, accent) };
}

/** Plus Jakarta Sans faces, loaded in the root layout. */
export const FONTS = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
};

/**
 * Maps a font weight to the matching Plus Jakarta Sans face. Custom fonts ignore
 * fontWeight on Android, so each weight is its own family.
 */
export function font(weight: TextStyle['fontWeight'] = '400'): TextStyle {
  const w = String(weight);
  const family =
    w === '800' || w === '900' || w === 'heavy' || w === 'black'
      ? FONTS.extrabold
      : w === '700' || w === 'bold'
        ? FONTS.bold
        : w === '600' || w === 'semibold'
          ? FONTS.semibold
          : w === '500' || w === 'medium'
            ? FONTS.medium
            : FONTS.regular;
  return { fontFamily: family };
}

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 };
// Compact scale: tight enough to fit more on a phone without feeling cramped.
export const spacing = { xs: 4, sm: 8, md: 10, lg: 14, xl: 20 };
