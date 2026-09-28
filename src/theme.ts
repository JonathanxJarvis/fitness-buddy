import { useColorScheme } from 'react-native';
import { useStore } from '@/store/StoreProvider';

const palette = {
  light: {
    primary: '#2E7D32',
    primarySoft: '#E8F5E9',
    onPrimary: '#FFFFFF',
    background: '#F5F7F5',
    card: '#FFFFFF',
    cardAlt: '#F0F3F0',
    text: '#17211A',
    textMuted: '#5F6B63',
    border: '#E1E6E2',
    track: '#E6ECE7',
    danger: '#D93F3F',
    warning: '#E08A00',
    warningSoft: '#FFF4E0',
    success: '#2E7D32',
    info: '#1E6FB8',
    infoSoft: '#E6F1FB',
  },
  dark: {
    primary: '#66BB6A',
    primarySoft: '#1B2E1D',
    onPrimary: '#0B150C',
    background: '#0E1210',
    card: '#171D19',
    cardAlt: '#1F2621',
    text: '#EAF1EB',
    textMuted: '#9AA79E',
    border: '#2A332D',
    track: '#28312B',
    danger: '#FF6B6B',
    warning: '#FFB74D',
    warningSoft: '#2E2414',
    success: '#66BB6A',
    info: '#64B5F6',
    infoSoft: '#15222E',
  },
};

export const nutrientColors = {
  calories: '#43A047',
  protein: '#EF6C57',
  carbs: '#F4B400',
  fat: '#5B8DEF',
  water: '#29B6F6',
  steps: '#AB47BC',
};

export type Colors = typeof palette.light;

export function useTheme() {
  const system = useColorScheme();
  const { state } = useStore();
  const pref = state.settings.theme;
  const dark = pref === 'system' ? system === 'dark' : pref === 'dark';
  return { dark, colors: dark ? palette.dark : palette.light };
}

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
