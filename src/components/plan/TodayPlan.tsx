import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card, T } from '../ui';
import { FadeIn, nativeDriver, PressScale } from '../motion';
import { BarbellGlyph, MiniMoon, MoonGlyph } from './Glyphs';
import { useStore } from '@/store/StoreProvider';
import { useStartWorkout } from '@/lib/useStartWorkout';
import { addDays, todayKey } from '@/lib/dates';
import { DAY_NAMES, planDay, planName, swapDays, trainedOn, weekdayIndex, weekOf, withDay, type Session } from '@/lib/plan';
import { findExercise, doneSets, durationMinutes } from '@/lib/training';
import { radius, spacing, useTheme } from '@/theme';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** One day in the week strip: a capsule filled when trained, tinted when planned, a moon for rest. */
function DayCapsule({ date, index, today, onPress }: { date: string; index: number; today: string; onPress: () => void }) {
  const { state } = useStore();
  const { colors } = useTheme();
  const day = planDay(state, date);
  const trained = trainedOn(state, date);
  const past = date < today;
  const isToday = date === today;
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, delay: 60 + index * 45, useNativeDriver: nativeDriver, damping: 13, stiffness: 180 }).start();
  }, [v, index]);

  const color = day.kind === 'train' ? day.session.color : colors.primary;
  let bg = 'transparent';
  let border = colors.border;
  let content: React.ReactNode;
  if (trained) {
    bg = color;
    border = color;
    content = <Ionicons name="checkmark" size={16} color="#fff" />;
  } else if (day.kind === 'train') {
    bg = color + (past ? '14' : '26');
    border = past ? color + '33' : color + '66';
    content = (
      <T size={9} weight="800" color={color} style={{ opacity: past ? 0.55 : 1, letterSpacing: 0.3 }}>
        {day.session.short}
      </T>
    );
  } else {
    content = <MiniMoon color={colors.textMuted} />;
  }

  return (
    <PressScale onPress={onPress} accessibilityLabel={`${DAY_NAMES[index]}: ${day.kind === 'train' ? day.session.name : 'Rest'}${trained ? ', trained' : ''}`} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
      <T size={11} weight={isToday ? '800' : '700'} color={isToday ? colors.text : colors.textMuted}>{LETTERS[index]}</T>
      <Animated.View
        style={{
          width: 38,
          height: 50,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: bg,
          borderWidth: 1.5,
          borderStyle: day.kind === 'train' || trained ? 'solid' : 'dashed',
          borderColor: border,
          opacity: v,
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
        }}
      >
        {content}
      </Animated.View>
      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isToday ? colors.text : 'transparent' }} />
    </PressScale>
  );
}

function SessionPreview({ session }: { session: Session }) {
  const { state } = useStore();
  const names = session.routine.exercises.map((x) => findExercise(x.exerciseId, state.customExercises)?.name).filter(Boolean) as string[];
  const sets = session.routine.exercises.reduce((n, x) => n + x.sets, 0);
  return (
    <>
      <T size={12} weight="800" color={session.color} style={{ marginTop: 2 }}>
        {session.routine.exercises.length} exercises · {sets} sets · ~{Math.round(sets * 2.8 + 5)} min
      </T>
      <T size={13} muted numberOfLines={2} style={{ marginTop: 6, lineHeight: 19 }}>
        {names.join('  ·  ')}
      </T>
    </>
  );
}

