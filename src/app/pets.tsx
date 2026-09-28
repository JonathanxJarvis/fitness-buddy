import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Field, Screen, Segmented, T } from '@/components/ui';
import { FadeIn, PressScale } from '@/components/motion';
import { Pet, PETS, SKINS, type Mood, type Species } from '@/components/Mascot';
import { EVOLUTION } from '@/components/pet/Gear';
import { usePetLook } from '@/components/pet/usePetLook';
import { useStore } from '@/store/StoreProvider';
import { isPro } from '@/lib/pro';
import { AURAS, CATALOG, chestOdds, CHEST_LABEL, hasItem, itemById, RARITY, RARITIES, type ChestKind, type ItemKind, type LootItem } from '@/lib/loot';
import { luckFor } from '@/lib/lootChest';
import { TIERS } from '@/lib/progression';
import { shortDate, todayKey } from '@/lib/dates';
import { radius, spacing, useTheme } from '@/theme';

const MOODS: Mood[] = ['happy', 'pumped', 'wink', 'proud', 'hungry', 'sleepy'];
const TABS: { key: ItemKind; label: string }[] = [
  { key: 'pet', label: 'Pets' },
  { key: 'skin', label: 'Outfits' },
  { key: 'aura', label: 'Auras' },
];

const pct = (v: number) => (v >= 0.1 ? `${Math.round(v * 100)}%` : v >= 0.01 ? `${(v * 100).toFixed(1)}%` : `${(v * 100).toFixed(2)}%`);

