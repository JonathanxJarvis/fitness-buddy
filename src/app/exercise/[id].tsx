import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Badge, Card, EmptyState, IconButton, T } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { ExerciseFigure } from '@/components/exercise/ExerciseFigure';
import { MusclesWorked, setLabel } from '@/components/workout/Summary';
import { useStore } from '@/store/StoreProvider';
import { exerciseInfo } from '@/lib/exerciseInfo';
import { findExercise, oneRepMax } from '@/lib/training';
import { bestSet, exerciseSessions } from '@/lib/workoutSummary';
import { prettyDate, shortDate } from '@/lib/dates';
import { formatWeight } from '@/lib/units';
import { nutrientColors, radius, spacing, useTheme } from '@/theme';

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ width: '48.5%', flexGrow: 1, backgroundColor: colors.cardAlt, borderRadius: radius.md, padding: 12 }}>
      <T size={11} weight="700" muted style={{ letterSpacing: 0.6 }}>{label.toUpperCase()}</T>
      <T size={18} weight="800" numberOfLines={1} style={{ marginTop: 2 }}>{value}</T>
      {sub ? <T size={12} muted numberOfLines={1}>{sub}</T> : null}
    </View>
  );
}

/** One exercise: a picture of it, the muscles it works, form cues and your own numbers. */
export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const units = state.settings.units;
  const ex = findExercise(id ?? '', state.customExercises);
  const info = useMemo(() => exerciseInfo(id ?? '', state.customExercises), [id, state.customExercises]);
  const sessions = useMemo(() => exerciseSessions(id ?? '', state.workouts), [id, state.workouts]);

  if (!ex) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg }}>
        <View style={{ alignItems: 'flex-end' }}>
          <IconButton label="Close" icon="close" color={colors.text} onPress={() => router.back()} />
        </View>
        <EmptyState icon="barbell-outline" title="Exercise not found" />
      </View>
    );
  }

  const allSets = sessions.flatMap((s) => s.sets);
  const best = bestSet(allSets);
  const e1rm = best && best.kg > 0 ? oneRepMax(best.kg, best.reps) : 0;
  const last = sessions[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <IconButton label="Close" icon="close" color={colors.text} onPress={() => router.back()} filled />
        </View>
        <FadeIn>
          <View style={{ alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg + 6, paddingVertical: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.md }}>
            <ExerciseFigure exerciseId={ex.id} customExercises={state.customExercises} size={184} />
          </View>
          <T size={26} weight="800">{ex.name}</T>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, marginBottom: spacing.md }}>
            <Badge label={cap(ex.muscle)} color={colors.primary} />
            <Badge label={cap(ex.equipment)} color={nutrientColors.protein} />
          </View>
        </FadeIn>

        <MusclesWorked primary={info.primary} secondary={info.secondary} title="Muscles it works" delay={80} />

        {info.cues.length ? (
          <FadeIn delay={140}>
            <Card style={{ padding: spacing.md }}>
              <T size={17} weight="800" style={{ marginBottom: spacing.sm }}>How to do it</T>
              {info.cues.map((c, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 5 }}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                    <T size={12} weight="800" color={colors.primary}>{i + 1}</T>
                  </View>
                  <T size={14} style={{ flex: 1, lineHeight: 21 }}>{c}</T>
                </View>
              ))}
            </Card>
          </FadeIn>
        ) : null}

        <FadeIn delay={180}>
          <T size={17} weight="800" style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>Your stats</T>
          {sessions.length === 0 ? (
            <Card style={{ padding: spacing.md }}>
              <T weight="700">Not done yet</T>
              <T size={13} muted style={{ marginTop: 2 }}>Your best set, estimated max and recent sessions will show up here after you log it.</T>
            </Card>
          ) : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
                <Stat label="Best set" value={best ? setLabel(best, units, ex.bodyweight) : '—'} />
                {e1rm ? <Stat label="Est. 1-rep max" value={formatWeight(e1rm, units, 0)} /> : <Stat label="Total sets" value={String(allSets.length)} />}
                <Stat label="Last done" value={prettyDate(last.date)} sub={last.workoutName} />
                <Stat label="Sessions" value={String(sessions.length)} />
              </View>
              <Card style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.md }}>
                {sessions.slice(0, 6).map((s, i) => (
                  <View key={s.workoutId + i} style={{ paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                      <T size={14} weight="800" style={{ flex: 1 }} numberOfLines={1}>{s.workoutName}</T>
                      <T size={12} muted>{shortDate(s.date)}</T>
                    </View>
                    <T size={13} muted numberOfLines={2} style={{ marginTop: 2 }}>{s.sets.map((x) => setLabel(x, units, ex.bodyweight)).join('  ·  ')}</T>
                  </View>
                ))}
              </Card>
            </>
          )}
        </FadeIn>
      </ScrollView>
    </View>
  );
}