/** "Today: Push day" with a start button, and this week's plan as a strip you can tap to change. */
export function TodayPlan() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const start = useStartWorkout();
  const today = todayKey();
  const tomorrow = addDays(today, 1);
  const plan = state.plan;
  const day = planDay(state, today);
  const trainedToday = trainedOn(state, today);
  const week = weekOf(today);

  const stats = useMemo(() => {
    const ws = state.workouts.filter((w) => w.date >= week[0] && w.date <= week[6] && doneSets(w) > 0);
    const planned = week.filter((d) => planDay(state, d).kind === 'train').length;
    const done = new Set(ws.map((w) => w.date)).size;
    return { planned, done, minutes: ws.reduce((n, w) => n + durationMinutes(w), 0) };
  }, [state, week]);

  const openPlan = (day?: number) => router.push({ pathname: '/plan', params: day === undefined ? {} : { day: String(day) } });
  const tap = () => Haptics.selectionAsync().catch(() => {});

  if (!plan) {
    return (
      <FadeIn delay={40}>
        <Card style={{ padding: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <T size={11} weight="800" muted style={{ letterSpacing: 1.2 }}>TRAINING PLAN</T>
            <T size={22} weight="800" style={{ marginTop: 2 }}>Plan your week</T>
            <T size={13} muted style={{ marginTop: 4, marginBottom: spacing.md, lineHeight: 19 }}>
              Pick a split and your rest days. Each day then shows what to train.
            </T>
            <PressScale
              onPress={() => {
                tap();
                openPlan();
              }}
              accessibilityRole="button"
              style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 11, paddingHorizontal: 18 }}
            >
              <T weight="800" color={colors.onPrimary}>Choose your plan</T>
              <Ionicons name="arrow-forward" size={16} color={colors.onPrimary} />
            </PressScale>
          </View>
          <BarbellGlyph color={colors.primary} track={colors.textMuted} size={78} />
        </Card>
      </FadeIn>
    );
  }

  const tomorrowDay = planDay(state, tomorrow);
  const moveLabel = tomorrowDay.kind === 'train' ? `Swap with ${tomorrowDay.session.name}` : 'Move to tomorrow';

  return (
    <FadeIn delay={40}>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {/* Accent rail in today's color */}
        <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: day.kind === 'train' ? day.session.color : colors.primary, opacity: 0.9 }} />
        <View style={{ padding: spacing.lg, paddingLeft: spacing.lg + 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <T size={11} weight="800" muted style={{ letterSpacing: 1.2 }}>TODAY · {DAY_NAMES[weekdayIndex(today)].toUpperCase()}</T>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                <T size={38} weight="800" style={{ letterSpacing: -1.2 }}>{day.kind === 'train' ? day.session.name : 'Rest'}</T>
                <T size={18} weight="600" muted>{trainedToday ? 'done' : 'day'}</T>
              </View>
              {day.kind === 'train' ? (
                <SessionPreview session={day.session} />
              ) : (
                <T size={13} muted style={{ marginTop: 4, lineHeight: 19 }}>
                  {trainedToday ? 'You trained anyway. Take it easy tomorrow.' : 'Keep it light: a 10 min walk or a stretch. Eat well, sleep 7+ hours.'}
                </T>
              )}
            </View>
            <View style={{ marginLeft: 8 }}>
              {day.kind === 'train' ? <BarbellGlyph key={day.session.id} color={day.session.color} track={colors.textMuted} done={trainedToday} size={84} /> : <MoonGlyph color={colors.primary} size={84} />}
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: spacing.lg }}>
            {day.kind === 'train' && !trainedToday ? (
              <>
                <PressScale onPress={() => start(day.session.routine)} accessibilityRole="button" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: day.session.color, borderRadius: radius.pill, paddingVertical: 13 }}>
                  <Ionicons name={state.activeWorkout ? 'play' : 'play'} size={16} color="#fff" />
                  <T weight="800" color="#fff">{state.activeWorkout ? 'Resume workout' : `Start ${day.session.name}`}</T>
                </PressScale>
                <PressScale
                  onPress={() => {
                    tap();
                    dispatch({ type: 'setPlan', plan: withDay(plan, today, null) });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Make today a rest day"
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingVertical: 13, paddingHorizontal: 16, backgroundColor: colors.cardAlt }}
                >
                  <MiniMoon color={colors.text} size={13} />
                  <T weight="800" size={14}>Rest</T>
                </PressScale>
              </>
            ) : day.kind === 'train' ? (
              <PressScale onPress={() => router.push({ pathname: '/log-exercise', params: { date: today } })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.cardAlt, borderRadius: radius.pill, paddingVertical: 13 }}>
                <Ionicons name="bicycle" size={16} color={colors.text} />
                <T weight="800">Add cardio</T>
              </PressScale>
            ) : (
              <>
                <PressScale onPress={() => router.push({ pathname: '/log-exercise', params: { date: today } })} accessibilityRole="button" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.pill, paddingVertical: 13 }}>
                  <Ionicons name="walk" size={16} color={colors.onPrimary} />
                  <T weight="800" color={colors.onPrimary}>Log a walk</T>
                </PressScale>
                <PressScale onPress={() => router.push('/train-search')} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radius.pill, paddingVertical: 13, paddingHorizontal: 16, backgroundColor: colors.cardAlt }}>
                  <Ionicons name="barbell" size={15} color={colors.text} />
                  <T weight="800" size={14}>Train anyway</T>
                </PressScale>
              </>
            )}
          </View>
          {day.kind === 'train' && !trainedToday ? (
            <T
              size={12}
              weight="700"
              color={colors.textMuted}
              style={{ marginTop: 10, alignSelf: 'center' }}
              onPress={() => {
                tap();
                dispatch({ type: 'setPlan', plan: swapDays(plan, today, tomorrow) });
              }}
            >
              Not today? {moveLabel} ›
            </T>
          ) : null}
        </View>

        {/* This week */}
        <View style={{ backgroundColor: colors.cardAlt, paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, paddingHorizontal: 4 }}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={13} weight="800">This week · {stats.done}/{stats.planned} done</T>
              <T size={12} weight="600" muted numberOfLines={1}>{planName(plan)}{stats.minutes ? ` · ${stats.minutes} min trained` : ''}</T>
            </View>
            <PressScale onPress={() => openPlan()} accessibilityRole="button" accessibilityLabel="Edit plan" hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.card }}>
              <Ionicons name="create-outline" size={13} color={colors.primary} />
              <T size={12} weight="800" color={colors.primary}>Edit plan</T>
            </PressScale>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {week.map((d, i) => (
              <DayCapsule key={d} date={d} index={i} today={today} onPress={() => openPlan(i)} />
            ))}
          </View>
        </View>
      </Card>
    </FadeIn>
  );
}
