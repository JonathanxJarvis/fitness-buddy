import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { T } from '@/components/ui';
import { PressScale } from '@/components/motion';
import { radius, spacing, useTheme } from '@/theme';
import type { AvatarConfig } from '@/lib/types';
import { PortraitCircle } from './Portrait';
import { avatarFromSeed, BEARDS, BG_DARK, BG_LIGHT, FACES, GLASSES, HAIR_COLORS, HAIRS, SKIN_TONES, TOP_COLORS, TOPS } from './avatarConfig';

type Key = keyof AvatarConfig;

/** Build-your-own portrait: a live preview plus rows of visual choices. */
export function AvatarEditor({ value, onChange }: { value: AvatarConfig; onChange: (v: AvatarConfig) => void }) {
  const { colors, dark } = useTheme();
  const set = (k: Key, v: number) => {
    Haptics.selectionAsync().catch(() => {});
    onChange({ ...value, [k]: v });
  };

  const thumbs = (k: Key, labels: readonly string[], tweak?: (c: AvatarConfig, i: number) => AvatarConfig) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10, paddingRight: spacing.lg }}>
      {labels.map((label, i) => {
        const on = value[k] === i;
        const cfg = tweak ? tweak({ ...value, [k]: i }, i) : { ...value, [k]: i };
        return (
          <Pressable key={label} onPress={() => set(k, i)} accessibilityLabel={label} accessibilityState={{ selected: on }} style={{ alignItems: 'center', width: 60 }}>
            <View style={{ borderRadius: 32, padding: 2, borderWidth: 2, borderColor: on ? colors.primary : 'transparent' }}>
              <PortraitCircle config={cfg} size={52} dark={dark} />
            </View>
            <T size={11} weight={on ? '800' : '500'} muted={!on} numberOfLines={1} style={{ marginTop: 3 }}>{label}</T>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const swatches = (k: Key, list: string[]) => (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {list.map((c, i) => {
        const on = value[k] === i;
        return (
          <Pressable key={c + i} onPress={() => set(k, i)} accessibilityLabel={`${k} ${i + 1}`} accessibilityState={{ selected: on }} style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: on ? colors.primary : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: c, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }} />
          </Pressable>
        );
      })}
    </View>
  );

  const label = (t: string) => (
    <T size={13} weight="800" muted style={{ marginTop: spacing.lg, marginBottom: spacing.sm, letterSpacing: 0.3 }}>
      {t}
    </T>
  );

  return (
    <View>
      <View style={{ alignItems: 'center', marginBottom: spacing.sm }}>
        <PortraitCircle config={value} size={124} dark={dark} />
        <PressScale
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onChange(avatarFromSeed(String(Math.random())));
          }}
          accessibilityLabel="Shuffle"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.cardAlt }}
        >
          <Ionicons name="shuffle" size={15} color={colors.text} />
          <T size={13} weight="700">Shuffle</T>
        </PressScale>
      </View>
      {label('HAIR')}
      {thumbs('hair', HAIRS)}
      {label('HAIR COLOR')}
      {swatches('hairColor', HAIR_COLORS)}
      {label('SKIN TONE')}
      {swatches('skin', SKIN_TONES)}
      {label('FACE SHAPE')}
      {thumbs('face', FACES)}
      {label('FACIAL HAIR')}
      {thumbs('beard', BEARDS)}
      {label('GLASSES')}
      {thumbs('glasses', GLASSES)}
      {label('TOP')}
      {thumbs('top', TOPS)}
      {label('TOP COLOR')}
      {swatches('topColor', TOP_COLORS)}
      {label('BACKGROUND')}
      {swatches('bg', dark ? BG_DARK : BG_LIGHT)}
    </View>
  );
}
