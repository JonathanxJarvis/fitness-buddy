import React, { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Screen, T } from '@/components/ui';
import { FadeIn, PressScale } from '@/components/motion';
import { MyAvatar, useSelfPerson } from '@/components/Avatar';
import { AvatarEditor } from '@/components/people/AvatarEditor';
import { ProfileIconPicker } from '@/components/people/ProfileIconPicker';
import { avatarFor } from '@/components/people/avatarConfig';
import { pickProfilePhoto } from '@/components/people/photo';
import { STAGES } from '@/lib/progression';
import { useStore } from '@/store/StoreProvider';
import { spacing, useTheme } from '@/theme';
import type { AvatarConfig } from '@/lib/types';

/** Your profile picture: what it shows (you or your pet), your photo and your illustrated avatar. */
export default function AvatarScreen() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const me = useSelfPerson();
  const stage = STAGES[me.stage] ?? STAGES[0];
  const [draft, setDraft] = useState<AvatarConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choosePhoto = async () => {
    setError(null);
    try {
      const photo = await pickProfilePhoto();
      if (photo) dispatch({ type: 'updateSettings', settings: { photo, profileIcon: 'photo' } });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Screen>
      <FadeIn style={{ alignItems: 'center', marginBottom: spacing.md }}>
        <MyAvatar size={188} frame="ornate" mood="pumped" animate />
        <T size={22} weight="800" style={{ marginTop: 2 }}>{me.name}</T>
        <T size={13} weight="800" color={stage.tier.color} style={{ letterSpacing: 1.2, marginTop: 2 }}>
          {stage.label.toUpperCase()}
        </T>
      </FadeIn>

      <FadeIn delay={80}>
        <Card>
          <T size={17} weight="800">Profile icon</T>
          <T size={13} muted style={{ marginTop: 2, marginBottom: spacing.md }}>Show yourself, or let your pet represent you. Your rank frame goes around either.</T>
          <ProfileIconPicker />
        </Card>
      </FadeIn>

      <FadeIn delay={160}>
        <Card>
          <T size={17} weight="800">Your picture</T>
          <T size={13} muted style={{ marginTop: 2, marginBottom: spacing.md }}>
            {state.settings.photo ? 'Using your photo. It stays on this phone.' : 'Using your illustrated avatar. Add a photo or restyle it.'}
          </T>
          {draft ? (
            <>
              <AvatarEditor value={draft} onChange={setDraft} iconPicker={false} />
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
                <Button title="Cancel" variant="ghost" onPress={() => setDraft(null)} style={{ flex: 1 }} />
                <Button
                  title="Save avatar"
                  onPress={() => {
                    dispatch({ type: 'updateSettings', settings: { avatar: draft, photo: undefined, profileIcon: 'photo' } });
                    setDraft(null);
                  }}
                  style={{ flex: 1 }}
                />
              </View>
            </>
          ) : (
            <>
              <Button title={state.settings.photo ? 'Choose another photo' : 'Choose a photo'} icon="image-outline" onPress={choosePhoto} />
              <Button title="Design my avatar" variant="secondary" icon="brush-outline" onPress={() => setDraft(avatarFor(me))} style={{ marginTop: spacing.sm }} />
              {state.settings.photo ? (
                <Button title="Remove photo" variant="ghost" onPress={() => dispatch({ type: 'updateSettings', settings: { photo: undefined } })} style={{ marginTop: spacing.sm }} />
              ) : null}
            </>
          )}
          {error && <T size={13} color={colors.danger} center style={{ marginTop: spacing.sm }}>{error}</T>}
        </Card>
      </FadeIn>

      <PressScale onPress={() => router.push('/profile')} accessibilityLabel="Profile and settings" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md }}>
        <T size={14} weight="700" color={colors.primary}>Profile & settings</T>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </PressScale>
    </Screen>
  );
}
