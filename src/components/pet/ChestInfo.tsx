import React, { useMemo } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { T } from '../ui';
import { FadeIn } from '../motion';
import { Pet, type Species } from '../Mascot';
import { useStore } from '@/store/StoreProvider';
import { isPro } from '@/lib/pro';
import { luckFor } from '@/lib/lootChest';
import { chestOdds, chestPool, CHEST_LABEL, hasItem, RARITIES, RARITY, type ChestKind, type LootItem } from '@/lib/loot';
import { todayKey } from '@/lib/dates';
import { useTheme } from '@/theme';

const pct = (v: number) => (v <= 0 ? '–' : v >= 0.1 ? `${Math.round(v * 100)}%` : v >= 0.01 ? `${(v * 100).toFixed(1)}%` : `${(v * 100).toFixed(2)}%`);

/** A small drawn eye: tap it to peek inside a chest. Closed lid when the info is open. */
export function ChestEye({ open, onPress, color, bg, size = 26, label = 'What’s inside' }: { open: boolean; onPress: () => void; color: string; bg: string; size?: number; label?: string }) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={label}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}
    >
      <Svg width={size * 0.62} height={size * 0.62} viewBox="0 0 20 20">
        {open ? (
          <Path d="M3 9 Q10 15 17 9 M6 11.6 L4.6 13.6 M10 13 L10 15.4 M14 11.6 L15.4 13.6" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" />
        ) : (
          <>
            <Path d="M2.5 10 Q10 2.8 17.5 10 Q10 17.2 2.5 10 Z" stroke={color} strokeWidth={1.7} fill="none" strokeLinejoin="round" />
            <Circle cx={10} cy={10} r={2.9} fill={color} />
            <Circle cx={11} cy={9} r={0.9} fill={bg} />
          </>
        )}
      </Svg>
    </Pressable>
  );
}

/** What a few of the finds you could get look like: things you don't have first, pets first. */
function sampleFinds(pool: LootItem[], owned: (i: LootItem) => boolean, n: number): LootItem[] {
  const order = { pet: 0, skin: 1, aura: 2 } as const;
  const rank = { legendary: 0, epic: 1, rare: 2, common: 3 } as const;
  return [...pool].sort((a, b) => Number(owned(a)) - Number(owned(b)) || order[a.kind] - order[b.kind] || rank[a.rarity] - rank[b.rarity]).slice(0, n);
}

/**
 * The inside of a chest, as an inline drop-down: the XP it pays, a few things
 * it can hold at your level, and the odds per rarity.
 */
export function ChestInfo({ kind, xp, style, onClose, tone = 'card' }: { kind: ChestKind; xp: number; style?: StyleProp<ViewStyle>; onClose?: () => void; tone?: 'card' | 'dark' }) {
  const { state } = useStore();
  const { colors, dark } = useTheme();
  const pro = isPro(state);
  const owned = state.loot?.owned ?? [];
  const luck = useMemo(() => luckFor(state, todayKey(), pro), [state, pro]);
  const odds = chestOdds(kind, luck);
  const pool = useMemo(() => chestPool(luck.level ?? 1), [luck.level]);
  const have = (i: LootItem) => hasItem(i.id, pro, owned);
  const finds = sampleFinds(pool, have, 4);
  const fresh = pool.filter((i) => !have(i)).length;
  const onDark = tone === 'dark' || dark;
  const ink = tone === 'dark' ? '#fff' : colors.text;
  const muted = tone === 'dark' ? 'rgba(255,255,255,0.62)' : colors.textMuted;
  const line = tone === 'dark' ? 'rgba(255,255,255,0.12)' : colors.border;
  const well = tone === 'dark' ? 'rgba(255,255,255,0.07)' : colors.cardAlt;
  const species = (state.settings.pet ?? 'kettle') as Species;

  return (
    <FadeIn offset={-6} style={[{ borderRadius: 16, padding: 12, backgroundColor: tone === 'dark' ? '#141A17' : colors.card, borderWidth: 1, borderColor: line }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <T size={11} weight="800" color={muted} style={{ letterSpacing: 1.2, flex: 1 }}>
          INSIDE THE {CHEST_LABEL[kind].toUpperCase()}
        </T>
        {onClose && (
          <T size={12} weight="800" color={muted} onPress={onClose}>
            Close
          </T>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
        <T size={20} weight="800" color={ink}>+{xp} XP</T>
        <T size={12} color={muted}>every time</T>
      </View>

      <View style={{ height: 1, backgroundColor: line, marginVertical: 10 }} />

      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <T size={12} weight="800" color={ink} style={{ flex: 1 }}>Sometimes a bonus find</T>
        <T size={12} weight="800" color={ink}>{pct(odds.drop)}</T>
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
        {finds.map((i) => {
          const rar = RARITY[i.rarity];
          return (
            <View key={i.id} style={{ flex: 1, alignItems: 'center', paddingTop: 4, paddingBottom: 5, borderRadius: 12, backgroundColor: well }}>
              <View style={{ position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: rar.color }} />
              {i.kind === 'pet' ? (
                <Pet species={i.key as Species} size={40} animate={false} />
              ) : i.kind === 'skin' ? (
                <Pet species={species} size={40} animate={false} skin={i.key} />
              ) : (
                <Pet species={species} size={40} animate={false} aura={i.key} />
              )}
              <T size={10} weight="700" color={have(i) ? muted : ink} numberOfLines={1} style={{ paddingHorizontal: 3 }}>
                {i.name}
              </T>
            </View>
          );
        })}
      </View>
      <T size={11} color={muted} style={{ marginTop: 6 }}>
        {fresh > finds.filter((i) => !have(i)).length ? `…and ${fresh - finds.filter((i) => !have(i)).length} more you don’t have yet. ` : ''}Repeats turn into bonus XP.
      </T>

      <View style={{ flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 10, backgroundColor: well }}>
        {RARITIES.map((r) => (odds.rarity[r] > 0 ? <View key={r} style={{ flex: odds.rarity[r], backgroundColor: RARITY[r].color }} /> : null))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 4, marginTop: 7 }}>
        {RARITIES.map((r) => (
          <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, opacity: odds.rarity[r] > 0 ? 1 : 0.45 }}>
            <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: RARITY[r].color, transform: [{ rotate: '45deg' }] }} />
            <T size={11} color={muted}>{RARITY[r].label}</T>
            <T size={11} weight="800" color={ink}>{pct(odds.rarity[r])}</T>
          </View>
        ))}
      </View>
      <T size={10} color={muted} style={{ marginTop: 8, opacity: onDark ? 0.8 : 1 }}>
        Earned by training and logging, never sold.
      </T>
    </FadeIn>
  );
}
