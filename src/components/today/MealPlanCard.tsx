import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, IconTile, T } from '@/components/ui';
import { PressScale } from '@/components/motion';
import { ProMark } from '@/components/ProMark';
import { useStore } from '@/store/StoreProvider';
import { isPro } from '@/lib/pro';
import { findMeal } from '@/lib/meals';
import { dayTotals } from '@/lib/mealPlan';
import { fromKey, todayKey } from '@/lib/dates';
import { nutrientColors, spacing, useTheme } from '@/theme';

/** A quiet row on Today that opens the Pro meal plan (a locked preview for free users). */
export function MealPlanCard() {
  const { state } = useStore();
  const { colors } = useTheme();
  const plan = state.mealPlan;
  const today = todayKey();
  const idx = plan ? Math.round((fromKey(today).getTime() - fromKey(plan.startDate).getTime()) / 86400000) : -1;
  const day = plan && idx >= 0 ? plan.days[idx] : undefined;
  let subtitle = 'A week of meals that hit your calories and protein';
  if (isPro(state)) {
    if (day) {
      const dinner = findMeal(day.meals.find((m) => m.slot === 'dinner')?.mealId ?? '');
      const t = dayTotals(day);
      subtitle = `${dinner ? `Tonight: ${dinner.name}` : 'Today’s meals'} · ${Math.round(t.calories).toLocaleString('en-US')} kcal`;
    } else if (plan) subtitle = 'Your plan has ended. Plan next week';
    else subtitle = 'Plan a week of meals with a shopping list';
  }
  return (
    <PressScale accessibilityRole="button" accessibilityLabel="Meal plan" onPress={() => router.push('/meal-plan')} scaleTo={0.98}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: spacing.md }}>
        <IconTile icon="restaurant" color={nutrientColors.protein} size={38} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T weight="800">Meal plan</T>
            <ProMark />
          </View>
          <T size={12} muted numberOfLines={1} style={{ marginTop: 2 }}>{subtitle}</T>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Card>
    </PressScale>
  );
}
