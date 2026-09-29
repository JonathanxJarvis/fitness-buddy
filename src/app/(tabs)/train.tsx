import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActionSheet, Badge, Card, T, Screen, type IconName } from '@/components/ui';
import { FadeIn, PressScale, usePulse } from '@/components/motion';
import { useStore } from '@/store/StoreProvider';
import { prettyDate, todayKey } from '@/lib/dates';
import { useStartWorkout } from '@/lib/useStartWorkout';
import { stateProgression } from '@/lib/progression';
import { unreadCount } from '@/lib/social';
import { RankBadge } from '@/components/RankBadge';
import { TodayPlan } from '@/components/plan/TodayPlan';
import { planDay, planSessions, type Session } from '@/lib/plan';
import { doneSets, routineFromWorkout } from '@/lib/training';
import type { Routine } from '@/lib/types';
import { font, nutrientColors, radius, spacing, useTheme } from '@/theme';

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

function LinkRow({ icon, title, subtitle, onPress, first }: { icon: IconName; title: string; subtitle?: string; onPress: () => void; first?: boolean }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: colors.border, opacity: pressed ? 0.6 : 1 })}
    >
      <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T weight="700">{title}</T>
        {subtitle ? <T size={12} muted numberOfLines={1}>{subtitle}</T> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

/** Your own routine behind a session, to edit; a built-in opens the builder pre-filled. */
function editSession(s: Session, routines: Routine[]) {
  const mine = s.id.startsWith('r:') ? s.routine : routines.find((r) => r.name.trim().toLowerCase() === s.name.toLowerCase());
  router.push({ pathname: '/routine-builder', params: mine ? { id: mine.id } : { name: s.name } });
}

/** One compact row per plan workout: name, size, edit and start. */
function PlanRow({ s, badge, first, onStart, onEdit }: { s: Session; badge?: { label: string; icon?: IconName }; first: boolean; onStart: () => void; onEdit: () => void }) {
  const { colors } = useTheme();
  const ex = s.routine.exercises;
  const sets = ex.reduce((n, x) => n + x.sets, 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: first ? 0 : 1, borderTopColor: colors.border }}>
      <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: s.color }} />
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Edit ${s.name}`} style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T size={16} weight="800" numberOfLines={1} style={{ flexShrink: 1 }}>{s.name}</T>
          {badge ? <Badge label={badge.label} icon={badge.icon} color={s.color} /> : null}
        </View>
        <T size={12} muted numberOfLines={1}>{ex.length} exercises · ~{Math.round(sets * 2.8 + 5)} min · tap to edit</T>
      </Pressable>
      <PressScale onPress={onStart} accessibilityRole="button" accessibilityLabel={`Start ${s.name}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: s.color, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 }}>
        <Ionicons name="play" size={12} color="#fff" />
        <T size={13} weight="800" color="#fff">Start</T>
      </PressScale>
    </View>
  );
}

/** One compact line per recent session: name, when, and a small play button to do it again. */
function LatestRow({ s, date, first, onStart }: { s: Session; date: string; first: boolean; onStart: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: first ? 0 : 1, borderTopColor: colors.border }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T weight="700" numberOfLines={1}>{s.name}</T>
        <T size={12} muted numberOfLines={1}>{prettyDate(date)} · {s.routine.exercises.length} exercises</T>
      </View>
      <PressScale onPress={onStart} accessibilityRole="button" accessibilityLabel={`Do ${s.name} again`} style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }}>
        <Ionicons name="play" size={14} color={colors.primary} />
      </PressScale>
    </View>
  );
}

function Heading({ title, hint, right }: { title: string; hint?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: spacing.md, marginBottom: spacing.sm }}>
      <View style={{ flex: 1 }}>
        <T size={17} weight="800">{title}</T>
        {hint ? <T size={12} muted>{hint}</T> : null}
      </View>
      {right}
    </View>
  );
}

