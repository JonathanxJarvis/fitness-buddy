import React from 'react';
import { View } from 'react-native';
import { MuscleMap, mix } from '@/components/exercise/MuscleMap';
import { T } from '@/components/ui';
import type { MuscleRegion } from '@/lib/exerciseInfo';
import { STATE_LABEL, type MuscleRecovery, type RecoveryState } from '@/lib/recovery';
import { useTheme, type Colors } from '@/theme';

/**
 * Tints for fresh / recovering / tired, blended into the body map's own muscle
 * tone so they sit calmly on the figure in both themes.
 */
export function recoveryColors(colors: Colors, dark: boolean): Record<RecoveryState, string> {
  const muscle = mix(colors.text, colors.card, dark ? 0.2 : 0.155);
  return {
    fresh: mix(colors.success, muscle, dark ? 0.6 : 0.55),
    recovering: mix(colors.warning, muscle, dark ? 0.85 : 0.82),
    tired: mix(colors.danger, muscle, dark ? 0.9 : 0.86),
  };
}

/** Strong text color for each state (badges and words). */
export function recoveryInk(colors: Colors): Record<RecoveryState, string> {
  return { fresh: colors.success, recovering: colors.warning, tired: colors.danger };
}

export function RecoveryBody({ rec, size = 260 }: { rec: Record<MuscleRegion, MuscleRecovery> | Partial<Record<MuscleRegion, RecoveryState>>; size?: number }) {
  const { colors, dark } = useTheme();
  const tint = recoveryColors(colors, dark);
  const fills: Partial<Record<MuscleRegion, string>> = {};
  const tired: string[] = [];
  for (const [r, v] of Object.entries(rec) as [MuscleRegion, MuscleRecovery | RecoveryState][]) {
    const state = typeof v === 'string' ? v : v.state;
    fills[r] = tint[state];
    if (state !== 'fresh') tired.push(`${r} ${STATE_LABEL[state].toLowerCase()}`);
  }
  return <MuscleMap primary={[]} colors={fills} size={size} label={tired.length ? `Recovery map: ${tired.join(', ')}; everything else fresh` : 'Recovery map: every muscle fresh'} />;
}

export function RecoveryLegend({ counts, align = 'center' }: { counts?: Record<RecoveryState, number>; align?: 'center' | 'flex-start' }) {
  const { colors, dark } = useTheme();
  const tint = recoveryColors(colors, dark);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: align, columnGap: 12, rowGap: 4 }}>
      {(['fresh', 'recovering', 'tired'] as const).map((s) => (
        <View key={s} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tint[s] }} />
          <T size={12} weight="600" muted>
            {STATE_LABEL[s]}
            {counts ? ` ${counts[s]}` : ''}
          </T>
        </View>
      ))}
    </View>
  );
}

/** A made-up recovery state for previews (free users, empty logs). */
export const SAMPLE_RECOVERY: Partial<Record<MuscleRegion, RecoveryState>> = {
  chest: 'tired', 'front-delts': 'recovering', triceps: 'recovering', 'side-delts': 'recovering',
  quads: 'fresh', hamstrings: 'fresh', glutes: 'fresh', lats: 'fresh', 'upper-back': 'fresh', biceps: 'fresh',
  abs: 'fresh', obliques: 'fresh', calves: 'fresh', traps: 'fresh', 'rear-delts': 'fresh', forearms: 'fresh',
  'lower-back': 'fresh', adductors: 'fresh', abductors: 'fresh',
};
