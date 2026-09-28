import React, { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, IconButton, ListRow, ProgressBar, Screen, SectionTitle, T } from '@/components/ui';
import { Ring } from '@/components/Ring';
import { useStore } from '@/store/StoreProvider';
import { nutrientColors, radius, spacing, useTheme } from '@/theme';
import { addDays, currentStreak, prettyDate, todayKey } from '@/lib/dates';
import { daySummary, loggedDays } from '@/lib/selectors';
import { itemNutrients, servingText } from '@/lib/nutrition';
import { buildNudges, tipForDate } from '@/lib/tips';
import { formatWater, formatWeight, glassMl, waterValue, waterUnit } from '@/lib/units';
import { usePedometer } from '@/lib/usePedometer';
import { MEALS, type MealType } from '@/lib/types';

function MacroRing({ label, value, goal, color, unit = 'g' }: { label: string; value: number; goal: number; color: string; unit?: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Ring size={68} stroke={7} progress={goal ? value / goal : 0} color={color}>
        <T size={13} weight="800">{Math.round(value)}</T>
      </Ring>
      <T size={13} weight="700" style={{ marginTop: 6 }}>{label}</T>
      <T size={11} muted>
        / {Math.round(goal)} {unit}
      </T>
    </View>
  );
}

export default function Today() {
  const { state, dispatch, selectedDate: date, setSelectedDate } = useStore();
  const { colors } = useTheme();
  const goals = state.goals!;
  const units = state.settings.units;
  const isToday = date === todayKey();
  usePedometer(isToday);

  const day = useMemo(() => daySummary(state, date), [state, date]);
  const streak = useMemo(() => currentStreak(loggedDays(state)), [state.entries]);
  const nudges = useMemo(
    () =>
      buildNudges({
        totals: day.totals,
        goals,
        waterMl: day.waterMl,
        entries: day.entries,
        hour: isToday ? new Date().getHours() : date < todayKey() ? 24 : 0,
        streak: isToday ? streak : 0,
        steps: day.steps,
      }),
    [day, goals, isToday, date, streak],
  );
  const tip = tipForDate(date);
  const [tipOpen, setTipOpen] = useState(true);

  const budget = goals.calories + day.burned;
  const remaining = budget - day.totals.calories;
  const latestWeightDate = Object.keys(state.weights).sort().pop();

  const addWater = (ml: number) => {
    Haptics.selectionAsync().catch(() => {});
    dispatch({ type: 'setWater', date, ml: day.waterMl + ml });
  };

  const mealTotal = (m: MealType) => day.entries.filter((e) => e.meal === m).reduce((s, e) => s + itemNutrients(e).calories, 0);

  const mealMenu = (m: MealType, label: string) => {
    const items = day.entries.filter((e) => e.meal === m);
    Alert.alert(label, undefined, [
      { text: 'Add food', onPress: () => router.push({ pathname: '/add-food', params: { meal: m, date } }) },
      ...(items.length
        ? [
            { text: 'Save as meal', onPress: () => router.push({ pathname: '/meal-builder', params: { fromDate: date, fromMeal: m } }) },
            {
              text: 'Copy to today',
              onPress: () => {
                const now = Date.now();
                dispatch({
                  type: 'addEntries',
                  entries: items.map((e, i) => ({ ...e, id: `${now.toString(36)}-${i}`, date: todayKey(), createdAt: now + i })),
                });
              },
            },
          ]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <Screen topInset>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg }}>
        <IconButton label="Previous day" icon="chevron-back" onPress={() => setSelectedDate(addDays(date, -1))} />
        <Pressable onPress={() => setSelectedDate(todayKey())} style={{ alignItems: 'center' }}>
          <T size={22} weight="800">{prettyDate(date)}</T>
          {streak > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Ionicons name="flame" size={14} color={colors.warning} />
              <T size={13} muted weight="600">{streak}-day streak</T>
            </View>
          )}
        </Pressable>
        <IconButton label="Next day" icon="chevron-forward" onPress={() => setSelectedDate(addDays(date, 1))} />
      </View>

      {/* Calories + macros */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ alignItems: 'center', width: 76 }}>
            <T size={20} weight="800">{Math.round(day.totals.calories)}</T>
            <T size={12} muted>Eaten</T>
          </View>
          <Ring size={150} stroke={14} progress={budget ? day.totals.calories / budget : 0} color={remaining < 0 ? colors.warning : nutrientColors.calories}>
            <T size={32} weight="800">{Math.abs(Math.round(remaining)).toLocaleString()}</T>
            <T size={13} muted>{remaining < 0 ? 'kcal over' : 'kcal left'}</T>
          </Ring>
          <View style={{ alignItems: 'center', width: 76 }}>
            <T size={20} weight="800">{Math.round(day.burned)}</T>
            <T size={12} muted>Burned</T>
          </View>
        </View>
        <View style={{ flexDirection: 'row', marginTop: spacing.lg }}>
          <MacroRing label="Protein" value={day.totals.protein} goal={goals.protein} color={nutrientColors.protein} />
          <MacroRing label="Carbs" value={day.totals.carbs} goal={goals.carbs} color={nutrientColors.carbs} />
          <MacroRing label="Fat" value={day.totals.fat} goal={goals.fat} color={nutrientColors.fat} />
          <MacroRing
            label="Water"
            value={waterValue(day.waterMl, units)}
            goal={waterValue(goals.waterMl, units)}
            color={nutrientColors.water}
            unit={waterUnit(units)}
          />
        </View>
        <Pressable onPress={() => router.push({ pathname: '/nutrients', params: { date } })} style={{ marginTop: spacing.lg, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 }}>
          <T size={14} weight="700" color={colors.primary}>Fiber, sugar, sodium & vitamins</T>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      </Card>

      {/* Nudges */}
      {nudges.map((n) => {
        const bg = n.tone === 'warning' ? colors.warningSoft : n.tone === 'success' ? colors.primarySoft : colors.infoSoft;
        const fg = n.tone === 'warning' ? colors.warning : n.tone === 'success' ? colors.primary : colors.info;
        return (
          <View key={n.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: bg, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm }}>
            <Ionicons name={n.icon as never} size={20} color={fg} />
            <T size={14} style={{ flex: 1 }}>{n.text}</T>
          </View>
        );
      })}

      {/* Daily tip */}
      {tipOpen && (
        <Card style={{ backgroundColor: colors.primarySoft }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
            <Ionicons name={tip.kind === 'hydration' ? 'water' : tip.kind === 'activity' ? 'walk' : 'bulb'} size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <T size={12} weight="700" color={colors.primary}>TIP OF THE DAY</T>
              <T weight="700" style={{ marginTop: 2 }}>{tip.title}</T>
              <T size={14} muted style={{ marginTop: 4 }}>{tip.body}</T>
            </View>
            <IconButton label="Hide tip" icon="close" size={18} color={colors.textMuted} onPress={() => setTipOpen(false)} />
          </View>
        </Card>
      )}

      {/* Meals */}
      {MEALS.map((m) => {
        const items = day.entries.filter((e) => e.meal === m.key);
        return (
          <Card key={m.key}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name={m.icon as never} size={22} color={colors.primary} />
              <Pressable style={{ flex: 1 }} onPress={() => mealMenu(m.key, m.label)}>
                <T size={17} weight="700">{m.label}</T>
                <T size={13} muted>{Math.round(mealTotal(m.key))} kcal</T>
              </Pressable>
              <IconButton label={`Meal options for ${m.label}`} icon="ellipsis-horizontal" color={colors.textMuted} onPress={() => mealMenu(m.key, m.label)} />
              <IconButton filled label={`Add food to ${m.label}`} icon="add" onPress={() => router.push({ pathname: '/add-food', params: { meal: m.key, date } })} />
            </View>
            {items.map((e) => {
              const n = itemNutrients(e);
              return (
                <ListRow
                  key={e.id}
                  title={e.food.name}
                  subtitle={`${e.food.brand ? e.food.brand + ' · ' : ''}${servingText(e)}`}
                  onPress={() => router.push({ pathname: '/food', params: { entryId: e.id } })}
                  onLongPress={() =>
                    Alert.alert('Remove entry?', e.food.name, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => dispatch({ type: 'deleteEntry', id: e.id }) },
                    ])
                  }
                  right={<T weight="700">{Math.round(n.calories)}</T>}
                />
              );
            })}
          </Card>
        );
      })}

      {/* Water */}
      <SectionTitle>Water</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
          <View>
            <T size={22} weight="800" color={nutrientColors.water}>{formatWater(day.waterMl, units)}</T>
            <T size={13} muted>of {formatWater(goals.waterMl, units)}</T>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <IconButton filled label="Remove a glass" icon="remove" onPress={() => addWater(-glassMl(units))} />
            <IconButton filled label="Add a glass" icon="add" onPress={() => addWater(glassMl(units))} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {Array.from({ length: Math.max(8, Math.ceil(goals.waterMl / glassMl(units))) }).map((_, i) => {
            const filled = (i + 1) * glassMl(units) <= day.waterMl + 1;
            return (
              <Pressable key={i} onPress={() => dispatch({ type: 'setWater', date, ml: filled ? i * glassMl(units) : (i + 1) * glassMl(units) })} hitSlop={4}>
                <Ionicons name={filled ? 'water' : 'water-outline'} size={26} color={nutrientColors.water} />
              </Pressable>
            );
          })}
        </View>
        <T size={12} muted style={{ marginTop: 8 }}>Each drop is one {units === 'us' ? '8 fl oz' : '250 ml'} glass.</T>
      </Card>

      {/* Activity */}
      <SectionTitle right={<IconButton filled label="Log exercise" icon="add" onPress={() => router.push({ pathname: '/log-exercise', params: { date } })} />}>
        Activity
      </SectionTitle>
      <Card>
        <Pressable onPress={() => router.push({ pathname: '/log-exercise', params: { date } })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Ionicons name="footsteps" size={20} color={nutrientColors.steps} />
            <T weight="700" style={{ flex: 1 }}>{day.steps.toLocaleString()} steps</T>
            <T size={13} muted>Goal {goals.steps.toLocaleString()}</T>
          </View>
          <ProgressBar value={day.steps} max={goals.steps} color={nutrientColors.steps} />
        </Pressable>
        {day.exercises.map((x) => (
          <ListRow
            key={x.id}
            icon="barbell-outline"
            title={x.name}
            subtitle={`${x.minutes} min`}
            right={<T weight="700">{x.calories} kcal</T>}
            onLongPress={() =>
              Alert.alert('Remove exercise?', x.name, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => dispatch({ type: 'deleteExercise', id: x.id }) },
              ])
            }
          />
        ))}
        {day.exercises.length === 0 && <T size={13} muted style={{ marginTop: spacing.md }}>No workouts logged. Tap + to add one.</T>}
      </Card>

      {/* Weight */}
      <SectionTitle right={<IconButton filled label="Log weight" icon="add" onPress={() => router.push({ pathname: '/log-weight', params: { date } })} />}>
        Weight
      </SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Ionicons name="scale-outline" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <T size={20} weight="800">
              {state.weights[date] !== undefined ? formatWeight(state.weights[date], units) : latestWeightDate ? formatWeight(state.weights[latestWeightDate], units) : '—'}
            </T>
            <T size={13} muted>
              {state.weights[date] !== undefined ? `Logged ${prettyDate(date).toLowerCase()}` : latestWeightDate ? `Last weigh-in ${prettyDate(latestWeightDate).toLowerCase()}` : 'No weigh-ins yet'}
            </T>
          </View>
        </View>
      </Card>
    </Screen>
  );
}
