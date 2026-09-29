import React, { useEffect, useMemo, useState } from 'react';
import { ProMark } from '@/components/ProMark';
import { Animated, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ActionSheet, Card, CountUp, IconButton, IconTile, Screen, SectionTitle, T, type SheetAction } from '@/components/ui';
import { FadeIn, PressScale, usePulse } from '@/components/motion';
import { Ring } from '@/components/Ring';
import { NutritionPanel } from '@/components/today/NutritionPanel';
import { MealCard } from '@/components/today/MealCard';
import { MEAL_ACCENT } from '@/components/today/MealIcons';
import { greetingFor, nextMealHint, waterGoalMl, type MealHint } from '@/components/today/dayContext';
import { useStore } from '@/store/StoreProvider';
import { nutrientColors, radius, spacing, useTheme } from '@/theme';
import { addDays, fromKey, prettyDate, todayKey, WEEKDAY_LETTERS } from '@/lib/dates';
import { activeDays, streakInfo } from '@/lib/quests';
import { PetCard } from '@/components/PetCard';
import { MyAvatar } from '@/components/Avatar';
import { DailyQuests } from '@/components/Quests';
import { CelebrationDemoCard } from '@/components/Celebrate';
import { PREVIEW } from '@/lib/pro';
import { daySummary, totalsByDate } from '@/lib/selectors';
import { MEAL_SHARES } from '@/lib/nutrition';
import { buildNudges, tipForDate } from '@/lib/tips';
import { formatWeight, glassMl } from '@/lib/units';
import { usePedometer } from '@/lib/usePedometer';
import { MEALS, type MealType } from '@/lib/types';

/** Sunday-start week containing `date`. */
function weekOf(date: string): string[] {
  const start = addDays(date, -fromKey(date).getDay());
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function WeekStrip({ date, onSelect }: { date: string; onSelect: (d: string) => void }) {
  const { state } = useStore();
  const { colors } = useTheme();
  const days = weekOf(date);
  const totals = useMemo(() => totalsByDate(state, days), [state, days.join()]);
  const today = todayKey();
  const goal = state.goals!.calories;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md }}>
      {days.map((d, i) => {
        const selected = d === date;
        const future = d > today;
        const kcal = totals[d]?.calories ?? 0;
        return (
          <Pressable
            key={d}
            accessibilityLabel={prettyDate(d)}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onSelect(d);
            }}
            style={{
              alignItems: 'center',
              width: 42,
              paddingVertical: 6,
              borderRadius: 22,
              backgroundColor: selected ? colors.ink : 'transparent',
              opacity: future ? 0.45 : 1,
            }}
          >
            <T size={11} weight="700" color={selected ? colors.onInk : colors.textMuted}>
              {WEEKDAY_LETTERS[i]}
            </T>
            <View style={{ marginTop: 4 }}>
              <Ring
                size={28}
                stroke={3}
                progress={goal ? kcal / goal : 0}
                color={kcal > goal * 1.05 ? colors.warning : nutrientColors.calories}
                trackColor={selected ? 'rgba(127,127,127,0.35)' : colors.track}
                delay={i * 40}
              >
                <T size={12} weight="800" color={selected ? colors.onInk : d === today ? colors.primary : colors.text}>
                  {fromKey(d).getDate()}
                </T>
              </Ring>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A live line under the header: what to eat next, with a softly pulsing dot. */
function HintLine({ hint, onPress }: { hint: MealHint; onPress: () => void }) {
  const { colors } = useTheme();
  const pulse = usePulse(1800);
  const accent = MEAL_ACCENT[hint.meal];
  return (
    <PressScale onPress={onPress} scaleTo={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md, paddingHorizontal: 2 }}>
      <View style={{ width: 10, height: 10, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: accent, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }] }} />
        <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: accent }} />
      </View>
      <T size={13} weight="600" style={{ flex: 1 }} color={colors.text}>{hint.text}</T>
      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
    </PressScale>
  );
}

