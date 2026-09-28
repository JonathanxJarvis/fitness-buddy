import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheet, Badge, Card, EmptyState, IconTile, Screen, SectionTitle, T } from '@/components/ui';
import { FadeIn, PressScale, usePulse } from '@/components/motion';
import { useStore } from '@/store/StoreProvider';
import { shortDate, todayKey } from '@/lib/dates';
import { countPRs, durationMinutes, findExercise, personalRecords, TEMPLATES, workoutVolume } from '@/lib/training';
import { useStartWorkout } from '@/lib/useStartWorkout';
import { stateProgression, STAGES } from '@/lib/progression';
import { unreadCount } from '@/lib/social';
import { RankBadge } from '@/components/RankBadge';
import { TodayPlan } from '@/components/plan/TodayPlan';
import { formatWeight, kgToLb, weightUnit } from '@/lib/units';
import { nutrientColors, radius, spacing, useTheme } from '@/theme';
import type { Routine } from '@/lib/types';

const REST_CHOICES = [60, 90, 120, 180];

function ResumeBanner() {
  const { state } = useStore();
  const { colors } = useTheme();
  const pulse = usePulse();
  const w = state.activeWorkout!;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const mins = Math.floor((now - w.startedAt) / 60000);
  return (
    <PressScale onPress={() => router.push('/workout')} style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.ink, borderRadius: 20, padding: spacing.md }}>
        <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: nutrientColors.calories, opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }} />
        <View style={{ flex: 1 }}>
          <T size={14} weight="800" color={colors.onInk} numberOfLines={1}>{w.name}</T>
          <T size={12} color={colors.onInk} style={{ opacity: 0.7 }}>In progress · {mins} min · {w.exercises.length} exercises</T>
        </View>
        <View style={{ backgroundColor: nutrientColors.calories, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 7 }}>
          <T size={13} weight="800" color="#fff">Resume</T>
        </View>
      </View>
    </PressScale>
  );
}

