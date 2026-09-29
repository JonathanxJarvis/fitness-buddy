import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, EmptyState, Screen } from '@/components/ui';
import { CompareCard, ExerciseResults, MusclesWorked, WorkoutHero } from '@/components/workout/Summary';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { prExercises, routineFromWorkout, workoutFromRoutine } from '@/lib/training';
import { previousSameWorkout, workoutMuscleRegions } from '@/lib/workoutSummary';
import { todayKey } from '@/lib/dates';
import { spacing } from '@/theme';

/** A past workout from history: the same summary as after finishing, plus repeat / save / delete. */
export default function WorkoutDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const w = state.workouts.find((x) => x.id === id);

  const info = useMemo(() => {
    if (!w) return null;
    return {
      prs: prExercises(w, state.workouts.filter((x) => x.startedAt < w.startedAt)),
      prev: previousSameWorkout(w, state.workouts),
      muscles: workoutMuscleRegions(w, state.customExercises),
    };
  }, [w, state.workouts, state.customExercises]);

  if (!w || !info) return <Screen><EmptyState icon="barbell-outline" title="Workout not found" /></Screen>;

  const repeat = () => {
    if (state.activeWorkout) return router.push('/workout');
    const next = workoutFromRoutine(routineFromWorkout(w, 'tmp'), state.workouts, uid(), todayKey());
    dispatch({ type: 'setActiveWorkout', workout: next });
    router.replace('/workout');
  };

  return (
    <Screen>
      <WorkoutHero w={w} prCount={info.prs.length} />
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md }}>
        <Button title="Repeat" icon="refresh" onPress={repeat} style={{ flex: 1 }} small />
        <Button
          title={saved ? 'Saved' : 'Save as workout'}
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
      <CompareCard w={w} prev={info.prev} />
      <MusclesWorked primary={info.muscles.primary} secondary={info.muscles.secondary} />
      <ExerciseResults w={w} prs={info.prs} showSets />
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
    </Screen>
  );
}
