import React, { useEffect, useState } from 'react';
import { Linking, Share, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Badge, Button, Card, Field, ListRow, Screen, Segmented, Sheet, T } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { useStore } from '@/store/StoreProvider';
import { ACTIVITY_LEVELS } from '@/lib/nutrition';
import { formatHeight, formatWeight } from '@/lib/units';
import { scheduleReminders } from '@/lib/reminders';
import { getApiKey, maskKey, setApiKey } from '@/lib/secrets';
import { spacing, useTheme } from '@/theme';
import type { ThemePref, UnitSystem } from '@/lib/types';

const chevron = (color: string) => <Ionicons name="chevron-forward" size={18} color={color} />;

export default function ProfileScreen() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const p = state.profile!;
  const g = state.goals!;
  const units = state.settings.units;
  const r = state.settings.reminders;

  const [name, setName] = useState(p.name ?? '');
  const [key, setKey] = useState<string | null>(null);
  const [keyDraft, setKeyDraft] = useState('');
  const [editingKey, setEditingKey] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);

  useEffect(() => {
    getApiKey().then(setKey);
  }, []);

  const goalText = p.goal === 'maintain' ? 'Maintain weight' : `${p.goal === 'lose' ? 'Lose' : 'Gain'} ${formatWeight(p.weeklyRateKg, units)} / week`;

  const saveKey = async () => {
    await setApiKey(keyDraft);
    setKey(keyDraft.trim() || null);
    setKeyDraft('');
    setEditingKey(false);
  };

  return (
    <Screen>
      <FadeIn>
        <LinearGradient colors={colors.hero} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 24, padding: spacing.lg, marginBottom: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
              <T size={24} weight="800" color="#fff">{(p.name || 'You').charAt(0).toUpperCase()}</T>
            </View>
            <View style={{ flex: 1 }}>
              <T size={20} weight="800" color="#fff">{p.name || 'Your profile'}</T>
              <T size={13} color="rgba(255,255,255,0.75)">
                {goalText} · {formatWeight(p.weightKg, units)}
              </T>
              <T size={13} color="rgba(255,255,255,0.75)">
                {p.age} yrs · {formatHeight(p.heightCm, units)} · {ACTIVITY_LEVELS.find((a) => a.key === p.activity)?.label}
              </T>
            </View>
          </View>
        </LinearGradient>
      </FadeIn>

      <Card>
        <Field
          label="Your first name"
          value={name}
          onChangeText={setName}
          onBlur={() => dispatch({ type: 'setName', name })}
          onSubmitEditing={() => dispatch({ type: 'setName', name })}
          placeholder="Used in your greeting"
          autoCapitalize="words"
          returnKeyType="done"
        />
        <ListRow icon="refresh" title="Recalculate my plan" subtitle="Update age, height, activity or goal" onPress={() => router.push('/onboarding')} right={chevron(colors.textMuted)} />
        <ListRow
          icon="flag-outline"
          title="Daily goals"
          subtitle={`${g.calories} kcal · protein ${g.protein} g · carbs ${g.carbs} g · fat ${g.fat} g`}
          onPress={() => router.push('/goals')}
          right={chevron(colors.textMuted)}
        />
        <ListRow icon="bookmark-outline" title="My foods & meals" subtitle="Saved meals, recipes, favorites and custom foods" onPress={() => router.push('/my-foods')} right={chevron(colors.textMuted)} />
        <ListRow
          icon="notifications-outline"
          title="Reminders"
          subtitle={[r.meals && 'Meals', r.water && 'Water'].filter(Boolean).join(' & ') || 'Off'}
          onPress={() => router.push('/reminders')}
          right={chevron(colors.textMuted)}
        />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
          <T weight="800" style={{ flex: 1 }}>AI Coach & meal photos</T>
          <Badge label={key ? 'CONNECTED' : 'NEEDS KEY'} color={key ? colors.primary : colors.warning} />
        </View>
        <T size={14} muted style={{ marginBottom: spacing.md }}>
          Coach chat and snap-a-meal estimates run on Claude. They need your own Claude API key from console.anthropic.com (usage is billed to that account). The key is kept in this phone’s secure storage and only sent to Anthropic.
        </T>
        {key && !editingKey ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <T weight="700" style={{ flex: 1 }}>{maskKey(key)}</T>
            <Button small variant="secondary" title="Change" onPress={() => setEditingKey(true)} />
            <Button
              small
              variant="ghost"
              title="Remove"
              onPress={async () => {
                await setApiKey(null);
                setKey(null);
              }}
            />
          </View>
        ) : (
          <>
            <Field value={keyDraft} onChangeText={setKeyDraft} placeholder="sk-ant-…" autoCapitalize="none" autoCorrect={false} secureTextEntry />
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <Button title="Save key" icon="lock-closed" onPress={saveKey} disabled={!keyDraft.trim()} style={{ flex: 1 }} />
              <Button title="Get a key" variant="secondary" onPress={() => Linking.openURL('https://console.anthropic.com/settings/keys')} />
            </View>
          </>
        )}
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
        <ListRow icon="trash-outline" title="Erase all data" subtitle="Start over from onboarding" onPress={() => setConfirmErase(true)} />
      </Card>

      <T muted size={12} center style={{ marginTop: spacing.md }}>
        Fitness Buddy stores your logs on this phone only. Food data comes from USDA FoodData Central and Open Food Facts (openfoodfacts.org, ODbL).
      </T>

      <Sheet visible={confirmErase} onClose={() => setConfirmErase(false)} title="Erase everything?">
        <T muted style={{ marginBottom: spacing.lg }}>This deletes all logs, foods, chats and goals from this phone. It can’t be undone.</T>
        <Button
          title="Erase all data"
          variant="danger"
          onPress={() => {
            setConfirmErase(false);
            scheduleReminders({ ...r, meals: false, water: false }).catch(() => {});
            dispatch({ type: 'reset' });
            router.replace('/onboarding');
          }}
        />
        <Button title="Cancel" variant="ghost" style={{ marginTop: spacing.sm }} onPress={() => setConfirmErase(false)} />
      </Sheet>
    </Screen>
  );
}