export default function Today() {
  const { state, dispatch, selectedDate: date, setSelectedDate } = useStore();
  const { colors } = useTheme();
  const goals = state.goals!;
  const profile = state.profile!;
  const units = state.settings.units;
  const isToday = date === todayKey();
  usePedometer(isToday);

  const day = useMemo(() => daySummary(state, date), [state, date]);
  const streakData = useMemo(() => streakInfo(activeDays(state), todayKey()), [state.entries, state.workouts, state.exercises, state.water, state.weights]);
  const streak = streakData.streak;
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
  const [menuMeal, setMenuMeal] = useState<MealType>('breakfast');
  const [menuOpen, setMenuOpen] = useState(false);
  const setMenu = (m: MealType) => {
    setMenuMeal(m);
    setMenuOpen(true);
  };

  const latestWeightDate = Object.keys(state.weights).sort().pop();
  const glass = glassMl(units);
  const waterGoal = waterGoalMl(profile.weightKg);

  // Re-render each minute so the greeting and next-meal hint follow the clock.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const hour = now.getHours();
  const hint = useMemo(
    () =>
      isToday
        ? nextMealHint({ hour, logged: new Set(day.entries.map((e) => e.meal)), remaining: goals.calories + day.burned - day.totals.calories, goal: goals.calories })
        : null,
    [isToday, hour, day, goals.calories],
  );

  const setWater = (ml: number) => {
    Haptics.selectionAsync().catch(() => {});
    dispatch({ type: 'setWater', date, ml: Math.max(0, ml) });
  };

  const mealActions = (m: MealType): SheetAction[] => {
    const items = day.entries.filter((e) => e.meal === m);
    const actions: SheetAction[] = [
      { label: 'Snap a photo', subtitle: 'AI estimates the whole plate', icon: 'camera', pro: true, onPress: () => router.push({ pathname: '/snap-meal', params: { meal: m, date } }) },
      { label: 'Search foods', icon: 'search', color: nutrientColors.protein, onPress: () => router.push({ pathname: '/add-food', params: { meal: m, date } }) },
      { label: 'Scan a barcode', icon: 'barcode-outline', color: nutrientColors.fat, onPress: () => router.push({ pathname: '/scan', params: { meal: m, date } }) },
    ];
    if (items.length) {
      actions.push({ label: 'Save as meal', subtitle: 'Re-log it in one tap later', icon: 'bookmark-outline', color: nutrientColors.carbs, onPress: () => router.push({ pathname: '/meal-builder', params: { fromDate: date, fromMeal: m } }) });
      if (!isToday) {
        actions.push({
          label: 'Copy to today',
          icon: 'copy-outline',
          color: nutrientColors.fiber,
          onPress: () => {
            const now = Date.now();
            dispatch({ type: 'addEntries', entries: items.map((e, i) => ({ ...e, id: `${now.toString(36)}-${i}`, date: todayKey(), createdAt: now + i })) });
          },
        });
      }
    }
    return actions;
  };

  let d = 0;
  const next = () => (d += 60);

  return (
    <Screen topInset tabs>
      {/* Greeting */}
      <FadeIn delay={0} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.md }}>
        <PressScale accessibilityLabel="Profile picture" onPress={() => router.push('/avatar')} onLongPress={() => router.push('/profile')} scaleTo={0.92}>
          <MyAvatar size={50} frame="compact" petBadge={false} />
        </PressScale>
        <View style={{ flex: 1 }}>
          <T size={13} muted weight="600">{greetingFor(hour)}</T>
          <T size={18} weight="800" numberOfLines={1}>{profile.name || prettyDate(date)}</T>
        </View>
        {streak > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.warningSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill }}>
            <Ionicons name="flame" size={15} color={colors.warning} />
            <T size={13} weight="800" color={colors.warning}>{streak}</T>
            {streakData.freezes > 0 && (
              <>
                <Ionicons name="snow" size={13} color="#3B9EF0" style={{ marginLeft: 2 }} />
                <T size={12} weight="800" color="#3B9EF0">{streakData.freezes}</T>
              </>
            )}
          </View>
        )}
        <IconButton label="Progress" icon="stats-chart-outline" color={colors.text} onPress={() => router.push('/progress')} />
        <IconButton label="Reminders" icon="notifications-outline" color={colors.text} onPress={() => router.push('/reminders')} />
      </FadeIn>

      {/* Date + week */}
      <FadeIn delay={next()}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
          <Pressable onPress={() => setSelectedDate(todayKey())} style={{ flex: 1 }}>
            <T size={22} weight="800">{prettyDate(date)}</T>
          </Pressable>
          <IconButton label="Open diary calendar" icon="calendar-clear-outline" color={colors.textMuted} onPress={() => router.navigate('/calendar')} />
          <View style={{ width: 14 }} />
          <IconButton label="Previous week" icon="chevron-back" color={colors.textMuted} onPress={() => setSelectedDate(addDays(date, -7))} />
          <View style={{ width: 14 }} />
          <IconButton label="Next week" icon="chevron-forward" color={colors.textMuted} onPress={() => setSelectedDate(addDays(date, 7))} />
        </View>
        <WeekStrip date={date} onSelect={setSelectedDate} />
      </FadeIn>

      {hint && (
        <FadeIn delay={next()}>
          <HintLine hint={hint} onPress={() => setMenu(hint.meal)} />
        </FadeIn>
      )}

      <FadeIn delay={next()}>
        <NutritionPanel
          date={date}
          totals={day.totals}
          entries={day.entries}
          goals={goals}
          burned={day.burned}
          waterMl={day.waterMl}
          waterGoal={waterGoal}
          glass={glass}
          units={units}
          onSetWater={setWater}
        />
      </FadeIn>

      {isToday && (
        <FadeIn delay={next()}>
          {PREVIEW && <CelebrationDemoCard />}
          <PetCard date={date} />
          <DailyQuests date={date} />
        </FadeIn>
      )}

      {/* Meals */}
      <SectionTitle right={<T size={13} muted weight="600">{`${Math.round(day.totals.calories).toLocaleString('en-US')} kcal logged`}</T>}>Meals</SectionTitle>
      {MEALS.map((m) => (
        <MealCard
          key={m.key}
          meal={m.key}
          label={m.label}
          items={day.entries.filter((e) => e.meal === m.key)}
          target={Math.round(goals.calories * MEAL_SHARES[m.key])}
          current={hint?.meal === m.key && !day.entries.some((e) => e.meal === m.key)}
          onAdd={() => setMenu(m.key)}
          delay={next()}
        />
      ))}

      {/* AI */}
      <FadeIn delay={next()}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row' }}>
            <PressScale scaleTo={0.97} onPress={() => router.push({ pathname: '/snap-meal', params: { date } })} style={{ flex: 1, padding: spacing.md - 4, gap: 8, margin: 4, borderRadius: 20 }}>
              <IconTile icon="camera" color={colors.primary} size={36} />
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <T weight="800">Snap a meal</T>
                  <ProMark />
                </View>
                <T size={12} muted style={{ marginTop: 2 }}>AI estimates calories & macros from a photo</T>
              </View>
            </PressScale>
            <View style={{ width: 1, backgroundColor: colors.border, marginVertical: spacing.lg }} />
            <PressScale scaleTo={0.97} onPress={() => router.navigate('/coach')} style={{ flex: 1, padding: spacing.md, gap: 8 }}>
              <IconTile icon="chatbubbles" color={nutrientColors.protein} size={36} />
              <View>
                <T weight="800">Ask Coach</T>
                <T size={12} muted style={{ marginTop: 2 }}>What should I eat to hit my protein?</T>
              </View>
            </PressScale>
          </View>
        </Card>
      </FadeIn>

      {/* Nudges */}
      {nudges.slice(0, 3).map((n, i) => {
        const fg = n.tone === 'warning' ? colors.warning : n.tone === 'success' ? colors.primary : colors.info;
        return (
          <FadeIn key={n.id} delay={next() + i * 40}>
            <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, borderLeftWidth: 3, borderLeftColor: fg }}>
              <Ionicons name={n.icon as never} size={18} color={fg} />
              <T size={13} style={{ flex: 1 }}>{n.text}</T>
            </View>
          </FadeIn>
        );
      })}

      {/* Water, activity, weight */}
      <SectionTitle>Activity & body</SectionTitle>
      <FadeIn delay={next()} style={{ flexDirection: 'row', gap: spacing.md }}>
        <PressScale style={{ flex: 1 }} onPress={() => router.push({ pathname: '/log-exercise', params: { date } })}>
          <Card style={{ alignItems: 'center' }}>
            <Ring size={70} stroke={7} progress={goals.steps ? day.steps / goals.steps : 0} color={nutrientColors.steps}>
              <Ionicons name="footsteps" size={22} color={nutrientColors.steps} />
            </Ring>
            <CountUp value={day.steps} size={16} weight="800" style={{ marginTop: 8 }} />
            <T size={12} muted>of {goals.steps.toLocaleString()} steps</T>
            <T size={12} weight="700" color={colors.primary} style={{ marginTop: 6 }}>
              {day.exercises.length ? `${day.exercises.length} workout${day.exercises.length > 1 ? 's' : ''} · ${Math.round(day.burned)} kcal` : '+ Log workout'}
            </T>
          </Card>
        </PressScale>
        <PressScale style={{ flex: 1 }} onPress={() => router.push({ pathname: '/log-weight', params: { date } })}>
          <Card style={{ alignItems: 'center' }}>
            <View style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: nutrientColors.carbs + '1F', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="scale" size={28} color={nutrientColors.carbs} />
            </View>
            <T size={16} weight="800" style={{ marginTop: 8 }}>
              {state.weights[date] !== undefined ? formatWeight(state.weights[date], units) : latestWeightDate ? formatWeight(state.weights[latestWeightDate], units) : '—'}
            </T>
            <T size={12} muted numberOfLines={1}>
              {state.weights[date] !== undefined ? 'Logged this day' : latestWeightDate ? `Last: ${prettyDate(latestWeightDate).toLowerCase()}` : 'No weigh-ins yet'}
            </T>
            <T size={12} weight="700" color={colors.primary} style={{ marginTop: 6 }}>+ Log weight</T>
          </Card>
        </PressScale>
      </FadeIn>

      {/* Tip */}
      {tipOpen && (
        <FadeIn delay={next()}>
          <Card style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
            <IconTile icon={tip.kind === 'hydration' ? 'water' : tip.kind === 'activity' ? 'walk' : 'bulb'} color={colors.primary} size={38} />
            <View style={{ flex: 1 }}>
              <T size={11} weight="800" color={colors.primary} style={{ letterSpacing: 0.8 }}>TIP OF THE DAY</T>
              <T weight="700" style={{ marginTop: 2 }}>{tip.title}</T>
              <T size={13} muted style={{ marginTop: 4 }}>{tip.body}</T>
            </View>
            <IconButton label="Hide tip" icon="close" size={18} color={colors.textMuted} onPress={() => setTipOpen(false)} />
          </Card>
        </FadeIn>
      )}

      <ActionSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        title={`Add to ${MEALS.find((x) => x.key === menuMeal)!.label.toLowerCase()}`}
        actions={mealActions(menuMeal)}
      />
    </Screen>
  );
}