export default function PetsScreen() {
  const { state, dispatch } = useStore();
  const { colors, dark } = useTheme();
  const pro = isPro(state);
  const look = usePetLook();
  const { species, skin, aura, tier, care } = look;
  const def = PETS.find((p) => p.key === species) ?? PETS[0];
  const tierDef = TIERS[tier];
  const [name, setName] = useState(state.settings.petName ?? '');
  const [moodIdx, setMoodIdx] = useState<number | null>(null);
  const [tab, setTab] = useState<ItemKind>('pet');
  const [peek, setPeek] = useState<LootItem | null>(null);
  const on = state.settings.mascot !== false;
  const owned = state.loot?.owned ?? [];
  const mood = moodIdx === null ? care.mood : MOODS[moodIdx];

  const saveName = () => dispatch({ type: 'updateSettings', settings: { petName: name.trim().slice(0, 16) || def.name } });

  const equip = (item: LootItem) => {
    if (!hasItem(item.id, pro, owned)) {
      Haptics.selectionAsync().catch(() => {});
      setPeek(item);
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    setPeek(null);
    if (item.kind === 'pet') {
      const current = state.settings.petName?.trim();
      const defaults = PETS.map((p) => p.name);
      const nextName = !current || defaults.includes(current) ? item.name : current;
      dispatch({ type: 'updateSettings', settings: { pet: item.key, petName: nextName } });
      setName(nextName);
    } else if (item.kind === 'skin') dispatch({ type: 'updateSettings', settings: { mascotSkin: item.key } });
    else dispatch({ type: 'updateSettings', settings: { petAura: item.key } });
  };

  const items = CATALOG.filter((i) => i.kind === tab);
  const have = (kind: ItemKind) => CATALOG.filter((i) => i.kind === kind && hasItem(i.id, pro, owned)).length;
  const totalHave = have('pet') + have('skin') + have('aura');

  const careRows = [
    {
      key: 'train',
      label: 'Training',
      color: '#22B573',
      v: care.fit,
      state: care.fit >= 1 ? 'Trained today' : care.fit >= 0.8 ? 'Trained yesterday' : care.fit >= 0.5 ? 'Getting restless' : 'Needs a workout',
      gives: 'Sweat and a mini dumbbell',
    },
    {
      key: 'food',
      label: 'Food',
      color: '#F08A24',
      v: care.fed,
      state: care.fed >= 1 ? 'Well fed' : care.fed > 0 ? 'Snacking' : 'Hungry',
      gives: 'A healthy glow',
    },
    {
      key: 'water',
      label: 'Water',
      color: '#3B9EF0',
      v: care.hydrated,
      state: care.hydrated >= 0.75 ? 'Hydrated' : care.hydrated > 0.25 ? 'Sipping' : 'Thirsty',
      gives: 'Its own water bottle',
    },
  ];

  return (
    <Screen>
      <FadeIn>
        <View style={{ borderRadius: 26, overflow: 'hidden', marginBottom: spacing.md, backgroundColor: dark ? '#0E1512' : '#0F1A14' }}>
          <LinearGradient colors={[tierDef.color + '55', 'transparent']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 260 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14 }}>
            <T size={11} weight="800" color="rgba(255,255,255,0.6)" style={{ letterSpacing: 1.6 }}>
              {tierDef.name.toUpperCase()} FORM
            </T>
            <T size={11} weight="800" color="rgba(255,255,255,0.6)" style={{ letterSpacing: 1.6 }}>
              {totalHave}/{CATALOG.length} COLLECTED
            </T>
          </View>
          <Pressable onPress={() => setMoodIdx((m) => ((m ?? MOODS.indexOf(care.mood)) + 1) % MOODS.length)} accessibilityLabel="Tap to change mood" style={{ alignItems: 'center', paddingTop: 6 }}>
            <Pet species={species} size={188} mood={mood} skin={skin} tier={tier} aura={aura} care={care} />
          </Pressable>
          <View style={{ alignItems: 'center', paddingHorizontal: 20, paddingBottom: 18 }}>
            <T size={26} weight="800" color="#fff">{state.settings.petName || def.name}</T>
            <T size={13} color="rgba(255,255,255,0.65)" style={{ marginTop: 1 }}>
              {def.kind} · {EVOLUTION[tier].gear.toLowerCase()} unlocked
            </T>
            <T size={14} weight="600" color="rgba(255,255,255,0.9)" center style={{ marginTop: 10, maxWidth: 300 }}>
              “{care.line}”
            </T>
          </View>
        </View>
      </FadeIn>

      <FadeIn delay={60}>
        <Card style={{ paddingVertical: spacing.md }}>
          <T size={12} weight="800" muted style={{ letterSpacing: 1.2, marginBottom: 4 }}>
            YOUR DAY SHAPES {(state.settings.petName || def.name).toUpperCase()}
          </T>
          {careRows.map((r, i) => (
            <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}>
              <View style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, backgroundColor: r.color, opacity: 0.25 + 0.75 * r.v }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <T weight="800">{r.label}</T>
                  <T size={13} weight="700" color={r.v >= 0.75 ? r.color : colors.textMuted}>{r.state}</T>
                </View>
                <T size={12} muted numberOfLines={1}>{r.v >= 0.75 ? `Showing: ${r.gives.toLowerCase()}` : `Unlocks ${r.gives.toLowerCase()}`}</T>
              </View>
              <Meter v={r.v} color={r.color} track={colors.track} />
            </View>
          ))}
        </Card>
      </FadeIn>

      <FadeIn delay={120}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 4, marginBottom: 8 }}>
          <T size={17} weight="800">Evolution</T>
          <T size={12} muted>Rank up to gear up</T>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg, marginBottom: spacing.md }} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: 8 }}>
          {TIERS.map((t, i) => {
            const reached = i <= tier;
            const cur = i === tier;
            return (
              <View key={t.key} style={{ width: 86, alignItems: 'center', paddingVertical: 10, borderRadius: 18, backgroundColor: cur ? t.color + '22' : colors.card, borderWidth: cur ? 1.5 : 1, borderColor: cur ? t.color : colors.border }}>
                <Pet species={species} size={64} mood={reached ? 'happy' : 'happy'} skin={skin} tier={i} animate={false} silhouette={reached ? undefined : dark ? '#2A332E' : '#D5DBD6'} />
                <T size={12} weight="800" color={reached ? colors.text : colors.textMuted} style={{ marginTop: 4 }}>{t.name}</T>
                <T size={10} muted numberOfLines={1}>{EVOLUTION[i].gear}</T>
              </View>
            );
          })}
        </ScrollView>
      </FadeIn>

      <FadeIn delay={160}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <T size={17} weight="800">Collection</T>
          <T size={12} muted>{have(tab)}/{items.length} {TABS.find((x) => x.key === tab)!.label.toLowerCase()}</T>
        </View>
        <Segmented<ItemKind> value={tab} onChange={(k) => { setTab(k); setPeek(null); }} options={TABS} style={{ marginBottom: 10 }} />
        {peek && <LockedNote item={peek} onClose={() => setPeek(null)} />}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md }}>
          {items.map((item, i) => {
            const got = hasItem(item.id, pro, owned);
            const equipped = (item.kind === 'pet' && item.key === species) || (item.kind === 'skin' && item.key === skin) || (item.kind === 'aura' && item.key === aura);
            return <ItemCard key={item.id} item={item} no={i + 1} got={got} equipped={equipped} species={species} skin={skin} onPress={() => equip(item)} />;
          })}
        </View>
      </FadeIn>

      <OddsCard />
      <RecentDrops />

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
    </Screen>
  );
}

