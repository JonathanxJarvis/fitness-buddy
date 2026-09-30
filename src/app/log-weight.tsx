import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Card, Field, IconButton, ListRow, Screen, T } from '@/components/ui';
import { useStore } from '@/store/StoreProvider';
import { prettyDate, todayKey } from '@/lib/dates';
import { formatWeight, weightToKg, weightUnit, weightValue } from '@/lib/units';
import { spacing, useTheme } from '@/theme';

export default function LogWeight() {
  const { date = todayKey() } = useLocalSearchParams<{ date?: string }>();
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const units = state.settings.units;
  const existing = state.weights[date];
  const fallback = existing ?? state.profile?.weightKg;
  const [value, setValue] = useState(fallback ? weightValue(fallback, units).toFixed(1) : '');
  const n = parseFloat(value.replace(',', '.'));
  const valid = Number.isFinite(n) && n > 20;

  const history = Object.entries(state.weights).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 10);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <Card>
          <T muted style={{ marginBottom: spacing.sm }}>{prettyDate(date)}</T>
          <Field value={value} onChangeText={setValue} keyboardType="decimal-pad" suffix={weightUnit(units)} autoFocus />
          <Button
            title={existing ? 'Update weight' : 'Save weight'}
            icon="checkmark"
            disabled={!valid}
            onPress={() => {
              dispatch({ type: 'setWeight', date, kg: weightToKg(n, units) });
              router.back();
            }}
          />
        </Card>
        {history.length > 0 && (
          <Card>
            <T weight="700" style={{ marginBottom: spacing.sm }}>Recent weigh-ins</T>
            {history.map(([d, kg]) => (
              <ListRow
                key={d}
                title={formatWeight(kg, units)}
                subtitle={prettyDate(d)}
                right={<IconButton label="Delete weigh-in" icon="trash-outline" color={colors.textMuted} onPress={() => dispatch({ type: 'deleteWeight', date: d })} />}
              />
            ))}
          </Card>
        )}
      </Screen>
    </KeyboardAvoidingView>
  );
}
