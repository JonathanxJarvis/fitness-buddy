import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Badge, Card, Field, Screen, Segmented, T } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { Kettle, PETS, SKINS, type Mood, type Species } from '@/components/Mascot';
import { useStore } from '@/store/StoreProvider';
import { FREE_PETS, isPro, petSpecies } from '@/lib/pro';
import { petCare } from '@/lib/quests';
import { todayKey } from '@/lib/dates';
import { radius, spacing, useTheme } from '@/theme';

const MOODS: Mood[] = ['happy', 'pumped', 'wink', 'proud', 'hungry', 'sleepy'];

export default function PetsScreen() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const pro = isPro(state);
  const species = petSpecies(state) as Species;
  const def = PETS.find((p) => p.key === species) ?? PETS[0];
  const [name, setName] = useState(state.settings.petName ?? '');
  const [mood, setMood] = useState(0);
  const skin = pro ? state.settings.mascotSkin ?? 'classic' : 'classic';
  const care = petCare(state, todayKey());
  const on = state.settings.mascot !== false;

  const pick = (key: Species) => {
    if (!pro && !FREE_PETS.includes(key)) {
      router.push('/pro?feature=pets');
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    const current = state.settings.petName?.trim();
    const defaultNames = PETS.map((p) => p.name);
    // Keep a custom name; swap a default one for the new pet's default.
    const nextName = !current || defaultNames.includes(current) ? PETS.find((p) => p.key === key)?.name : current;
    dispatch({ type: 'updateSettings', settings: { pet: key, petName: nextName } });
    setName(nextName ?? '');
  };

  const saveName = () => dispatch({ type: 'updateSettings', settings: { petName: name.trim().slice(0, 16) || def.name } });

  return (
    <Screen>
      <FadeIn>
        <Card style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <Pressable onPress={() => setMood((m) => (m + 1) % MOODS.length)} accessibilityLabel="Tap to change mood">
            <Kettle species={species} size={140} mood={MOODS[mood]} skin={skin} animate />
          </Pressable>
          <T size={22} weight="800" style={{ marginTop: 4 }}>{state.settings.petName || def.name}</T>
          <T size={13} muted center style={{ maxWidth: 280 }}>{def.blurb}</T>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, alignSelf: 'stretch' }}>
            {[
              { label: 'Fed', v: care.fed, color: '#F08A24' },
              { label: 'Fit', v: care.fit, color: '#22B573' },
              { label: 'Hydrated', v: care.hydrated, color: '#3B9EF0' },
            ].map((b) => (
              <View key={b.label} style={{ flex: 1 }}>
                <T size={11} weight="700" muted>{b.label}</T>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden', marginTop: 3 }}>
                  <View style={{ width: `${Math.round(b.v * 100)}%`, height: 6, backgroundColor: b.color }} />
                </View>
              </View>
            ))}
          </View>
          <T size={12} muted center style={{ marginTop: spacing.sm }}>Log meals, train and drink water to keep your pet happy.</T>
        </Card>
      </FadeIn>

      <Card>
        <T weight="800" style={{ marginBottom: spacing.sm }}>Name</T>
        <Field value={name} onChangeText={setName} onBlur={saveName} onSubmitEditing={saveName} placeholder={def.name} maxLength={16} returnKeyType="done" />
        <Segmented<'on' | 'off'>
          value={on ? 'on' : 'off'}
          onChange={(v) => dispatch({ type: 'updateSettings', settings: { mascot: v === 'on' } })}
          options={[
            { key: 'on', label: 'Pop-ups on' },
            { key: 'off', label: 'Quiet' },
          ]}
        />
      </Card>

      <T size={17} weight="800" style={{ marginBottom: spacing.sm }}>Choose your pet</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
        {PETS.map((p) => {
          const locked = !pro && !FREE_PETS.includes(p.key);
          const sel = p.key === species;
          return (
            <Pressable
              key={p.key}
              onPress={() => pick(p.key)}
              accessibilityLabel={`${p.name}, ${p.kind}${locked ? ', Pro' : ''}`}
              style={{ width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 2, borderColor: sel ? colors.primary : colors.border }}
            >
              <View style={{ opacity: locked ? 0.5 : 1 }}>
                <Kettle species={p.key} size={46} mood={sel ? 'pumped' : 'happy'} animate={false} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T weight="800" numberOfLines={1}>{p.name}</T>
                <T size={11} muted numberOfLines={1}>{p.kind}</T>
                {locked && <Badge label="PRO" color={colors.warning} />}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <T weight="800">Outfit</T>
          {!pro && <Badge label="PRO" color={colors.warning} />}
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {Object.keys(SKINS).map((k) => {
            const sel = skin === k;
            return (
              <Pressable
                key={k}
                accessibilityLabel={`${SKINS[k].name} outfit`}
                onPress={() => (pro || k === 'classic' ? dispatch({ type: 'updateSettings', settings: { mascotSkin: k } }) : router.push('/pro?feature=skins'))}
                style={{ flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 14, borderWidth: 2, borderColor: sel ? colors.primary : 'transparent', backgroundColor: colors.cardAlt, opacity: pro || k === 'classic' ? 1 : 0.55 }}
              >
                <Kettle species={species} size={36} mood="happy" skin={k} animate={false} />
                <T size={10} weight="700" muted>{SKINS[k].name}</T>
              </Pressable>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}
