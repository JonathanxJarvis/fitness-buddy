import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Field, Screen, T } from '@/components/ui';
import { useStore } from '@/store/StoreProvider';
import { calculateGoals, proteinTarget } from '@/lib/nutrition';
import { spacing, useTheme } from '@/theme';
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
    { key: 'steps', label: 'Steps', unit: 'steps' },
    { key: 'fiber', label: 'Fiber', unit: 'g' },
  ],
  [
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
  const { colors } = useTheme();
  const keys = ROWS.flat().map((f) => f.key);
  const toInput = (g: Goals) => Object.fromEntries(keys.map((k) => [k, String(g[k] ?? 0)])) as Record<Key, string>;
  const perLb = state.profile ? proteinTarget(state.profile.weightKg) : null;
  const [values, setValues] = useState(() => toInput(state.goals!));

  const parsed = keys.reduce((acc, k) => {
    acc[k] = parseFloat(values[k]);
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
                  suffix={f.unit === 'steps' ? '' : f.unit}
                />
              ))}
            </View>
          ))}
          {perLb !== null && (
            <T size={13} muted style={{ marginBottom: 6 }}>
              Protein target: 1 g per lb of body weight is {perLb} g.{' '}
              {String(perLb) !== values.protein && (
                <T size={13} weight="700" color={colors.primary} onPress={() => setValues((v) => ({ ...v, protein: String(perLb) }))}>
                  Use {perLb} g
                </T>
              )}
            </T>
          )}
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
