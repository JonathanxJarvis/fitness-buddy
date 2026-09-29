import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Share, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Badge, Button, Card, Field, ListRow, Screen, Segmented, Sheet, T } from '@/components/ui';
import { FadeIn, PressScale } from '@/components/motion';
import { Avatar } from '@/components/Avatar';
import { AvatarEditor } from '@/components/people/AvatarEditor';
import { avatarFor } from '@/components/people/avatarConfig';
import { pickProfilePhoto } from '@/components/people/photo';
import { stateProgression } from '@/lib/progression';
import { todayKey } from '@/lib/dates';
import { useStore } from '@/store/StoreProvider';
import { ACTIVITY_LEVELS } from '@/lib/nutrition';
import { formatHeight, formatWeight } from '@/lib/units';
import { scheduleReminders } from '@/lib/reminders';
import { getApiKey, maskKey, setApiKey } from '@/lib/secrets';
import { hasBuiltInAi } from '@/lib/ai';
import { isPro, mascotSkin, petName, petSpecies, PREVIEW } from '@/lib/pro';
import { Kettle, type Species } from '@/components/Mascot';
import { HealthRow } from '@/components/HealthRow';
import { AccentChoice, LookChoice, TrainingChoice } from '@/components/personalize/Personalize';
import { planRoutineChanges, restForGoal } from '@/lib/trainingPrefs';
import { spacing, useTheme } from '@/theme';
import type { AvatarConfig, FoodRegion, ThemePref, TrainingPrefs, UnitSystem } from '@/lib/types';

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
  const [pictureOpen, setPictureOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<AvatarConfig | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const pro = isPro(state);
  const mascotOn = state.settings.mascot !== false;
  const skin = mascotSkin(state);
  const stage = stateProgression(state, todayKey()).stage.index;
  const me = { name: p.name || 'Lifter', avatar: state.settings.avatar, photo: state.settings.photo };
  const training = state.settings.training ?? {};
  const planChanges = planRoutineChanges(state, training);
  const planOutdated = planChanges.save.length + planChanges.remove.length > 0;
  const [planUpdated, setPlanUpdated] = useState(false);

  const setTraining = (next: TrainingPrefs, part: string) => {
    dispatch({ type: 'updateSettings', settings: { training: next } });
    const rest = part === 'goal' ? restForGoal(next.goal) : undefined;
    if (rest) dispatch({ type: 'setRestSeconds', seconds: rest });
    setPlanUpdated(false);
  };
  const updatePlanWorkouts = () => {
    for (const routine of planChanges.save) dispatch({ type: 'saveRoutine', routine });
    for (const id of planChanges.remove) dispatch({ type: 'deleteRoutine', id });
    setPlanUpdated(true);
  };

  const choosePhoto = async () => {
    setPhotoError(null);
    try {
      const photo = await pickProfilePhoto();
      if (photo) {
        dispatch({ type: 'updateSettings', settings: { photo } });
        setPictureOpen(false);
      }
    } catch (e) {
      setPhotoError((e as Error).message);
    }
  };
  const openEditor = () => {
    setDraft(avatarFor(me));
    setPictureOpen(false);
    setEditorOpen(true);
  };
  const saveAvatar = () => {
    if (draft) dispatch({ type: 'updateSettings', settings: { avatar: draft, photo: undefined } });
    setEditorOpen(false);
  };

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
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <PressScale onPress={() => setPictureOpen(true)} accessibilityLabel="Change profile picture">
            <Avatar person={me} stage={stage} size={76} frame="compact" pet={state.settings.pet ?? 'kettle'} skin={skin} petBadge={false} />
            <View style={{ position: 'absolute', right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.ink, borderWidth: 2, borderColor: colors.card, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="camera" size={13} color={colors.onInk} />
            </View>
          </PressScale>
          <View style={{ flex: 1 }}>
            <T size={20} weight="800">{p.name || 'Your profile'}</T>
            <T size={13} muted>
              {goalText} · {formatWeight(p.weightKg, units)}
            </T>
            <T size={13} muted>
              {p.age} yrs · {formatHeight(p.heightCm, units)} · {ACTIVITY_LEVELS.find((a) => a.key === p.activity)?.label}
            </T>
          </View>
        </Card>
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
          icon="play-skip-back-outline"
          title="Redo onboarding"
          subtitle="All the questions again, logs kept"
          onPress={() => router.push({ pathname: '/onboarding', params: { fresh: '1' } })}
          right={chevron(colors.textMuted)}
        />
        <ListRow
          icon="flag-outline"
          title="Daily goals"
          subtitle={`${g.calories} kcal · protein ${g.protein} g · carbs ${g.carbs} g · fat ${g.fat} g`}
          onPress={() => router.push('/goals')}
          right={chevron(colors.textMuted)}
        />
        <ListRow icon="stats-chart-outline" title="Progress" subtitle="Weight, calories and training over time" onPress={() => router.push('/progress')} right={chevron(colors.textMuted)} />
        <ListRow icon="bookmark-outline" title="My foods & meals" subtitle="Saved meals, recipes, favorites and custom foods" onPress={() => router.push('/my-foods')} right={chevron(colors.textMuted)} />
        <ListRow
          icon="notifications-outline"
          title="Reminders"
          subtitle={[r.meals && 'Meals', r.water && 'Water'].filter(Boolean).join(' & ') || 'Off'}
          onPress={() => router.push('/reminders')}
          right={chevron(colors.textMuted)}
        />
        <HealthRow />
      </Card>

      <Card>
        <ListRow
          icon={pro ? 'diamond' : 'diamond-outline'}
          title={pro ? (PREVIEW ? 'Pro · unlocked in preview' : 'Fitness Buddy Pro') : 'Upgrade to Pro'}
          subtitle={pro ? 'AI coach, snap a meal, unlimited friends, Pro pets' : 'Subscribe for the full experience'}
          onPress={() => router.push('/pro')}
          right={pro ? <Badge label="PRO" color={colors.primary} /> : chevron(colors.textMuted)}
        />
      </Card>

      <Card>
        <Pressable onPress={() => router.push('/pets')} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <Kettle species={petSpecies(state) as Species} size={54} mood={mascotOn ? 'happy' : 'sleepy'} skin={skin} animate={mascotOn} />
          <View style={{ flex: 1 }}>
            <T weight="800">{petName(state)}, your gym buddy</T>
            <T size={13} muted>Change pet, name and outfit</T>
          </View>
          {chevron(colors.textMuted)}
        </Pressable>
      </Card>

      {pro && !PREVIEW && (
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Ionicons name="sparkles" size={18} color={colors.primary} />
          <T weight="800" style={{ flex: 1 }}>AI server (Pro)</T>
          <Badge label={key ? 'YOUR KEY' : hasBuiltInAi ? 'READY' : 'NOT SET UP'} color={key || hasBuiltInAi ? colors.primary : colors.warning} />
        </View>
        <T size={14} muted style={{ marginBottom: spacing.md }}>
          {hasBuiltInAi
            ? 'Coach chat and snap-a-meal estimates are built in, powered by Claude. No key needed. Power users can add their own Claude API key below to use their own account instead.'
            : 'Coach chat and snap-a-meal estimates run on Claude. This build has no AI server yet, so add a Claude API key from console.anthropic.com to use them. The key is kept in this phone’s secure storage and only sent to Anthropic.'}
        </T>
        {hasBuiltInAi && !key && !editingKey ? (
          <Button small variant="secondary" title="Use my own key instead" icon="key-outline" onPress={() => setEditingKey(true)} style={{ alignSelf: 'flex-start' }} />
        ) : key && !editingKey ? (
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
      )}

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
        <T weight="700" style={{ marginBottom: spacing.sm }}>Food database</T>
        <Segmented<FoodRegion>
          value={state.settings.foodRegion}
          onChange={(r) => dispatch({ type: 'updateSettings', settings: { foodRegion: r } })}
          options={[
            { key: 'de', label: 'Germany' },
            { key: 'us', label: 'USA' },
            { key: 'world', label: 'Worldwide' },
          ]}
          style={{ marginBottom: 6 }}
        />
        <T size={12} muted>Which country’s supermarket products show first in search. Barcode scans work for every country.</T>
      </Card>

      <Card>
        <T weight="800" size={17} style={{ marginBottom: spacing.md }}>Personalize</T>
        <T weight="700" style={{ marginBottom: spacing.sm }}>Look</T>
        <LookChoice look={state.settings.look ?? 'colorful'} accent={state.settings.accent ?? 'emerald'} onChange={(l) => dispatch({ type: 'updateSettings', settings: { look: l } })} />
        <T weight="700" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Accent color</T>
        <AccentChoice accent={state.settings.accent ?? 'emerald'} onChange={(a) => dispatch({ type: 'updateSettings', settings: { accent: a } })} />
        <T weight="700" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>Appearance</T>
        <Segmented<ThemePref>
          value={state.settings.theme}
          onChange={(t) => dispatch({ type: 'updateSettings', settings: { theme: t } })}
          options={[
            { key: 'system', label: 'Auto' },
            { key: 'light', label: 'Light' },
            { key: 'dark', label: 'Dark' },
          ]}
        />
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.lg }} />
        <T weight="700" style={{ marginBottom: spacing.sm }}>Training</T>
        <TrainingChoice value={training} onChange={setTraining} />
        {state.plan && (planOutdated || planUpdated) ? (
          <View style={{ marginTop: spacing.lg }}>
            <Button
              small
              variant="secondary"
              icon={planUpdated ? 'checkmark' : 'barbell-outline'}
              title={planUpdated ? 'Plan workouts updated' : 'Update my plan workouts'}
              onPress={updatePlanWorkouts}
              disabled={planUpdated}
              style={{ alignSelf: 'flex-start' }}
            />
            <T size={12} muted style={{ marginTop: 6 }}>
              {planUpdated ? 'Exercises, sets and reps now match your choices.' : 'Swaps exercises, sets and reps to fit. Workouts you built yourself stay as they are.'}
            </T>
          </View>
        ) : null}
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

      <Sheet visible={pictureOpen} onClose={() => setPictureOpen(false)} title="Profile picture">
        <View style={{ alignItems: 'center', marginBottom: spacing.lg }}>
          <Avatar person={me} stage={stage} size={132} frame="ornate" pet={state.settings.pet ?? 'kettle'} skin={skin} />
          <T size={12} muted center style={{ marginTop: spacing.xs }}>
            Your picture sits in your rank frame. Photos stay on this phone; friends see your illustrated avatar.
          </T>
        </View>
        <Button title="Choose a photo" icon="image-outline" onPress={choosePhoto} />
        <Button title="Design my avatar" variant="secondary" icon="brush-outline" onPress={openEditor} style={{ marginTop: spacing.sm }} />
        {state.settings.photo ? (
          <Button title="Remove photo" variant="ghost" onPress={() => dispatch({ type: 'updateSettings', settings: { photo: undefined } })} style={{ marginTop: spacing.sm }} />
        ) : null}
        {photoError && <T size={13} color={colors.danger} center style={{ marginTop: spacing.sm }}>{photoError}</T>}
      </Sheet>

      <Sheet visible={editorOpen} onClose={() => setEditorOpen(false)} title="Your avatar">
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
          {draft && <AvatarEditor value={draft} onChange={setDraft} />}
          <View style={{ height: spacing.lg }} />
        </ScrollView>
        <Button title="Save avatar" onPress={saveAvatar} style={{ marginTop: spacing.sm }} />
      </Sheet>

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
