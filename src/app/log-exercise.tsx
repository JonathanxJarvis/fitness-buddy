import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Chip, Field, Screen, T } from '@/components/ui';
import { useStore } from '@/store/StoreProvider';
import { uid } from '@/store/reducer';
import { EXERCISES, exerciseCalories, stepCalories } from '@/lib/nutrition';
import { prettyDate, todayKey } from '@/lib/dates';
import { spacing } from '@/theme';

export default function LogExercise() {
  const { date = todayKey() } = useLocalSearchParams<{ date?: string }>();
  const { state, dispatch } = useStore();
  const weightKg = state.profile?.weightKg ?? 70;

  const [steps, setSteps] = useState(String(state.steps[date] ?? ''));
  const [type, setType] = useState(EXERCISES[0].name);
  const [custom, setCustom] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [calOverride, setCalOverride] = useState('');

  const met = EXERCISES.find((e) => e.name === type)?.met ?? 5;
  const mins = parseInt(minutes, 10) || 0;
  const estimate = exerciseCalories(met, weightKg, mins);
  const calories = calOverride ? parseInt(calOverride, 10) || 0 : estimate;
  const stepsNum = parseInt(steps, 10);

  const saveSteps = () => {
    if (Number.isFinite(stepsNum)) dispatch({ type: 'setSteps', date, steps: stepsNum });
    router.back();
  };

  const saveExercise = () => {
    if (mins <= 0) return;
    dispatch({
      type: 'addExercise',
      exercise: { id: uid(), date, name: type === 'Other' ? custom.trim() || 'Workout' : type, minutes: mins, calories },
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <T muted style={{ marginBottom: spacing.md }}>{prettyDate(date)}</T>
        <Card>
          <T weight="700" size={16} style={{ marginBottom: spacing.sm }}>Steps</T>
          <T muted size={13} style={{ marginBottom: spacing.md }}>
            Steps sync automatically from your phone while the app is open. You can also enter them by hand.
          </T>
          <Field value={steps} onChangeText={setSteps} keyboardType="number-pad" placeholder="0" suffix="steps" />
          {Number.isFinite(stepsNum) && stepsNum > 0 && (
            <T muted size={13} style={{ marginBottom: spacing.md }}>≈ {stepCalories(stepsNum, weightKg)} kcal from walking (not added to your budget)</T>
          )}
          <Button title="Save steps" variant="secondary" onPress={saveSteps} />
        </Card>

        <Card>
          <T weight="700" size={16} style={{ marginBottom: spacing.md }}>Workout</T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {[...EXERCISES, { name: 'Other', met: 5, icon: 'ellipsis-horizontal' }].map((e) => (
              <Chip key={e.name} label={e.name} icon={e.icon as never} active={type === e.name} onPress={() => setType(e.name)} />
            ))}
          </View>
          {type === 'Other' && <Field label="Activity name" value={custom} onChangeText={setCustom} placeholder="e.g. Rowing" />}
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm }}>
            <Field style={{ flex: 1 }} label="Duration" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" suffix="min" />
            <Field style={{ flex: 1 }} label="Calories burned" value={calOverride} onChangeText={setCalOverride} keyboardType="number-pad" placeholder={String(estimate)} suffix="kcal" />
          </View>
          <T muted size={13} style={{ marginBottom: spacing.md }}>
            Estimated from your weight and the activity’s intensity. Burned calories are added to today’s food budget.
          </T>
          <Button title="Log workout" icon="checkmark" disabled={mins <= 0} onPress={saveExercise} />
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
