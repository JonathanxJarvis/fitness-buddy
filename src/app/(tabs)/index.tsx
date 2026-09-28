import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ActionSheet, Badge, Card, CountUp, IconButton, IconTile, ProgressBar, Screen, SectionTitle, T, type IconName, type SheetAction } from '@/components/ui';
import { FadeIn, PressScale } from '@/components/motion';
import { Ring } from '@/components/Ring';
import { FoodThumb, clockTime } from '@/components/FoodThumb';
import { useStore } from '@/store/StoreProvider';
import { nutrientColors, radius, spacing, useTheme } from '@/theme';
import { addDays, currentStreak, fromKey, prettyDate, todayKey, WEEKDAY_LETTERS } from '@/lib/dates';
import { daySummary, loggedDays, totalsByDate } from '@/lib/selectors';
import { itemNutrients, MEAL_SHARES } from '@/lib/nutrition';
import { buildNudges, tipForDate } from '@/lib/tips';
import { formatWater, formatWeight, glassMl } from '@/lib/units';
import { usePedometer } from '@/lib/usePedometer';
import { MEALS, type DiaryEntry, type MealType } from '@/lib/types';

function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

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
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg }}>
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
              width: 44,
              paddingVertical: 8,
              borderRadius: 22,
              backgroundColor: selected ? colors.ink : 'transparent',
              opacity: future ? 0.45 : 1,
            }}
          >
            <T size={11} weight="700" color={selected ? colors.onInk : colors.textMuted}>
              {WEEKDAY_LETTERS[i]}
            </T>
            <View style={{ marginTop: 6 }}>
              <Ring
                size={30}
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

function HeroCard({ eaten, burned, goal }: { eaten: number; burned: number; goal: number }) {
  const { colors } = useTheme();
  const budget = goal + burned;
  const remaining = budget - eaten;
  const over = remaining < 0;
  const pct = budget ? eaten / budget : 0;
  const stat = (icon: IconName, label: string, value: number) => (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={15} color="#fff" />
      </View>
      <View>
        <CountUp value={value} size={15} weight="800" color="#fff" />
        <T size={11} color="rgba(255,255,255,0.7)">{label}</T>
      </View>
    </View>
  );
  return (
    <LinearGradient colors={colors.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 28, padding: spacing.xl, marginBottom: spacing.md, overflow: 'hidden' }}>
      {/* soft decorative glows */}
      <View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255,255,255,0.06)', top: -90, right: -60 }} />
      <View style={{ position: 'absolute', width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.04)', bottom: -60, left: -30 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <T size={13} weight="600" color="rgba(255,255,255,0.75)">
            {over ? 'Over today’s budget' : 'Calories left'}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginTop: 2 }}>
            <CountUp value={Math.abs(Math.round(remaining))} size={46} weight="800" color="#fff" />
            <T size={15} weight="600" color="rgba(255,255,255,0.75)" style={{ marginBottom: 9 }}>
              kcal
            </T>
          </View>
          <T size={12} color="rgba(255,255,255,0.65)">Goal {goal.toLocaleString()} + exercise {Math.round(burned).toLocaleString()}</T>
        </View>
        <Ring size={104} stroke={10} progress={pct} color="#fff" gradient={over ? ['#FFD29A', '#F2A93B'] : ['#B9F6D2', '#FFFFFF']} trackColor="rgba(255,255,255,0.16)">
          <CountUp value={Math.round(Math.min(999, pct * 100))} size={22} weight="800" color="#fff" />
          <T size={10} weight="700" color="rgba(255,255,255,0.7)">% EATEN</T>
        </Ring>
      </View>
      <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: spacing.lg }} />
      <View style={{ flexDirection: 'row' }}>
        {stat('flag', 'Goal', goal)}
        {stat('restaurant', 'Eaten', eaten)}
        {stat('flame', 'Burned', burned)}
      </View>
    </LinearGradient>
  );
}

function MacroRow({ icon, label, value, goal, color, hint, delay }: { icon: IconName; label: string; value: number; goal: number; color: string; hint?: string; delay: number }) {
  const left = Math.round(goal - value);
  return (
    <FadeIn delay={delay} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 }}>
      <IconTile icon={icon} color={color} size={38} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 7 }}>
          <T weight="700" style={{ flex: 1 }}>
            {label}
            {hint ? <T size={12} muted weight="500">{`  ${hint}`}</T> : null}
          </T>
          <T size={14} weight="800">{Math.round(value)}</T>
          <T size={13} muted>{` / ${Math.round(goal)} g`}</T>
        </View>
        <ProgressBar value={value} max={goal} color={color} height={7} />
        <T size={11} muted style={{ marginTop: 4 }}>
          {left > 0 ? `${left} g to go` : left === 0 ? 'Right on target' : `${-left} g over`}
        </T>
      </View>
    </FadeIn>
  );
}

