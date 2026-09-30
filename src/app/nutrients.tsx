import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Card, ProgressBar, Screen, T } from '@/components/ui';
import { useStore } from '@/store/StoreProvider';
import { NUTRIENT_INFO, NUTRIENT_KEYS } from '@/lib/nutrition';
import { daySummary } from '@/lib/selectors';
import { prettyDate, todayKey } from '@/lib/dates';
import { nutrientColors, spacing, useTheme } from '@/theme';
import type { Goals, NutrientKey } from '@/lib/types';

export default function NutrientsScreen() {
  const { date = todayKey() } = useLocalSearchParams<{ date?: string }>();
  const { state } = useStore();
  const { colors } = useTheme();
  const goals = state.goals!;
  const { totals, entries } = useMemo(() => daySummary(state, date), [state, date]);

  // Count entries with no data for each nutrient, so users know when totals are incomplete.
  const missing = (k: NutrientKey) => entries.filter((e) => e.food.nutrients[k] === undefined).length;

  return (
    <Screen>
      <T muted style={{ marginBottom: spacing.md }}>{prettyDate(date)}</T>
      <Card>
        {NUTRIENT_KEYS.map((k) => {
          const info = NUTRIENT_INFO[k];
          const goal = goals[k as keyof Goals];
          const v = totals[k] ?? 0;
          const over = v > goal;
          const color = info.limit
            ? over
              ? colors.warning
              : colors.primary
            : k in nutrientColors
              ? nutrientColors[k as keyof typeof nutrientColors]
              : colors.primary;
          const m = missing(k);
          return (
            <View key={k} style={{ marginBottom: spacing.lg }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <T weight="700">{info.label}</T>
                <T muted>
                  {v < 10 && v > 0 ? v.toFixed(1) : Math.round(v)} / {goal} {info.unit}
                  {info.limit ? ' max' : ''}
                </T>
              </View>
              <ProgressBar value={v} max={goal} color={color} />
              {m > 0 && entries.length > 0 && (
                <T muted size={11} style={{ marginTop: 4 }}>
                  {m} of {entries.length} foods have no {info.label.toLowerCase()} data
                </T>
              )}
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}
