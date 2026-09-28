import React, { useMemo } from 'react';
import { Image, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Kettle, Pet, type Mood, type Species } from './Mascot';
import { RankFrame } from './RankFrame';
import { Portrait } from './people/Portrait';
import { avatarFor } from './people/avatarConfig';
import { demoPhoto } from './people/demoPhotos';
import { mix } from './pet/color';
import { STAGES, stateProgression, TIERS } from '@/lib/progression';
import { mascotSkin, petAura, petSpecies } from '@/lib/pro';
import { todayKey } from '@/lib/dates';
import { useStore } from '@/store/StoreProvider';
import { useTheme } from '@/theme';
import type { AvatarConfig, ProfileIcon } from '@/lib/types';

export type AvatarPerson = {
  name?: string;
  code?: string;
  avatar?: AvatarConfig;
  photo?: string;
  /** 'pet' draws their pet as the profile picture. */
  icon?: ProfileIcon;
  pet?: string;
  skin?: string;
  aura?: string;
};

/** Your own person, ready for <Avatar>: picture, chosen icon and the pet as it looks today. */
export function useSelfPerson(): AvatarPerson & { stage: number } {
  const { state } = useStore();
  const stage = useMemo(() => (state.profile ? stateProgression(state, todayKey()).stage.index : 0), [state]);
  return {
    name: state.profile?.name || 'You',
    avatar: state.settings.avatar,
    photo: state.settings.photo,
    icon: state.settings.profileIcon ?? 'photo',
    pet: petSpecies(state),
    skin: mascotSkin(state),
    aura: petAura(state),
    stage,
  };
}

/**
 * A pet as a profile picture: the pet on a lit backdrop in its tier colors,
 * wearing its outfit, aura and the gear its rank has earned.
 */
export function PetPicture({
  species,
  skin,
  aura,
  tier,
  size,
  animate = false,
  mood = 'happy',
}: {
  species?: string;
  skin?: string;
  aura?: string;
  /** Rank tier index (0 Rookie … 8 Titan). */
  tier: number;
  size: number;
  animate?: boolean;
  mood?: Mood;
}) {
  const { dark } = useTheme();
  const t = TIERS[Math.max(0, Math.min(TIERS.length - 1, tier))];
  const top = mix(t.glow, dark ? '#1A2025' : '#FFFFFF', dark ? 0.3 : 0.12);
  const bottom = mix(t.color, '#0E1216', dark ? 0.5 : 0.2);
  return (
    <View style={{ width: size, height: size, overflow: 'hidden', alignItems: 'center' }}>
      <LinearGradient colors={[top, bottom]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} />
      {/* a soft pool of light the pet stands in */}
      <View style={{ position: 'absolute', width: size * 0.8, height: size * 0.8, borderRadius: size, top: size * 0.14, backgroundColor: '#FFFFFF', opacity: dark ? 0.1 : 0.22 }} />
      <View style={{ marginTop: size * 0.1 }}>
        <Pet species={(species ?? 'kettle') as Species} size={size * 0.92} mood={mood} skin={skin} tier={tier} aura={aura} animate={animate} />
      </View>
    </View>
  );
}

/** The round picture itself (no frame): pet, photo or illustrated portrait. */
export function ProfilePicture({ person, size, stage, animate, mood }: { person: AvatarPerson; size: number; stage: number; animate?: boolean; mood?: Mood }) {
  const { dark } = useTheme();
  if (person.icon === 'pet') {
    const s = STAGES[stage] ?? STAGES[0];
    return <PetPicture species={person.pet} skin={person.skin} aura={person.aura} tier={Math.max(0, TIERS.findIndex((t) => t.key === s.tier.key))} size={size} animate={animate} mood={mood} />;
  }
  return <FacePicture person={person} size={size} dark={dark} />;
}

function FacePicture({ person, size, dark }: { person: AvatarPerson; size: number; dark: boolean }) {
  const stock = person.photo ? undefined : demoPhoto(person.code);
  return person.photo || stock ? (
    <Image source={stock ?? { uri: person.photo }} style={{ width: size, height: size }} accessibilityIgnoresInvertColors />
  ) : (
    <Portrait config={avatarFor(person)} size={size} dark={dark} />
  );
}

/**
 * A person's profile picture (their photo, illustrated portrait, or their pet
 * if they chose it) inside their rank frame, with a small companion badge on
 * the corner (their pet, or their face when the pet is the picture).
 * This is how everyone appears in Friends, chats and leaderboards.
 *
 * `frame`: 'ornate' is the full game-style frame (hero spots), 'compact' a slim
 * metal ring for rows and chat heads, 'none' just the round picture.
 *
 * Your own picture follows your profile-icon setting automatically when
 * `self` is set, or when `person` is built straight from your settings.
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
  self,
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
  /** This is you: use your profile-icon choice and your pet as it looks now. */
  self?: boolean;
}) {
  const { colors, dark } = useTheme();
  const { state } = useStore();
  const st = state.settings;
  // Callers that build "me" from settings pass the same avatar/photo references.
  const isSelf = self ?? (!person.code && person.icon === undefined && (person.avatar !== undefined || person.photo !== undefined) && person.avatar === st.avatar && person.photo === st.photo);
  const who: AvatarPerson = isSelf
    ? { ...person, icon: st.profileIcon ?? 'photo', pet: petSpecies(state), skin: mascotSkin(state), aura: petAura(state) }
    : { ...person, pet: person.pet ?? pet, skin: person.skin ?? skin };
  const petIcon = who.icon === 'pet';

  const s = STAGES[stage] ?? STAGES[0];
  const kind = frame ?? (size >= 96 ? 'ornate' : 'compact');
  const showBadge = (petBadge ?? size >= 44) && (petIcon || !!pet);
  const slot = kind === 'ornate' ? size * 0.5 : kind === 'compact' ? size * 0.84 : size;

  const picture = <ProfilePicture person={who} size={slot} stage={s.index} animate={animate && petIcon} mood={mood} />;

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
      {showBadge && (
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
          {petIcon ? (
            <FacePicture person={who} size={badge} dark={dark} />
          ) : (
            <Kettle species={(pet ?? 'kettle') as Species} size={badge * 0.92} mood={mood} skin={skin} band={s.tier.color} tier={TIERS.findIndex((t) => t.key === s.tier.key)} animate={animate} />
          )}
        </View>
      )}
    </View>
  );
}

/** Your own avatar in your rank frame, following your profile-icon choice. */
export function MyAvatar(props: Omit<React.ComponentProps<typeof Avatar>, 'person' | 'stage' | 'self'> & { stage?: number }) {
  const me = useSelfPerson();
  return <Avatar {...props} person={me} stage={props.stage ?? me.stage} self pet={props.pet ?? me.pet} skin={props.skin ?? me.skin} />;
}