function RoutineCard({ r, onStart, onMenu }: { r: Routine; onStart: () => void; onMenu?: () => void }) {
  const { state } = useStore();
  const { colors } = useTheme();
  const names = r.exercises.map((x) => findExercise(x.exerciseId, state.customExercises)?.name).filter(Boolean);
  return (
    <PressScale onPress={onStart} onLongPress={onMenu} style={{ width: 172 }}>
      <Card style={{ padding: spacing.md, marginBottom: 0, height: 128 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T weight="800" numberOfLines={1} style={{ flex: 1 }}>{r.name}</T>
          <Ionicons name="play-circle" size={22} color={colors.primary} />
        </View>
        <T size={11} weight="700" color={colors.primary} style={{ marginTop: 2 }}>
          {r.exercises.length} exercises · {r.exercises.reduce((s, x) => s + x.sets, 0)} sets
        </T>
        <T size={12} muted numberOfLines={3} style={{ marginTop: 6 }}>{names.join(', ')}</T>
      </Card>
    </PressScale>
  );
}

export default function Train() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const start = useStartWorkout();
  const units = state.settings.units;
  const [menu, setMenu] = useState<Routine | null>(null);
  const [restOpen, setRestOpen] = useState(false);
  const restSeconds = state.restSeconds ?? 90;

  const today = todayKey();
  const prog = useMemo(() => stateProgression(state, today), [state.workouts, state.profile, state.exercises, state.questLog, today]);
  const recent = [...state.workouts].reverse().slice(0, 8);
  const prs = useMemo(
    () =>
      Object.entries(personalRecords(state.workouts))
        .filter(([, p]) => p.kg > 0)
        .sort((a, b) => b[1].e1rm - a[1].e1rm)
        .slice(0, 5),
    [state.workouts],
  );

  const unread = unreadCount(state.social, state.social?.me?.id);

  return (
    <Screen topInset tabs>
      <FadeIn style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
        <View style={{ flex: 1 }}>
          <T size={13} muted weight="600">Strength training</T>
          <T size={26} weight="800">Train</T>
        </View>
        <Pressable
          onPress={() => router.navigate('/friends')}
          accessibilityLabel="Friends"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.cardAlt, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, marginRight: 6 }}
        >
          <Ionicons name="people" size={15} color={colors.text} />
          <T size={13} weight="700">Friends</T>
          {unread > 0 && (
            <View style={{ minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
              <T size={10} weight="800" color="#fff">{unread}</T>
            </View>
          )}
        </Pressable>
        <Pressable
          onPress={() => setRestOpen(true)}
          accessibilityLabel="Rest timer length"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.cardAlt, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill }}
        >
          <Ionicons name="timer-outline" size={15} color={colors.text} />
          <T size={13} weight="700">{restSeconds}s</T>
        </Pressable>
      </FadeIn>

      {state.activeWorkout && <ResumeBanner />}

      <TodayPlan />

      {/* Quick start */}
      <FadeIn delay={120} style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm }}>
        <PressScale onPress={() => start()} style={{ flex: 1 }}>
          {/* With a plan, today's session is the main button; this becomes the quiet alternative. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: state.plan ? colors.cardAlt : colors.primary, borderRadius: radius.pill, paddingVertical: 14 }}>
            <Ionicons name={state.activeWorkout ? 'play' : 'add'} size={18} color={state.plan ? colors.text : colors.onPrimary} />
            <T weight="800" color={state.plan ? colors.text : colors.onPrimary}>{state.activeWorkout ? 'Resume workout' : state.plan ? 'Empty workout' : 'Start empty workout'}</T>
          </View>
        </PressScale>
        <PressScale onPress={() => router.push({ pathname: '/log-exercise', params: { date: today } })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: 16 }}>
            <Ionicons name="bicycle" size={18} color={colors.primary} />
            <T weight="800" color={colors.primary}>Cardio</T>
          </View>
        </PressScale>
      </FadeIn>


      {/* Rank & level */}
      <FadeIn delay={140}>
        <PressScale onPress={() => router.push('/rank')} style={{ marginBottom: spacing.sm, marginTop: spacing.sm }}>
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, marginBottom: 0 }}>
            <RankBadge stage={prog.stage} size={50} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <T size={17} weight="800">{prog.stage.label}</T>
                <T size={12} weight="700" color={colors.primary}>Lv {prog.level}</T>
              </View>
              <T size={12} muted numberOfLines={1}>
                {STAGES[prog.stage.index + 1] ? `${Math.max(0, STAGES[prog.stage.index + 1].min - prog.score).toFixed(1)} pts to ${STAGES[prog.stage.index + 1].label}` : 'Maximum rank reached'}
              </T>
              <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.track, marginTop: 6, overflow: 'hidden' }}>
                <View style={{ width: `${prog.progress * 100}%`, height: 5, backgroundColor: prog.stage.tier.color }} />
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Card>
        </PressScale>
      </FadeIn>

      {/* Routines */}
      {state.routines.length > 0 && (
        <>
          <SectionTitle>My routines</SectionTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }} style={{ marginHorizontal: -spacing.lg, paddingLeft: spacing.lg, flexGrow: 0 }}>
            {state.routines.map((r) => (
              <RoutineCard key={r.id} r={r} onStart={() => start(r)} onMenu={() => setMenu(r)} />
            ))}
          </ScrollView>
        </>
      )}
      <SectionTitle>Templates</SectionTitle>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }} style={{ marginHorizontal: -spacing.lg, paddingLeft: spacing.lg, flexGrow: 0 }}>
        {TEMPLATES.map((r) => (
          <RoutineCard key={r.id} r={r} onStart={() => start(r)} />
        ))}
      </ScrollView>

      {/* History */}
      <SectionTitle>History</SectionTitle>
      {recent.length === 0 ? (
        <Card>
          <EmptyState icon="barbell-outline" title="No workouts yet" body="Start a template above. Sets, weights and PRs are saved on your phone." />
        </Card>
      ) : (
        <Card style={{ paddingVertical: spacing.sm }}>
          {recent.map((w, i) => {
            const prCount = countPRs(w, state.workouts.filter((x) => x.startedAt < w.startedAt));
            const vol = workoutVolume(w);
            return (
              <Pressable
                key={w.id}
                onPress={() => router.push({ pathname: '/workout-detail', params: { id: w.id } })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}
              >
                <IconTile icon="barbell" color={nutrientColors.protein} size={38} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <T weight="700" numberOfLines={1} style={{ flexShrink: 1 }}>{w.name}</T>
                    {prCount > 0 && <Badge label={`${prCount} PR`} icon="trophy" color={nutrientColors.carbs} />}
                  </View>
                  <T size={12} muted numberOfLines={1}>
                    {shortDate(w.date)} · {durationMinutes(w)} min · {Math.round(units === 'us' ? kgToLb(vol) : vol).toLocaleString()} {weightUnit(units)}
                  </T>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <T size={14} weight="800">{w.calories ?? 0}</T>
                  <T size={11} muted>kcal</T>
                </View>
              </Pressable>
            );
          })}
        </Card>
      )}

      {prs.length > 0 && (
        <>
          <SectionTitle>Personal records</SectionTitle>
          <Card style={{ paddingVertical: spacing.sm }}>
            {prs.map(([id, p], i) => (
              <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                <Ionicons name="trophy" size={16} color={nutrientColors.carbs} />
                <T weight="700" style={{ flex: 1 }} numberOfLines={1}>{findExercise(id, state.customExercises)?.name ?? id}</T>
                <T size={13} muted>{formatWeight(p.kg, units, 0)} × {p.reps}</T>
                <T size={13} weight="800" style={{ width: 70, textAlign: 'right' }}>{formatWeight(p.e1rm, units, 0)}</T>
              </View>
            ))}
            <T size={11} muted style={{ marginTop: 4 }}>Right column is your estimated one-rep max (Epley).</T>
          </Card>
        </>
      )}

      <ActionSheet
        visible={!!menu}
        onClose={() => setMenu(null)}
        title={menu?.name}
        actions={[
          { label: 'Start this routine', icon: 'play', onPress: () => menu && start(menu) },
          { label: 'Delete routine', icon: 'trash-outline', destructive: true, onPress: () => menu && dispatch({ type: 'deleteRoutine', id: menu.id }) },
        ]}
      />
      <ActionSheet
        visible={restOpen}
        onClose={() => setRestOpen(false)}
        title="Rest between sets"
        actions={REST_CHOICES.map((s) => ({
          label: s < 120 ? `${s} seconds` : `${s / 60} minutes`,
          subtitle: s === 60 ? 'Hypertrophy, accessories' : s === 90 ? 'Default' : s === 120 ? 'Moderate compound lifts' : 'Heavy strength work',
          icon: s === restSeconds ? 'checkmark-circle' : 'timer-outline',
          onPress: () => dispatch({ type: 'setRestSeconds', seconds: s }),
        }))}
      />
    </Screen>
  );
}
