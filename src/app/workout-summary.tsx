import React, { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, EmptyState, T } from '@/components/ui';
import { CompareCard, ExerciseResults, MusclesWorked, WorkoutHero } from '@/components/workout/Summary';
import { useStore } from '@/store/StoreProvider';
import { prExercises } from '@/lib/training';
import { workoutXp } from '@/lib/progression';
import { backToTrain } from '@/lib/useStartWorkout';
import { previousSameWorkout, workoutMuscleRegions } from '@/lib/workoutSummary';
import { spacing, useTheme } from '@/theme';

/** Shown right after finishing: what you did, what it hit, and how it compares. */
export default function WorkoutSummary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const w = state.workouts.find((x) => x.id === id);

  const info = useMemo(() => {
    if (!w) return null;
    const earlier = state.workouts.filter((x) => x.startedAt < w.startedAt);
    return {
      prs: prExercises(w, earlier),
      xp: workoutXp(w, earlier),
      prev: previousSameWorkout(w, state.workouts),
      muscles: workoutMuscleRegions(w, state.customExercises),
    };
  }, [w, state.workouts, state.customExercises]);

  if (!w || !info) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + spacing.xl, padding: spacing.lg }}>
        <EmptyState icon="barbell-outline" title="Workout not found" />
        <Button title="Done" variant="secondary" onPress={backToTrain} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <WorkoutHero w={w} fresh prCount={info.prs.length} xp={info.xp} />
        <CompareCard w={w} prev={info.prev} />
        <MusclesWorked primary={info.muscles.primary} secondary={info.muscles.secondary} />
        <ExerciseResults w={w} prs={info.prs} />
        <T size={12} muted center style={{ marginTop: spacing.sm }}>Saved to your history. Tap an exercise for its details.</T>
      </ScrollView>
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border }}>
        <Button title="Done" icon="checkmark" onPress={backToTrain} />
      </View>
    </View>
  );
}
