import React from 'react';
import { Alert, Share, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, ListRow, Screen, Segmented, T } from '@/components/ui';
import { useStore } from '@/store/StoreProvider';
import { ACTIVITY_LEVELS } from '@/lib/nutrition';
import { formatHeight, formatWater, formatWeight } from '@/lib/units';
import { scheduleReminders } from '@/lib/reminders';
import { spacing, useTheme } from '@/theme';
import type { ThemePref, UnitSystem } from '@/lib/types';

export default function ProfileScreen() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const p = state.profile!;
  const g = state.goals!;
  const units = state.settings.units;
  const r = state.settings.reminders;

  const goalText = p.goal === 'maintain' ? 'Maintain weight' : `${p.goal === 'lose' ? 'Lose' : 'Gain'} ${formatWeight(p.weeklyRateKg, units)} / week`;

  return (
    <Screen topInset>
      <T size={28} weight="800" style={{ marginBottom: spacing.lg }}>Me</T>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="person" size={28} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <T size={18} weight="800">{goalText}</T>
            <T muted size={13}>
              {p.age} yrs · {formatHeight(p.heightCm, units)} · {formatWeight(p.weightKg, units)}
            </T>
            <T muted size={13}>{ACTIVITY_LEVELS.find((a) => a.key === p.activity)?.label}</T>
          </View>
        </View>
        <ListRow icon="refresh" title="Recalculate my plan" subtitle="Update age, height, activity or goal" onPress={() => router.push('/onboarding')} />
      </Card>

      <Card>
        <ListRow
          icon="flag-outline"
          title="Daily goals"
          subtitle={`${g.calories} kcal · P ${g.protein} g · C ${g.carbs} g · F ${g.fat} g · ${formatWater(g.waterMl, units)}`}
          onPress={() => router.push('/goals')}
          right={<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
        />
        <ListRow
          icon="notifications-outline"
          title="Reminders"
          subtitle={[r.meals && 'Meals', r.water && 'Water'].filter(Boolean).join(' & ') || 'Off'}
          onPress={() => router.push('/reminders')}
          right={<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
        />
      </Card>

      <Card>
        <T weight="700" style={{ marginBottom: spacing.sm }}>Units</T>
        <Segmented<UnitSystem>
          value={units}
          onChange={(u) => dispatch({ type: 'updateSettings', settings: { units: u } })}
          options={[
            { key: 'us', label: 'US (lb, fl oz)' },
            { key: 'metric', label: 'Metric (kg, ml)' },
          ]}
          style={{ marginBottom: spacing.lg }}
        />
        <T weight="700" style={{ marginBottom: spacing.sm }}>Appearance</T>
        <Segmented<ThemePref>
          value={state.settings.theme}
          onChange={(t) => dispatch({ type: 'updateSettings', settings: { theme: t } })}
          options={[
            { key: 'system', label: 'Auto' },
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
          ]}
        />
      </Card>

      <Card>
        <ListRow
          icon="share-outline"
          title="Export my data"
          subtitle="Share a JSON backup of everything you’ve logged"
          onPress={() => Share.share({ message: JSON.stringify(state) }).catch(() => {})}
        />
        <ListRow
          icon="trash-outline"
          title="Erase all data"
          subtitle="Start over from onboarding"
          onPress={() =>
            Alert.alert('Erase everything?', 'This deletes all logs, foods and goals from this phone. It can’t be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Erase',
                style: 'destructive',
                onPress: () => {
                  scheduleReminders({ ...r, meals: false, water: false }).catch(() => {});
                  dispatch({ type: 'reset' });
                  router.replace('/onboarding');
                },
              },
            ])
          }
        />
      </Card>

      <T muted size={12} center style={{ marginTop: spacing.md }}>
        Fitness Buddy stores everything on this phone only. Packaged food data comes from Open Food Facts (openfoodfacts.org), shared under the ODbL.
      </T>
    </Screen>
  );
}
