import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, CountUp, IconButton, Screen, T } from '@/components/ui';
import { useStore } from '@/store/StoreProvider';
import { currentStreak, longestStreak, MONTH_NAMES, monthGrid, prettyDate, todayKey, WEEKDAY_LETTERS, fromKey } from '@/lib/dates';
import { daySummary, loggedDays, totalsByDate } from '@/lib/selectors';
import { itemNutrients } from '@/lib/nutrition';
import { formatWater } from '@/lib/units';
import { MEALS } from '@/lib/types';
import { nutrientColors, radius, spacing, useTheme } from '@/theme';

export default function CalendarScreen() {
  const { state, setSelectedDate } = useStore();
  const { colors } = useTheme();
  const today = todayKey();
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [picked, setPicked] = useState(today);

  const cells = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor]);
  const logged = useMemo(() => loggedDays(state), [state.entries]);
  const monthTotals = useMemo(() => totalsByDate(state, cells.filter((c): c is string => !!c)), [state, cells]);
  const goal = state.goals!.calories;
  const units = state.settings.units;

  const day = useMemo(() => daySummary(state, picked), [state, picked]);
  const loggedThisMonth = cells.filter((c) => c && logged.has(c)).length;

  const shift = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  };

  const dotColor = (key: string) => {
    if (!logged.has(key)) return null;
    const cal = monthTotals[key]?.calories ?? 0;
    if (cal > goal * 1.1) return colors.warning;
    if (cal < goal * 0.7) return colors.info;
    return colors.primary;
  };

  return (
    <Screen topInset tabs>
      <T size={30} weight="800" style={{ marginBottom: spacing.lg }}>Diary</T>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Ionicons name="flame" size={24} color={colors.warning} />
          <CountUp value={currentStreak(logged)} size={26} weight="800" />
          <T muted size={12}>Current streak</T>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Ionicons name="trophy" size={24} color={colors.primary} />
          <CountUp value={longestStreak(logged)} size={26} weight="800" />
          <T muted size={12}>Best streak</T>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Ionicons name="checkmark-done" size={24} color={colors.info} />
          <T size={24} weight="800">{loggedThisMonth}</T>
          <T muted size={12}>Days this month</T>
        </Card>
      </View>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <IconButton label="Previous month" icon="chevron-back" onPress={() => shift(-1)} />
          <T size={17} weight="700">
            {MONTH_NAMES[cursor.m]} {cursor.y}
          </T>
          <IconButton label="Next month" icon="chevron-forward" onPress={() => shift(1)} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          {WEEKDAY_LETTERS.map((l, i) => (
            <T key={i} muted size={12} weight="700" center style={{ flex: 1 }}>{l}</T>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
          {cells.map((key, i) => {
            if (!key) return <View key={i} style={{ width: `${100 / 7}%`, height: 46 }} />;
            const dot = dotColor(key);
            const sel = key === picked;
            const isToday = key === today;
            return (
              <Pressable key={key} onPress={() => setPicked(key)} style={{ width: `${100 / 7}%`, height: 46, alignItems: 'center', justifyContent: 'center' }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: sel ? colors.primary : 'transparent',
                    borderWidth: isToday && !sel ? 1.5 : 0,
                    borderColor: colors.primary,
                  }}
                >
                  <T weight={sel || isToday ? '800' : '500'} color={sel ? colors.onPrimary : key > today ? colors.textMuted : colors.text}>
                    {fromKey(key).getDate()}
                  </T>
                </View>
                <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: dot ?? 'transparent', marginTop: 1 }} />
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, marginTop: spacing.sm }}>
          {[
            [colors.primary, 'On target'],
            [colors.warning, 'Over'],
            [colors.info, 'Under'],
          ].map(([c, l]) => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c }} />
              <T muted size={12}>{l}</T>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T size={18} weight="800">{prettyDate(picked)}</T>
          <T weight="700" color={colors.primary}>{Math.round(day.totals.calories)} / {goal} kcal</T>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap' }}>
          <T size={13} color={nutrientColors.protein} weight="700">P {Math.round(day.totals.protein)} g</T>
          <T size={13} color={nutrientColors.carbs} weight="700">C {Math.round(day.totals.carbs)} g</T>
          <T size={13} color={nutrientColors.fat} weight="700">F {Math.round(day.totals.fat)} g</T>
          <T size={13} color={nutrientColors.water} weight="700">{formatWater(day.waterMl, units)}</T>
          <T size={13} color={nutrientColors.steps} weight="700">{day.steps.toLocaleString()} steps</T>
        </View>
        {MEALS.map((m) => {
          const items = day.entries.filter((e) => e.meal === m.key);
          if (!items.length) return null;
          return (
            <View key={m.key} style={{ marginTop: spacing.md }}>
              <T weight="700" size={14}>{m.label}</T>
              {items.map((e) => (
                <View key={e.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                  <T muted size={14} numberOfLines={1} style={{ flex: 1 }}>{e.food.name}</T>
                  <T muted size={14}>{Math.round(itemNutrients(e).calories)}</T>
                </View>
              ))}
            </View>
          );
        })}
        {day.entries.length === 0 && <T muted style={{ marginTop: spacing.md }}>Nothing logged on this day.</T>}
        <Button
          title={picked > today ? 'Plan this day' : 'View and edit this day'}
          icon="create-outline"
          variant="secondary"
          style={{ marginTop: spacing.lg, borderRadius: radius.pill }}
          onPress={() => {
            setSelectedDate(picked);
            router.navigate('/');
          }}
        />
      </Card>
    </Screen>
  );
}
