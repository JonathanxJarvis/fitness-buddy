import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Field, Screen, T } from '@/components/ui';
import { useStore } from '@/store/StoreProvider';
import { calculateGoals } from '@/lib/nutrition';
import { flOzToMl, mlToFlOz } from '@/lib/units';
import { spacing } from '@/theme';
import type { Goals } from '@/lib/types';

type Key = keyof Goals;

const ROWS: { key: Key; label: string; unit: string }[][] = [
  [{ key: 'calories', label: 'Calories', unit: 'kcal' }],
  [
    { key: 'protein', label: 'Protein', unit: 'g' },
    { key: 'carbs', label: 'Carbs', unit: 'g' },
    { key: 'fat', label: 'Fat', unit: 'g' },
  ],
  [
    { key: 'waterMl', label: 'Water', unit: 'water' },
    { key: 'steps', label: 'Steps', unit: 'steps' },
  ],
  [
    { key: 'fiber', label: 'Fiber', unit: 'g' },
    { key: 'sugar', label: 'Sugar (max)', unit: 'g' },
    { key: 'sodium', label: 'Sodium (max)', unit: 'mg' },
  ],
  [
    { key: 'potassium', label: 'Potassium', unit: 'mg' },
    { key: 'calcium', label: 'Calcium', unit: 'mg' },
  ],
  [
    { key: 'iron', label: 'Iron', unit: 'mg' },
    { key: 'vitaminC', label: 'Vitamin C', unit: 'mg' },
    { key: 'vitaminD', label: 'Vitamin D', unit: 'µg' },
  ],
];

export default function GoalsScreen() {
  const { state, dispatch } = useStore();
  const us = state.settings.units === 'us';
  const toInput = (g: Goals) =>
    Object.fromEntries(
      (Object.keys(g) as Key[]).map((k) => [k, String(k === 'waterMl' && us ? Math.round(mlToFlOz(g[k])) : g[k])]),
    ) as Record<Key, string>;
  const [values, setValues] = useState(() => toInput(state.goals!));

  const parsed = (Object.keys(values) as Key[]).reduce((acc, k) => {
    const n = parseFloat(values[k]);
    acc[k] = k === 'waterMl' && us ? flOzToMl(n) : n;
    return acc;
  }, {} as Goals);
  const valid = Object.values(parsed).every((n) => Number.isFinite(n) && n >= 0) && parsed.calories > 0;
  const macroCals = parsed.protein * 4 + parsed.carbs * 4 + parsed.fat * 9;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Card>
          {ROWS.map((row, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: spacing.sm }}>
              {row.map((f) => (
                <Field
                  key={f.key}
                  style={{ flex: 1 }}
                  label={f.label}
                  value={values[f.key]}
                  onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t }))}
                  keyboardType="decimal-pad"
                  suffix={f.unit === 'water' ? (us ? 'fl oz' : 'ml') : f.unit === 'steps' ? '' : f.unit}
                />
              ))}
            </View>
          ))}
          <T muted size={13}>
            Macros add up to {Math.round(macroCals) || 0} kcal
            {Math.abs(macroCals - parsed.calories) > 50 ? ` (your calorie goal is ${Math.round(parsed.calories) || 0})` : ''}.
          </T>
        </Card>
        <Button
          title="Save goals"
          icon="checkmark"
          disabled={!valid}
          onPress={() => {
            dispatch({ type: 'updateGoals', goals: parsed });
            router.back();
          }}
        />
        <Button
          title="Reset to recommended"
          variant="ghost"
          style={{ marginTop: spacing.sm }}
          onPress={() => state.profile && setValues(toInput(calculateGoals(state.profile)))}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}
