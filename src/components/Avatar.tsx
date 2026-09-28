import React from 'react';
import { Image, View } from 'react-native';
import { Kettle, type Mood, type Species } from './Mascot';
import { RankFrame } from './RankFrame';
import { Portrait } from './people/Portrait';
import { avatarFor } from './people/avatarConfig';
import { demoPhoto } from './people/demoPhotos';
import { STAGES, TIERS } from '@/lib/progression';
import { useTheme } from '@/theme';
import type { AvatarConfig } from '@/lib/types';

export type AvatarPerson = { name?: string; code?: string; avatar?: AvatarConfig; photo?: string };

/**
 * A person's profile picture (their photo, or their illustrated portrait) inside
 * their rank frame, with their pet as a small companion badge on the corner.
 * This is how everyone appears in Friends, chats and leaderboards.
 *
 * `frame`: 'ornate' is the full game-style frame (hero spots), 'compact' a slim
 * metal ring for rows and chat heads, 'none' just the round picture.
 */
export function Avatar({
  person,
  stage,
  size = 48,
  pet,
  skin,
  frame,
  petBadge,
  mood = 'happy',
  animate = false,
}: {
  person: AvatarPerson;
  stage: number;
  size?: number;
  pet?: string;
  skin?: string;
  frame?: 'ornate' | 'compact' | 'none';
  petBadge?: boolean;
  mood?: Mood;
  animate?: boolean;
}) {
  const { colors, dark } = useTheme();
  const s = STAGES[stage] ?? STAGES[0];
  const kind = frame ?? (size >= 96 ? 'ornate' : 'compact');
  const showPet = (petBadge ?? size >= 44) && !!pet;
  const slot = kind === 'ornate' ? size * 0.5 : kind === 'compact' ? size * 0.84 : size;

  const stock = person.photo ? undefined : demoPhoto(person.code);
  const picture = person.photo || stock ? (
    <Image source={stock ?? { uri: person.photo }} style={{ width: slot, height: slot }} accessibilityIgnoresInvertColors />
  ) : (
    <Portrait config={avatarFor(person)} size={slot} dark={dark} />
  );

  const badge = kind === 'ornate' ? size * 0.22 : size * 0.4;
  const pos = kind === 'ornate' ? { right: size * 0.2, bottom: size * 0.22 } : { right: -size * 0.04, bottom: -size * 0.04 };

  return (
    <View style={{ width: size, height: size }}>
      {kind === 'none' ? (
        <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>{picture}</View>
      ) : (
        <RankFrame stage={s} size={size} compact={kind === 'compact'}>
          {picture}
        </RankFrame>
      )}
      {showPet && (
        <View
          style={{
            position: 'absolute',
            ...pos,
            width: badge,
            height: badge,
            borderRadius: badge / 2,
            backgroundColor: colors.card,
            borderWidth: Math.max(1.5, badge * 0.07),
            borderColor: colors.background,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <Kettle species={(pet ?? 'kettle') as Species} size={badge * 0.92} mood={mood} skin={skin} band={s.tier.color} tier={TIERS.findIndex((t) => t.key === s.tier.key)} animate={animate} />
        </View>
      )}
    </View>
  );
}
