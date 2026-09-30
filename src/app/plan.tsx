import React, { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Button, Card, IconButton, T } from '@/components/ui';
import { FadeIn, PressScale } from '@/components/motion';
import { MiniMoon, WeekRhythm } from '@/components/plan/Glyphs';
import { ExerciseFigure } from '@/components/exercise/ExerciseFigure';
import { useStore } from '@/store/StoreProvider';
import { DAY_NAMES, findSession, findSplit, planFromSplit, sessionChoices, SPLITS, type Session } from '@/lib/plan';
import { todayKey } from '@/lib/dates';
import { font, radius, spacing, useTheme } from '@/theme';

const tap = () => Haptics.selectionAsync().catch(() => {});

function StepTitle({ n, title, hint }: { n: number; title: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.xl, marginBottom: spacing.sm }}>
      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
        <T size={12} weight="800" color={colors.onPrimary}>{n}</T>
      </View>
      <View style={{ flex: 1 }}>
        <T size={17} weight="800">{title}</T>
        {hint ? <T size={12} muted>{hint}</T> : null}
      </View>
    </View>
  );
}

/** A workout in the plan with its first exercises and an obvious "Edit exercises". */
function WorkoutRow({ s, days, onEdit }: { s: Session; days: string[]; onEdit: () => void }) {
  const { state } = useStore();
  const { colors } = useTheme();
  const sets = s.routine.exercises.reduce((n, x) => n + x.sets, 0);
  return (
    <Card style={{ padding: spacing.md, marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: s.color }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={16} weight="800" numberOfLines={1}>{s.name}</T>
          <T size={12} muted numberOfLines={1}>
            {s.routine.exercises.length} exercises · {sets} sets{days.length ? ` · ${days.join(', ')}` : ''}
          </T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm }}>
        {s.routine.exercises.slice(0, 5).map((x, i) => (
          <View key={x.exerciseId + i} style={{ borderRadius: 10, backgroundColor: colors.cardAlt, padding: 1 }}>
            <ExerciseFigure exerciseId={x.exerciseId} customExercises={state.customExercises} size={36} />
          </View>
        ))}
        {s.routine.exercises.length > 5 ? <T size={12} weight="800" muted style={{ marginLeft: 4 }}>+{s.routine.exercises.length - 5}</T> : null}
      </View>
      <PressScale
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${s.name} exercises`}
        style={{ marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.primarySoft }}
      >
        <Ionicons name="create-outline" size={16} color={colors.primary} />
        <T size={14} weight="800" color={colors.primary}>Edit exercises</T>
      </PressScale>
    </Card>
  );
}

/**
 * The weekly plan editor: choose a split, set each day to a workout or rest,
 * and edit any workout's exercises. Its own screen so it scrolls normally and
 * keeps your unsaved choices while you edit a workout on top of it.
 */
export default function PlanScreen() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ split?: string; day?: string }>();
  const initialSplit = params.split ?? state.plan?.split ?? 'ppl';
  const [split, setSplit] = useState(initialSplit);
  const [week, setWeek] = useState<(string | null)[]>(state.plan && state.plan.split === initialSplit ? state.plan.week : findSplit(initialSplit).week);
  const [name, setName] = useState(state.plan?.name ?? '');
  const [open, setOpen] = useState<number | null>(params.day !== undefined ? Number(params.day) : null);
  const scroll = useRef<ScrollView>(null);
  const weekY = useRef(0);
  const scrolled = useRef(false);

  const custom = split === 'custom';
  const choices = useMemo(() => sessionChoices({ plan: { split, week, since: '' }, routines: state.routines }), [split, week, state.routines]);
  // The workouts this plan uses: the split's own, or (custom) whatever the week holds.
  const workouts = useMemo(() => {
    const ids = custom ? [...new Set(week.filter((x): x is string => !!x))] : findSplit(split).sessions;
    return ids.map((id) => findSession(state, id)).filter((x): x is Session => !!x);
  }, [custom, split, week, state]);
  const trainDays = week.filter(Boolean).length;

  const pickSplit = (id: string) => {
    tap();
    setSplit(id);
    setOpen(null);
    if (id !== 'custom') setWeek(findSplit(id).week);
    else if (state.plan?.split === 'custom') setWeek(state.plan.week);
  };
  const setDay = (i: number, id: string | null) => {
    tap();
    setWeek((w) => w.map((x, j) => (j === i ? id : x)));
    setOpen(null);
  };
  const edit = (s: Session) => {
    const mine = s.id.startsWith('r:') ? s.routine : state.routines.find((r) => r.name.trim().toLowerCase() === s.name.toLowerCase());
    router.push({ pathname: '/routine-builder', params: mine ? { id: mine.id } : { name: s.name } });
  };
  const save = () => {
    const since = state.plan?.since ?? todayKey();
    dispatch({ type: 'setPlan', plan: { ...planFromSplit(split, since, week, name), overrides: state.plan?.overrides } });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <T size={12} weight="800" muted style={{ letterSpacing: 1.2 }}>TRAINING PLAN</T>
          <T size={22} weight="800">Your training week</T>
        </View>
        <IconButton label="Close" icon="close" color={colors.text} onPress={() => router.back()} filled />
      </View>

      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xl }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => {
          // Opened from a day in the week strip: jump to the week list once.
          if (params.day !== undefined && weekY.current && !scrolled.current) {
            scrolled.current = true;
            scroll.current?.scrollTo({ y: weekY.current - spacing.md, animated: false });
          }
        }}
      >
        <StepTitle n={1} title="Choose a split" hint="How your training days are shared out" />
        <View style={{ gap: 8 }}>
          {SPLITS.map((s) => {
            const on = s.id === split;
            return (
              <PressScale
                key={s.id}
                onPress={() => pickSplit(s.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={s.name}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md + 2, borderWidth: 1.5, borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primarySoft : colors.card }}
              >
                <WeekRhythm week={on ? week : s.week} color={on ? colors.primary : colors.textMuted} rest={colors.track} height={18} />
                <View style={{ flex: 1 }}>
                  <T size={15} weight="800">{s.name}</T>
                  <T size={12} muted>{s.blurb}</T>
                </View>
                <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={on ? colors.primary : colors.border} />
              </PressScale>
            );
          })}
        </View>

        {custom ? (
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Name it (optional), e.g. Summer cut"
            placeholderTextColor={colors.textMuted}
            maxLength={28}
            returnKeyType="done"
            style={{ marginTop: spacing.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 16, ...font('700') }}
          />
        ) : null}

        <View onLayout={(e) => (weekY.current = e.nativeEvent.layout.y)}>
          <StepTitle n={2} title="Set your week" hint={`${trainDays} training ${trainDays === 1 ? 'day' : 'days'} · ${7 - trainDays} rest · tap a day to change it`} />
        </View>
        <Card style={{ paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden' }}>
          {DAY_NAMES.map((d, i) => {
            const s = findSession(state, week[i]);
            const expanded = open === i;
            return (
              <View key={d} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                <Pressable
                  onPress={() => {
                    tap();
                    setOpen(expanded ? null : i);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  accessibilityLabel={`${d}: ${s?.name ?? 'Rest'}`}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: spacing.md, paddingVertical: 13, backgroundColor: pressed || expanded ? colors.cardAlt : 'transparent' })}
                >
                  <T size={14} weight="800" style={{ width: 92 }}>{d}</T>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {s ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} /> : <MiniMoon color={colors.textMuted} size={12} />}
                    <T size={15} weight={s ? '800' : '600'} color={s ? colors.text : colors.textMuted} numberOfLines={1} style={{ flexShrink: 1 }}>{s ? s.name : 'Rest'}</T>
                  </View>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
                </Pressable>
                {expanded ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: spacing.md, paddingBottom: spacing.md, paddingTop: 4, backgroundColor: colors.cardAlt }}>
                    {[...choices, null].map((c) => {
                      const id = c?.id ?? null;
                      const on = week[i] === id;
                      const tint = c?.color ?? colors.textMuted;
                      return (
                        <PressScale
                          key={id ?? 'rest'}
                          onPress={() => setDay(i, id)}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: on }}
                          accessibilityLabel={`${d}: ${c?.name ?? 'Rest'}`}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: on ? tint : colors.card, borderWidth: 1, borderColor: on ? tint : colors.border }}
                        >
                          {c ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: on ? '#fff' : tint }} /> : <MiniMoon color={on ? '#fff' : colors.textMuted} size={11} />}
                          <T size={14} weight="800" color={on ? '#fff' : colors.text}>{c ? c.name : 'Rest'}</T>
                        </PressScale>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
        </Card>

        <StepTitle n={3} title="Your workouts" hint="Choose the exercises, sets and reps for each" />
        {workouts.map((s) => (
          <FadeIn key={s.id}>
            <WorkoutRow s={s} days={DAY_NAMES.filter((_, i) => week[i] === s.id).map((d) => d.slice(0, 3))} onEdit={() => edit(s)} />
          </FadeIn>
        ))}
        {custom ? (
          <PressScale
            onPress={() => router.push('/routine-builder')}
            accessibilityRole="button"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: radius.lg, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.primary }}
          >
            <Ionicons name="add" size={18} color={colors.primary} />
            <T weight="800" color={colors.primary}>Create a new workout</T>
          </PressScale>
        ) : null}
        {custom && workouts.length === 0 ? (
          <T size={13} muted style={{ marginTop: spacing.sm }}>Give a day a workout above, or create your own and pick it for any day.</T>
        ) : null}

        <T size={12} muted style={{ marginTop: spacing.lg }}>Your daily quests follow this plan, and planned rest days keep your streak.</T>
        {state.plan ? (
          <Button
            title="Remove plan"
            variant="ghost"
            style={{ marginTop: spacing.sm }}
            onPress={() => {
              dispatch({ type: 'setPlan', plan: null });
              router.back();
            }}
          />
        ) : null}
      </ScrollView>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.background }}>
        <Button title={state.plan ? 'Save plan' : 'Start this plan'} icon="checkmark" onPress={save} />
      </View>
    </KeyboardAvoidingView>
  );
}
