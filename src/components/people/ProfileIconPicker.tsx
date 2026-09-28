import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { T } from '@/components/ui';
import { nativeDriver, PressScale } from '@/components/motion';
import { Avatar, ProfilePicture, useSelfPerson } from '@/components/Avatar';
import { RankFrame } from '@/components/RankFrame';
import { AURAS, PETS, SKINS } from '@/lib/loot';
import { STAGES } from '@/lib/progression';
import { petName } from '@/lib/pro';
import { useStore } from '@/store/StoreProvider';
import { radius, spacing, useTheme } from '@/theme';
import type { ProfileIcon } from '@/lib/types';

/**
 * Choose what your profile picture shows: you, or your pet. Two live previews
 * in your current rank frame, side by side, plus a peek at how it reads in a
 * leaderboard row. Saves straight to settings (applies everywhere at once).
 */
export function ProfileIconPicker({ frameSize = 124 }: { frameSize?: number }) {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const me = useSelfPerson();
  const choice: ProfileIcon = state.settings.profileIcon ?? 'photo';
  const stage = STAGES[me.stage] ?? STAGES[0];
  const accent = stage.tier.color;

  const pick = (v: ProfileIcon) => {
    if (v === choice) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    dispatch({ type: 'updateSettings', settings: { profileIcon: v } });
  };

  const def = PETS.find((p) => p.key === me.pet) ?? PETS[0];
  const skin = SKINS[me.skin ?? 'classic'];
  const aura = me.aura && me.aura !== 'none' ? AURAS[me.aura as keyof typeof AURAS] : undefined;
  const petBits = [skin && me.skin !== 'classic' ? `${skin.name} outfit` : null, aura ? aura.name : null, `${stage.tier.name} gear`].filter(Boolean) as string[];

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Option
          on={choice === 'photo'}
          onPress={() => pick('photo')}
          accent={accent}
          title="You"
          detail={me.photo ? 'Your photo' : 'Your illustrated avatar'}
          label="Use my picture as my profile icon"
        >
          <RankFrame stage={stage} size={frameSize}>
            <ProfilePicture person={{ ...me, icon: 'photo' }} size={frameSize * 0.5} stage={me.stage} />
          </RankFrame>
        </Option>
        <Option
          on={choice === 'pet'}
          onPress={() => pick('pet')}
          accent={accent}
          title={petName(state, def.name)}
          detail={petBits.join(' · ')}
          label={`Use ${petName(state, def.name)} as my profile icon`}
        >
          <RankFrame stage={stage} size={frameSize}>
            <ProfilePicture person={{ ...me, icon: 'pet' }} size={frameSize * 0.5} stage={me.stage} animate mood={choice === 'pet' ? 'pumped' : 'happy'} />
          </RankFrame>
        </Option>
      </View>

      {/* how it reads out in the wild */}
      <View style={{ marginTop: spacing.md, borderRadius: radius.lg, backgroundColor: colors.cardAlt, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar person={me} self stage={me.stage} size={46} frame="compact" petBadge={false} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={14} weight="800" numberOfLines={1}>
            {me.name} <T size={14} weight="600" muted>(you)</T>
          </T>
          <T size={12} muted numberOfLines={1}>
            {stage.label} · how friends see you
          </T>
        </View>
      </View>
      <T size={12} muted style={{ marginTop: spacing.sm, lineHeight: 17 }}>
        {choice === 'pet'
          ? `Friends see ${petName(state, def.name)} too, outfit and aura included.`
          : me.photo
            ? 'Your photo stays on this phone. Friends see your illustrated avatar.'
            : 'Friends see this avatar next to your rank.'}
      </T>
    </View>
  );
}

function Option({ on, onPress, accent, title, detail, label, children }: { on: boolean; onPress: () => void; accent: string; title: string; detail: string; label: string; children: React.ReactNode }) {
  const { colors, dark } = useTheme();
  const v = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: on ? 1 : 0, useNativeDriver: nativeDriver, friction: 6, tension: 140 }).start();
  }, [on, v]);
  return (
    <PressScale onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={label} style={{ flex: 1 }}>
      <View
        style={{
          borderRadius: radius.lg + 4,
          borderWidth: 2,
          borderColor: on ? accent : colors.border,
          backgroundColor: on ? accent + (dark ? '22' : '14') : colors.card,
          paddingTop: 10,
          paddingBottom: 12,
          paddingHorizontal: 8,
          alignItems: 'center',
        }}
      >
        <Animated.View
          style={{
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.62, 1] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }],
          }}
        >
          {children}
        </Animated.View>
        <T size={15} weight="800" numberOfLines={1} style={{ marginTop: 2 }}>
          {title}
        </T>
        <T size={11} weight="600" muted center numberOfLines={2} style={{ marginTop: 2, minHeight: 28, lineHeight: 14 }}>
          {detail}
        </T>
        {/* selection mark */}
        <View style={{ position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? accent : colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? accent : 'transparent' }}>
          <Animated.View style={{ transform: [{ scale: v }], opacity: v }}>
            <Svg width={12} height={12} viewBox="0 0 12 12">
              <Path d="M2.2 6.3 L4.9 8.9 L9.8 3.4" stroke="#fff" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          </Animated.View>
        </View>
      </View>
    </PressScale>
  );
}
