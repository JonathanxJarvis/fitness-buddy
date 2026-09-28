import { useColorScheme, type TextStyle } from 'react-native';
import { useStore } from '@/store/StoreProvider';

const palette = {
  light: {
    primary: '#17804F',
    primarySoft: '#E3F2E9',
    onPrimary: '#FFFFFF',
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
    /** Hero card gradient (deep emerald). */
    hero: ['#0E3B28', '#17613F', '#1F7A50'] as const,
    shadow: '#0B2418',
  },
  dark: {
    primary: '#5CD69A',
    primarySoft: '#15291F',
    onPrimary: '#062012',
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
    hero: ['#0C2A1D', '#124530', '#185A3D'] as const,
    shadow: '#000000',
  },
};

/** Soft, slightly desaturated nutrient colors that read well on both themes. */
export const nutrientColors = {
  calories: '#22B573',
  protein: '#8B6CF6',
  carbs: '#F2A93B',
  fat: '#4C8DF6',
  fiber: '#2BB6A3',
  water: '#38B6F2',
  steps: '#EC6A9C',
};

export type Colors = typeof palette.light;

export function useTheme() {
  const system = useColorScheme();
  const { state } = useStore();
  const pref = state.settings.theme;
  const dark = pref === 'system' ? system === 'dark' : pref === 'dark';
  return { dark, colors: (dark ? palette.dark : palette.light) as Colors };
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