function EntryRow({ e, onPress }: { e: DiaryEntry; onPress: () => void }) {
  const { colors } = useTheme();
  const n = itemNutrients(e);
  return (
    <PressScale onPress={onPress} scaleTo={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 }}>
      <FoodThumb food={e.food} photo={e.photo} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T weight="700" numberOfLines={1} style={{ flexShrink: 1 }}>
            {e.food.name}
          </T>
          {e.food.source === 'ai' && <Badge label="AI" color={colors.primary} icon="sparkles" />}
        </View>
        <T size={12} muted numberOfLines={1} style={{ marginTop: 2 }}>
          {clockTime(e.createdAt)} · {Math.round(n.protein)} g protein
        </T>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <T weight="800">{Math.round(n.calories)}</T>
        <T size={11} muted>kcal</T>
      </View>
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
  const [menuMeal, setMenuMeal] = useState<MealType>('breakfast');
  const [menuOpen, setMenuOpen] = useState(false);
  const setMenu = (m: MealType) => {
    setMenuMeal(m);
    setMenuOpen(true);
  };

  const latestWeightDate = Object.keys(state.weights).sort().pop();
  const glass = glassMl(units);
  const glasses = Math.round(day.waterMl / glass);

  const setWater = (ml: number) => {
    Haptics.selectionAsync().catch(() => {});
    dispatch({ type: 'setWater', date, ml: Math.max(0, ml) });
  };

  const mealActions = (m: MealType): SheetAction[] => {
    const items = day.entries.filter((e) => e.meal === m);
    const actions: SheetAction[] = [
      { label: 'Snap a photo', subtitle: 'AI estimates the whole plate', icon: 'camera', onPress: () => router.push({ pathname: '/snap-meal', params: { meal: m, date } }) },
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
      <FadeIn delay={0} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.lg }}>
        <PressScale accessibilityLabel="Profile" onPress={() => router.push('/profile')}>
          <LinearGradient colors={colors.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' }}>
            <T size={18} weight="800" color="#fff">{(profile.name || 'Me').charAt(0).toUpperCase()}</T>
          </LinearGradient>
        </PressScale>
        <View style={{ flex: 1 }}>
          <T size={13} muted weight="600">{greeting()}</T>
          <T size={20} weight="800" numberOfLines={1}>{profile.name || prettyDate(date)}</T>
        </View>
        {streak > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.warningSoft, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill }}>
            <Ionicons name="flame" size={15} color={colors.warning} />
            <T size={13} weight="800" color={colors.warning}>{streak}</T>
          </View>
        )}
        <IconButton label="Reminders" icon="notifications-outline" color={colors.text} onPress={() => router.push('/reminders')} />
      </FadeIn>

      {/* Date + week */}
      <FadeIn delay={next()}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
          <Pressable onPress={() => setSelectedDate(todayKey())} style={{ flex: 1 }}>
            <T size={28} weight="800">{prettyDate(date)}</T>
          </Pressable>
          <IconButton label="Previous week" icon="chevron-back" color={colors.textMuted} onPress={() => setSelectedDate(addDays(date, -7))} />
          <View style={{ width: 14 }} />
          <IconButton label="Next week" icon="chevron-forward" color={colors.textMuted} onPress={() => setSelectedDate(addDays(date, 7))} />
        </View>
        <WeekStrip date={date} onSelect={setSelectedDate} />
      </FadeIn>

      <FadeIn delay={next()}>
        <HeroCard eaten={day.totals.calories} burned={day.burned} goal={goals.calories} />
      </FadeIn>

      {/* Macros */}
      <FadeIn delay={next()}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
            <T size={17} weight="800" style={{ flex: 1 }}>Macros today</T>
            <Pressable onPress={() => router.push({ pathname: '/nutrients', params: { date } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <T size={13} weight="700" color={colors.primary}>All nutrients</T>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </Pressable>
          </View>
          <MacroRow icon="barbell" label="Protein" hint="1 g/lb" value={day.totals.protein} goal={goals.protein} color={nutrientColors.protein} delay={200} />
          <MacroRow icon="flash" label="Carbs" value={day.totals.carbs} goal={goals.carbs} color={nutrientColors.carbs} delay={260} />
          <MacroRow icon="water" label="Fat" value={day.totals.fat} goal={goals.fat} color={nutrientColors.fat} delay={320} />
          <MacroRow icon="leaf" label="Fiber" value={day.totals.fiber ?? 0} goal={goals.fiber} color={nutrientColors.fiber} delay={380} />
        </Card>
      </FadeIn>

      {/* AI */}
      <FadeIn delay={next()}>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row' }}>
            <PressScale scaleTo={0.97} onPress={() => router.push({ pathname: '/snap-meal', params: { date } })} style={{ flex: 1, padding: spacing.lg, gap: 10 }}>
              <IconTile icon="camera" color={colors.primary} size={42} />
              <View>
                <T weight="800">Snap a meal</T>
                <T size={12} muted style={{ marginTop: 2 }}>AI estimates calories & macros from a photo</T>
              </View>
            </PressScale>
            <View style={{ width: 1, backgroundColor: colors.border, marginVertical: spacing.lg }} />
            <PressScale scaleTo={0.97} onPress={() => router.navigate('/coach')} style={{ flex: 1, padding: spacing.lg, gap: 10 }}>
              <IconTile icon="chatbubbles" color={nutrientColors.protein} size={42} />
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

      {/* Meals */}
      <SectionTitle>Nutrition</SectionTitle>
      {MEALS.map((m) => {
        const items = day.entries.filter((e) => e.meal === m.key);
        const kcal = items.reduce((s, e) => s + itemNutrients(e).calories, 0);
        const target = Math.round(goals.calories * MEAL_SHARES[m.key]);
        return (
          <FadeIn key={m.key} delay={next()}>
            <Card style={{ paddingVertical: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Ring size={44} stroke={4} progress={target ? kcal / target : 0} color={kcal > target * 1.15 ? colors.warning : nutrientColors.calories}>
                  <Ionicons name={m.icon as never} size={17} color={colors.text} />
                </Ring>
                <Pressable style={{ flex: 1 }} onPress={() => setMenu(m.key)} accessibilityLabel={`${m.label} options`}>
                  <T size={16} weight="800">{m.label}</T>
                  <T size={13} muted>
                    {Math.round(kcal)} / {target} kcal
                  </T>
                </Pressable>
                <PressScale
                  accessibilityLabel={`Add food to ${m.label}`}
                  onPress={() => setMenu(m.key)}
                  style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="add" size={22} color={colors.onInk} />
                </PressScale>
              </View>
              {items.length > 0 && <View style={{ height: 1, backgroundColor: colors.border, marginTop: spacing.md, marginBottom: 2 }} />}
              {items.map((e) => (
                <EntryRow key={e.id} e={e} onPress={() => router.push({ pathname: '/food', params: { entryId: e.id } })} />
              ))}
            </Card>
          </FadeIn>
        );
      })}

      {/* Water, activity, weight */}
      <SectionTitle>Body & activity</SectionTitle>
      <FadeIn delay={next()}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <IconTile icon="water" color={nutrientColors.water} size={42} />
            <View style={{ flex: 1 }}>
              <T size={16} weight="800">{formatWater(day.waterMl, units)}</T>
              <T size={12} muted>
                {glasses} {glasses === 1 ? 'glass' : 'glasses'} of water
              </T>
            </View>
            <IconButton filled label="Remove a glass" icon="remove" onPress={() => setWater(day.waterMl - glass)} />
            <IconButton filled label="Add a glass" icon="add" onPress={() => setWater(day.waterMl + glass)} />
          </View>
        </Card>
      </FadeIn>

      <FadeIn delay={next()} style={{ flexDirection: 'row', gap: spacing.md }}>
        <PressScale style={{ flex: 1 }} onPress={() => router.push({ pathname: '/log-exercise', params: { date } })}>
          <Card style={{ alignItems: 'center' }}>
            <Ring size={84} stroke={8} progress={goals.steps ? day.steps / goals.steps : 0} color={nutrientColors.steps}>
              <Ionicons name="footsteps" size={22} color={nutrientColors.steps} />
            </Ring>
            <CountUp value={day.steps} size={17} weight="800" style={{ marginTop: 10 }} />
            <T size={12} muted>of {goals.steps.toLocaleString()} steps</T>
            <T size={12} weight="700" color={colors.primary} style={{ marginTop: 6 }}>
              {day.exercises.length ? `${day.exercises.length} workout${day.exercises.length > 1 ? 's' : ''} · ${Math.round(day.burned)} kcal` : '+ Log workout'}
            </T>
          </Card>
        </PressScale>
        <PressScale style={{ flex: 1 }} onPress={() => router.push({ pathname: '/log-weight', params: { date } })}>
          <Card style={{ alignItems: 'center' }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: nutrientColors.carbs + '1F', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="scale" size={28} color={nutrientColors.carbs} />
            </View>
            <T size={17} weight="800" style={{ marginTop: 10 }}>
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