function Meter({ v, color, track }: { v: number; color: string; track: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3 }}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={{ width: 7, height: 16, borderRadius: 2.5, backgroundColor: v >= (i + 1) / 4 - 0.01 ? color : track }} />
      ))}
    </View>
  );
}

/** A collectible card: rarity rail, number, preview and name. Locked items show as silhouettes. */
function ItemCard({ item, no, got, equipped, species, skin, onPress }: { item: LootItem; no: number; got: boolean; equipped: boolean; species: Species; skin: string; onPress: () => void }) {
  const { colors, dark } = useTheme();
  const rar = RARITY[item.rarity];
  const sil = dark ? '#26302B' : '#D3DAD5';
  const preview =
    item.kind === 'pet' ? (
      <Pet species={item.key as Species} size={70} animate={false} silhouette={got ? undefined : sil} mood={equipped ? 'pumped' : 'happy'} />
    ) : item.kind === 'skin' ? (
      <Pet species={species} size={70} animate={false} skin={item.key} silhouette={got ? undefined : sil} />
    ) : (
      <Pet species={species} size={70} animate={false} skin={skin} aura={got ? item.key : 'none'} silhouette={got ? undefined : sil} />
    );
  return (
    <PressScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${item.name}, ${rar.label}${got ? (equipped ? ', equipped' : '') : ', locked'}`} style={{ width: '31.4%' }}>
      <View style={{ borderRadius: 16, backgroundColor: colors.card, borderWidth: equipped ? 2 : 1, borderColor: equipped ? rar.color : colors.border, overflow: 'hidden', paddingBottom: 8 }}>
        <LinearGradient colors={[rar.color + (got ? '38' : '14'), 'transparent']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 80 }} />
        <View style={{ height: 3, backgroundColor: rar.color, opacity: got ? 1 : 0.4 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 6 }}>
          <T size={8.5} weight="800" color={rar.color} style={{ letterSpacing: 1 }}>{rar.label.toUpperCase()}</T>
          <T size={8.5} weight="700" muted>{String(no).padStart(2, '0')}</T>
        </View>
        <View style={{ alignItems: 'center', marginTop: 2 }}>{preview}</View>
        <T size={12} weight="800" center numberOfLines={1} color={got ? colors.text : colors.textMuted} style={{ paddingHorizontal: 4 }}>
          {got ? item.name : '???'}
        </T>
        <T size={9.5} weight="700" center muted numberOfLines={1}>
          {equipped ? 'EQUIPPED' : got ? (item.source === 'pro' ? 'PRO' : item.source === 'starter' ? 'STARTER' : 'COLLECTED') : item.source === 'pro' ? 'PRO OR CHEST' : 'CHEST DROP'}
        </T>
      </View>
    </PressScale>
  );
}

function LockedNote({ item, onClose }: { item: LootItem; onClose: () => void }) {
  const { colors } = useTheme();
  const rar = RARITY[item.rarity];
  const blurb = item.kind === 'pet' ? PETS.find((p) => p.key === item.key)?.blurb : item.kind === 'aura' ? AURAS[item.key as keyof typeof AURAS]?.blurb : `${SKINS[item.key]?.name} outfit.`;
  return (
    <Pressable onPress={onClose} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.cardAlt, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: rar.color }}>
      <View style={{ flex: 1 }}>
        <T size={13} weight="800">A {rar.label.toLowerCase()} {item.kind === 'skin' ? 'outfit' : item.kind} · still hidden</T>
        <T size={12} muted>
          {blurb} {item.source === 'pro' ? 'Included with Pro, or find it in a chest.' : 'Drops from chests. Keep training and ranking up for better luck.'}
        </T>
      </View>
      {item.source === 'pro' && (
        <T size={12} weight="800" color={colors.primary} onPress={() => router.push('/pro?feature=pets')}>
          Pro
        </T>
      )}
    </Pressable>
  );
}

/** Published odds for each chest at your current luck. */
function OddsCard() {
  const { state } = useStore();
  const { colors } = useTheme();
  const pro = isPro(state);
  const luck = useMemo(() => luckFor(state, todayKey(), pro), [state, pro]);
  const kinds: ChestKind[] = ['daily', 'weekly', 'world'];
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T weight="800">Chest odds</T>
        <T size={12} muted>Every chest pays XP</T>
      </View>
      <T size={12} muted style={{ marginTop: 2, marginBottom: 10 }}>
        Sometimes a chest also holds a collectible. Your rank ({TIERS[luck.tier].name}), a {luck.streak}-day streak{pro ? ', Pro' : ''}
        {luck.dry ? ` and ${luck.dry} empty chest${luck.dry > 1 ? 's' : ''} in a row` : ''} raise the chance.
      </T>
      <View style={{ flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderColor: colors.border }}>
        <T size={11} weight="800" muted style={{ flex: 1.4 }}>CHEST</T>
        <T size={11} weight="800" muted style={{ flex: 1, textAlign: 'right' }}>ITEM</T>
        {RARITIES.map((r) => (
          <View key={r} style={{ flex: 1, alignItems: 'flex-end' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: RARITY[r].color }} />
          </View>
        ))}
      </View>
      {kinds.map((k) => {
        const o = chestOdds(k, luck);
        return (
          <View key={k} style={{ flexDirection: 'row', paddingVertical: 7, alignItems: 'center' }}>
            <T size={12} weight="700" style={{ flex: 1.4 }}>{CHEST_LABEL[k].replace(' chest', '')}</T>
            <T size={12} weight="800" style={{ flex: 1, textAlign: 'right' }}>{pct(o.drop)}</T>
            {RARITIES.map((r) => (
              <T key={r} size={11} muted style={{ flex: 1, textAlign: 'right' }}>{pct(o.rarity[r])}</T>
            ))}
          </View>
        );
      })}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
        {RARITIES.map((r) => (
          <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: RARITY[r].color }} />
            <T size={11} muted>{RARITY[r].label}</T>
          </View>
        ))}
      </View>
      <T size={11} muted style={{ marginTop: 8 }}>
        Chests are earned by logging and training, never sold. A repeat drop turns into bonus XP.
      </T>
    </Card>
  );
}

function RecentDrops() {
  const { state } = useStore();
  const { colors } = useTheme();
  const drops = [...(state.loot?.history ?? [])].reverse().slice(0, 5);
  if (!drops.length) return null;
  return (
    <Card>
      <T weight="800" style={{ marginBottom: 6 }}>Recent finds</T>
      {drops.map((d, i) => {
        const item = itemById(d.item);
        if (!item) return null;
        const rar = RARITY[item.rarity];
        return (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderColor: colors.border }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: rar.color }} />
            <T size={13} weight="700" style={{ flex: 1 }}>{item.name}</T>
            <T size={12} muted>{d.dup ? `repeat · +${rar.bonusXp} XP` : rar.label}</T>
            <T size={12} muted>{shortDate(d.date)}</T>
          </View>
        );
      })}
    </Card>
  );
}