export default function Train() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const start = useStartWorkout();
  const [restOpen, setRestOpen] = useState(false);
  const restSeconds = state.restSeconds ?? 90;

  const today = todayKey();
  const prog = useMemo(() => stateProgression(state, today), [state.workouts, state.profile, state.exercises, state.questLog, state.settings.previewMax, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const last = state.workouts[state.workouts.length - 1];
  const unread = unreadCount(state.social, state.social?.me?.id);
  const [pending, setPending] = useState<Routine | null>(null);
  const day = planDay(state, today);

  // Derived from the plan every render, so a new plan brings its own workouts.
  const planned = useMemo(() => planSessions(state), [state.plan, state.routines]); // eslint-disable-line react-hooks/exhaustive-deps
  const shownNames = new Set(planned.map((s) => s.name.trim().toLowerCase()));
  // Recent sessions outside the plan: one tap to do them again.
  const clearedAt = state.settings.latestClearedAt ?? 0;
  const latest: { s: Session; date: string }[] = [];
  for (let i = state.workouts.length - 1; i >= 0 && latest.length < 3; i--) {
    const w = state.workouts[i];
    const key = w.name.trim().toLowerCase();
    if (w.startedAt <= clearedAt) break;
    if (!w.exercises.length || doneSets(w) === 0 || shownNames.has(key)) continue;
    shownNames.add(key);
    latest.push({ s: { id: `w:${w.id}`, name: w.name, short: '', color: colors.primary, routine: routineFromWorkout(w, `w:${w.id}`) }, date: w.date });
  }
  const doneToday = new Set(state.workouts.filter((w) => w.date === today && doneSets(w) > 0).map((w) => w.name.trim().toLowerCase()));
  const badgeFor = (s: Session): { label: string; icon?: IconName } | undefined =>
    doneToday.has(s.name.trim().toLowerCase()) ? { label: 'DONE TODAY', icon: 'checkmark' } : day.kind === 'train' && day.session.id === s.id ? { label: 'TODAY' } : undefined;
  const startOrAsk = (r: Routine) => {
    if (state.activeWorkout) setPending(r);
    else start(r);
  };

  const pill = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 5, backgroundColor: colors.cardAlt, paddingHorizontal: 12, height: 34, borderRadius: radius.pill };

  return (
    <Screen topInset tabs>
      <FadeIn style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md }}>
        <View style={{ flex: 1 }}>
          <T size={13} muted weight="600">Strength training</T>
          <T size={26} weight="800">Train</T>
        </View>
        {unread > 0 && (
          <Pressable onPress={() => router.navigate('/friends')} accessibilityLabel={`Friends, ${unread} unread`} style={pill}>
            <Ionicons name="people" size={15} color={colors.text} />
            <View style={{ minWidth: 16, height: 16, borderRadius: 8, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
              <T size={10} weight="800" color="#fff">{unread}</T>
            </View>
          </Pressable>
        )}
        <Pressable onPress={() => setRestOpen(true)} accessibilityLabel={`Rest timer, ${restSeconds} seconds`} style={pill}>
          <Ionicons name="timer-outline" size={15} color={colors.text} />
          <T size={13} weight="700">{restSeconds}s</T>
        </Pressable>
        <PressScale onPress={() => router.push('/rank')} accessibilityLabel={`Rank: ${prog.stage.label}, level ${prog.level}`}>
          <RankBadge stage={prog.stage} size={40} />
        </PressScale>
      </FadeIn>

      {state.activeWorkout && <ResumeBanner />}

      <TodayPlan />

      {!state.activeWorkout && (
        <FadeIn delay={100} style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
          <PressScale onPress={() => start()} accessibilityRole="button" style={{ flex: 1 }}>
            {/* With a plan, today's session is the main button; this becomes the quiet alternative. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: state.plan ? colors.card : colors.primary, borderWidth: state.plan ? 1 : 0, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 14 }}>
              <Ionicons name="add" size={19} color={state.plan ? colors.text : colors.onPrimary} />
              <T weight="800" color={state.plan ? colors.text : colors.onPrimary}>Start empty workout</T>
            </View>
          </PressScale>
          <PressScale onPress={() => router.push({ pathname: '/log-exercise', params: { date: today } })} accessibilityRole="button" accessibilityLabel="Log cardio">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primarySoft, borderRadius: radius.pill, paddingVertical: 14, paddingHorizontal: 16 }}>
              <Ionicons name="bicycle" size={18} color={colors.primary} />
              <T weight="800" color={colors.primary}>Cardio</T>
            </View>
          </PressScale>
        </FadeIn>
      )}

      <FadeIn delay={140}>
        <PressScale onPress={() => router.push('/train-search')} accessibilityRole="search" accessibilityLabel="Search workouts and exercises" scaleTo={0.98} style={{ marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 16, height: 48 }}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <T size={15} muted style={{ flex: 1, ...font('500') }}>Search workouts and exercises</T>
          </View>
        </PressScale>
      </FadeIn>

      {planned.length > 0 && (
        <FadeIn delay={160}>
          <Heading
            title="Your plan's workouts"
            hint="Any of them counts for today."
            right={
              <Pressable onPress={() => router.push('/plan')} accessibilityRole="button" accessibilityLabel="Change plan" hitSlop={8}>
                <T size={13} weight="800" color={colors.primary}>Change plan</T>
              </Pressable>
            }
          />
          <Card style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.md }}>
            {planned.map((s, i) => (
              <PlanRow key={s.id} s={s} first={i === 0} badge={badgeFor(s)} onStart={() => startOrAsk(s.routine)} onEdit={() => editSession(s, state.routines)} />
            ))}
          </Card>
        </FadeIn>
      )}

      {latest.length > 0 && (
        <FadeIn delay={190}>
          <Heading
            title="Latest workouts"
            right={
              <Pressable onPress={() => dispatch({ type: 'updateSettings', settings: { latestClearedAt: Date.now() } })} accessibilityRole="button" accessibilityLabel="Clear latest workouts" hitSlop={8}>
                <T size={13} weight="800" color={colors.textMuted}>Clear</T>
              </Pressable>
            }
          />
          <Card style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.md }}>
            {latest.map(({ s, date }, i) => (
              <LatestRow key={s.id} s={s} date={date} first={i === 0} onStart={() => startOrAsk(s.routine)} />
            ))}
          </Card>
        </FadeIn>
      )}

      <FadeIn delay={200}>
        <Card style={{ marginTop: spacing.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.md }}>
          <LinkRow first icon="add" title="Create a workout" subtitle="Choose exercises, sets and reps" onPress={() => router.push('/routine-builder')} />
          <LinkRow icon="body-outline" title="Recovery" subtitle="Which muscles are fresh and which need rest" onPress={() => router.push('/recovery' as never)} />
          <LinkRow
            icon="time-outline"
            title="History"
            subtitle={last ? `${state.workouts.length} workout${state.workouts.length === 1 ? '' : 's'} · last: ${last.name}, ${prettyDate(last.date)}` : 'Your finished workouts show up here'}
            onPress={() => router.push('/history')}
          />
        </Card>
      </FadeIn>

      <ActionSheet
        visible={!!pending}
        onClose={() => setPending(null)}
        title={state.activeWorkout ? `${state.activeWorkout.name} is still going` : undefined}
        actions={
          pending && state.activeWorkout
            ? [
                { label: `Add ${pending.name} to it`, subtitle: `${pending.exercises.length} exercises join your current workout`, icon: 'add-circle-outline', onPress: () => start(pending, { add: true }) },
                { label: `Resume ${state.activeWorkout.name}`, subtitle: 'Finish it first, then start the next one', icon: 'play', onPress: () => start() },
              ]
            : []
        }
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
