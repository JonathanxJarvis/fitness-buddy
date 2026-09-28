import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Badge, Button, Card, EmptyState, Screen, T } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { durationMinutes, findExercise, oneRepMax, prExercises, routineFromWorkout, workoutFromRoutine, workoutVolume, doneSets } from '@/lib/training';
import { prettyDate, todayKey } from '@/lib/dates';
import { formatWeight, kgToLb, weightUnit, weightValue } from '@/lib/units';
import { nutrientColors, radius, spacing, useTheme } from '@/theme';

export default function WorkoutDetail() {
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const units = state.settings.units;
  const w = state.workouts.find((x) => x.id === id);

  const prs = useMemo(() => (w ? prExercises(w, state.workouts.filter((x) => x.startedAt < w.startedAt)) : []), [w, state.workouts]);

  if (!w) return <Screen><EmptyState icon="barbell-outline" title="Workout not found" /></Screen>;

  const volume = workoutVolume(w);
  const stats: [string, string][] = [
    ['Time', `${durationMinutes(w)} min`],
    ['Volume', `${Math.round(units === 'us' ? kgToLb(volume) : volume).toLocaleString()} ${weightUnit(units)}`],
    ['Sets', String(doneSets(w))],
    ['Burned', `${w.calories ?? 0} kcal`],
  ];

  const repeat = () => {
    if (state.activeWorkout) return router.push('/workout');
    const next = workoutFromRoutine(routineFromWorkout(w, 'tmp'), state.workouts, uid(), todayKey());
    dispatch({ type: 'setActiveWorkout', workout: next });
    router.replace('/workout');
  };

  return (
    <Screen>
      <FadeIn>
        <LinearGradient colors={[colors.hero[0], colors.hero[2]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md }}>
          {fresh ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Ionicons name="trophy" size={18} color="#FFD66B" />
              <T size={13} weight="800" color="#FFD66B">
                {prs.length ? `Workout done · ${prs.length} new PR${prs.length > 1 ? 's' : ''}` : 'Workout done · nice work'}
              </T>
            </View>
          ) : null}
          <T size={24} weight="800" color="#fff">{w.name}</T>
          <T size={13} color="rgba(255,255,255,0.75)">{prettyDate(w.date)}</T>
          <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
            {stats.map(([l, v]) => (
              <View key={l} style={{ flex: 1 }}>
                <T size={11} weight="700" color="rgba(255,255,255,0.65)">{l.toUpperCase()}</T>
                <T size={15} weight="800" color="#fff" numberOfLines={1}>{v}</T>
              </View>
            ))}
          </View>
        </LinearGradient>
      </FadeIn>

      {w.exercises.map((e, i) => {
        const x = findExercise(e.exerciseId, state.customExercises);
        const best = e.sets.reduce((b, s) => (oneRepMax(s.kg, s.reps) > oneRepMax(b.kg, b.reps) ? s : b), e.sets[0]);
        return (
          <FadeIn key={e.exerciseId + i} delay={60 + i * 40}>
            <Card style={{ padding: spacing.md, marginBottom: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <T weight="800" style={{ flex: 1 }} numberOfLines={1}>{x?.name ?? 'Exercise'}</T>
                {prs.includes(e.exerciseId) && <Badge label="PR" icon="trophy" color={nutrientColors.carbs} solid />}
              </View>
              {e.sets.map((s, si) => (
                <View key={si} style={{ flexDirection: 'row', paddingVertical: 3 }}>
                  <T size={13} muted weight="700" style={{ width: 26 }}>{si + 1}</T>
                  <T size={14} weight={s === best ? '800' : '500'} style={{ flex: 1 }}>
                    {x?.bodyweight || !s.kg ? `${s.reps} reps` : `${+weightValue(s.kg, units).toFixed(1)} ${weightUnit(units)} × ${s.reps}`}
                  </T>
                  {s.kg > 0 && s.reps > 1 && (
                    <T size={12} muted>e1RM {formatWeight(oneRepMax(s.kg, s.reps), units, 0)}</T>
                  )}
                </View>
              ))}
            </Card>
          </FadeIn>
        );
      })}

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        <Button title="Repeat" icon="refresh" onPress={repeat} style={{ flex: 1 }} small />
        <Button
          title={saved ? 'Saved' : 'Save routine'}
          icon={saved ? 'checkmark' : 'bookmark-outline'}
          variant="secondary"
          disabled={saved}
          onPress={() => {
            dispatch({ type: 'saveRoutine', routine: routineFromWorkout(w, uid()) });
            setSaved(true);
          }}
          style={{ flex: 1 }}
          small
        />
      </View>
      <Button
        title={confirmDelete ? 'Tap again to delete' : 'Delete workout'}
        variant={confirmDelete ? 'danger' : 'ghost'}
        style={{ marginTop: spacing.sm }}
        onPress={() => {
          if (!confirmDelete) return setConfirmDelete(true);
          dispatch({ type: 'deleteWorkout', id: w.id });
          router.back();
        }}
      />
      {fresh ? <Button title="Done" variant="secondary" onPress={() => router.back()} /> : null}
    </Screen>
  );
}
