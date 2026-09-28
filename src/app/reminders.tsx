import React, { useState } from 'react';
import { Alert, Switch, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Chip, Field, Screen, T } from '@/components/ui';
import { useStore } from '@/store/StoreProvider';
import { scheduleReminders } from '@/lib/reminders';
import { formatClock, parseTime } from '@/lib/dates';
import { spacing, useTheme } from '@/theme';
import type { ReminderSettings } from '@/lib/types';

export default function RemindersScreen() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const [r, setR] = useState<ReminderSettings>(state.settings.reminders);
  const [saving, setSaving] = useState(false);
  const set = (patch: Partial<ReminderSettings>) => setR((prev) => ({ ...prev, ...patch }));

  const timesValid = !r.meals || (['breakfast', 'lunch', 'dinner'] as const).every((m) => parseTime(r.mealTimes[m]));
  const waterCount = r.water ? Math.floor((r.waterEndHour - r.waterStartHour) / r.waterEveryHours) + 1 : 0;

  const save = async () => {
    setSaving(true);
    try {
      const count = await scheduleReminders(r);
      dispatch({ type: 'updateSettings', settings: { reminders: r } });
      if ((r.meals || r.water) && count === 0) {
        Alert.alert('Notifications are off', 'Allow notifications for Fitness Buddy in your phone’s Settings to get reminders.');
      } else {
        router.back();
      }
    } catch (e) {
      Alert.alert('Couldn’t schedule reminders', String(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleRow = (title: string, subtitle: string, value: boolean, onChange: (v: boolean) => void) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flex: 1 }}>
        <T weight="700" size={16}>{title}</T>
        <T muted size={13}>{subtitle}</T>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.track }} />
    </View>
  );

  return (
    <Screen>
      <Card>
        {toggleRow('Meal reminders', 'A nudge to log breakfast, lunch and dinner', r.meals, (v) => set({ meals: v }))}
        {r.meals && (
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
            {(['breakfast', 'lunch', 'dinner'] as const).map((m) => (
              <Field
                key={m}
                style={{ flex: 1 }}
                label={m[0].toUpperCase() + m.slice(1)}
                value={r.mealTimes[m]}
                onChangeText={(t) => set({ mealTimes: { ...r.mealTimes, [m]: t } })}
                placeholder="HH:MM"
                keyboardType="numbers-and-punctuation"
              />
            ))}
          </View>
        )}
        {r.meals && <T muted size={12}>Use 24-hour time, for example 18:30.</T>}
      </Card>

      <Card>
        {toggleRow('Water reminders', 'Regular prompts to drink a glass', r.water, (v) => set({ water: v }))}
        {r.water && (
          <>
            <T weight="600" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Every</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {[1, 2, 3].map((h) => (
                <Chip key={h} label={`${h} hour${h > 1 ? 's' : ''}`} active={r.waterEveryHours === h} onPress={() => set({ waterEveryHours: h })} />
              ))}
            </View>
            <T weight="600" style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>Starting</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {[7, 8, 9, 10].map((h) => (
                <Chip key={h} label={formatClock(h, 30)} active={r.waterStartHour === h} onPress={() => set({ waterStartHour: h })} />
              ))}
            </View>
            <T weight="600" style={{ marginTop: spacing.sm, marginBottom: spacing.sm }}>Until</T>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {[18, 19, 20, 21].map((h) => (
                <Chip key={h} label={formatClock(h, 30)} active={r.waterEndHour === h} onPress={() => set({ waterEndHour: h })} />
              ))}
            </View>
            <T muted size={12}>{waterCount} water reminders a day.</T>
          </>
        )}
      </Card>

      <Button title="Save reminders" icon="notifications" loading={saving} disabled={!timesValid} onPress={save} />
      {!timesValid && <T size={13} color={colors.danger} center style={{ marginTop: spacing.sm }}>Check the meal times (HH:MM).</T>}
    </Screen>
  );
}
