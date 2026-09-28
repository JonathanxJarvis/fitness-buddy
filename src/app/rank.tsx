import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, IconButton, ProgressBar, T } from '@/components/ui';
import { FadeIn } from '@/components/motion';
import { RankBadge } from '@/components/RankBadge';
import { Kettle, type Species } from '@/components/Mascot';
import { currentOffset, CHEST_XP_PATH, WorldMap } from '@/components/WorldMap';
import * as Haptics from 'expo-haptics';
import { LineChart } from '@/components/Charts';
import { useStore } from '@/store/StoreProvider';
import { mascotSkin } from '@/lib/pro';
import { LEVEL_NAMES, RANK_WEIGHTS, SESSIONS_FOR_MAX, stateProgression, STAGES } from '@/lib/progression';
import { formatWeight } from '@/lib/units';
import { shortDate, todayKey } from '@/lib/dates';
import { nutrientColors, radius, spacing, useTheme } from '@/theme';

export default function RankScreen() {
  const { state, dispatch } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [pathTop, setPathTop] = useState(0);
  const units = state.settings.units;
  const p = useMemo(
    () => stateProgression(state, todayKey()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.workouts, state.profile, state.exercises, state.questLog],
  );
  const cur = p.stage;
  const next = STAGES[cur.index + 1];

  // Scroll so the current stage is in view once the map has laid out.
  useEffect(() => {
    if (!width || !pathTop) return;
    const t = setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, pathTop + currentOffset(cur.index) - 300), animated: true }), 450);
    return () => clearTimeout(t);
  }, [width, pathTop, cur.index]);

  const claimed = useMemo(() => new Set((state.questLog ?? []).map((q) => q.id)), [state.questLog]);
  const openChest = (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    dispatch({ type: 'claimReward', entry: { id, date: todayKey(), xp: CHEST_XP_PATH } });
  };
  const parts: { key: keyof typeof p.parts; label: string; icon: string; color: string; tip: string }[] = [
    { key: 'strength', label: 'Strength', icon: 'barbell', color: '#E9B53A', tip: p.lifts.length ? `${p.lifts.length} ranked lifts vs. your body weight` : 'Log squat, bench, deadlift, press or pull-ups' },
    { key: 'consistency', label: 'Consistency', icon: 'calendar', color: '#22B573', tip: `${p.sessions28} sessions in 4 weeks · ${SESSIONS_FOR_MAX} maxes it` },
    { key: 'momentum', label: 'Momentum', icon: 'flash', color: '#9B5CF6', tip: `${p.prs28} PRs in 4 weeks + daily quests` },
  ];

  const levelName = (lvl: number) => (lvl < 0 ? 'Getting started' : LEVEL_NAMES[lvl]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={['#0B1A12', cur.tier.color]} start={{ x: 0, y: 0 }} end={{ x: 1.2, y: 1.2 }} style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconButton label="Back" icon="chevron-back" color="#fff" onPress={() => router.back()} />
            <T size={13} weight="800" color="rgba(255,255,255,0.75)" style={{ flex: 1, textAlign: 'center', letterSpacing: 1.2 }}>
              YOUR RANK
            </T>
            <View style={{ width: 30 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md }}>
            <RankBadge stage={cur} size={96} />
            <View style={{ flex: 1 }}>
              <T size={28} weight="800" color="#fff">{cur.label}</T>
              <T size={13} color="rgba(255,255,255,0.8)" style={{ marginTop: 2 }}>{cur.tier.motto}</T>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: spacing.sm }}>
                <T size={22} weight="800" color="#fff">{p.score.toFixed(1)}</T>
                <T size={12} color="rgba(255,255,255,0.7)">rank points</T>
              </View>
            </View>
          </View>
          <View style={{ marginTop: spacing.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <T size={12} weight="700" color="rgba(255,255,255,0.8)">{next ? `Next: ${next.label}` : 'Top of the mountain'}</T>
              {next && <T size={12} weight="700" color="rgba(255,255,255,0.8)">{Math.max(0, next.min - p.score).toFixed(1)} pts to go</T>}
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' }}>
              <View style={{ width: `${p.progress * 100}%`, height: 8, backgroundColor: cur.tier.glow }} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.md, backgroundColor: 'rgba(0,0,0,0.22)', borderRadius: radius.md, padding: 10 }}>
            <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
              <T size={16} weight="800" color="#fff">{p.level}</T>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T size={13} weight="800" color="#fff">Level {p.level}</T>
                <T size={11} color="rgba(255,255,255,0.7)">{p.levelInto} / {p.levelNeeded} XP</T>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden', marginTop: 5 }}>
                <View style={{ width: `${(p.levelInto / Math.max(1, p.levelNeeded)) * 100}%`, height: 6, backgroundColor: '#FFD66B' }} />
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* How ranks work */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <Card style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Kettle species={(state.settings.pet ?? 'kettle') as Species} size={54} mood={p.weakest ? 'pumped' : 'wink'} band={cur.tier.color} skin={mascotSkin(state)} />
            <View style={{ flex: 1 }}>
              <T size={13} weight="800">
                {p.lifts.length === 0
                  ? 'Log a squat, bench, deadlift, press or pull-ups to get ranked.'
                  : p.weakest && p.weakest.next
                    ? `Fastest way up: your ${p.weakest.label.toLowerCase()}.`
                    : 'Keep stacking PRs to climb.'}
              </T>
              <T size={12} muted style={{ marginTop: 2 }}>
                {p.weakest && p.weakest.next
                  ? p.weakest.kind === 'ratio'
                    ? `Hit an estimated ${formatWeight(p.weakest.next, units, 0)} max to reach ${LEVEL_NAMES[p.weakest.level + 1] ?? 'the next level'}.`
                    : `Get ${Math.ceil(p.weakest.next)} clean reps to reach ${LEVEL_NAMES[p.weakest.level + 1] ?? 'the next level'}.`
                  : 'Rank points come from strength, how often you train and your PRs. Train, hit quests and open chests to climb.'}
              </T>
            </View>
          </Card>
        </View>

        {/* What the rank is made of */}
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Card>
            <T weight="800" style={{ marginBottom: spacing.sm }}>What your rank is made of</T>
            {parts.map((pt) => (
              <View key={pt.key} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Ionicons name={pt.icon as never} size={14} color={pt.color} />
                  <T size={13} weight="800" style={{ flex: 1 }}>
                    {pt.label} <T size={11} muted>· {Math.round(RANK_WEIGHTS[pt.key] * 100)}%</T>
                  </T>
                  <T size={13} weight="800">{Math.round(p.parts[pt.key])}</T>
                </View>
                <ProgressBar value={p.parts[pt.key]} max={100} color={pt.color} height={6} />
                <T size={11} muted style={{ marginTop: 3 }}>{pt.tip}</T>
              </View>
            ))}
          </Card>
        </View>

        {/* The map */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: spacing.md, marginHorizontal: spacing.lg }}>
          <T size={17} weight="800" style={{ flex: 1 }}>The path</T>
          <T size={12} muted>9 worlds · 25 stages · 16 chests</T>
        </View>
        <View
          onLayout={(e) => {
            setWidth(e.nativeEvent.layout.width);
            setPathTop(e.nativeEvent.layout.y);
          }}
          style={{ marginHorizontal: spacing.md, marginTop: spacing.sm }}
        >
          {width > 0 && <WorldMap width={width} current={cur.index} claimed={claimed} onChest={openChest} pet={state.settings.pet} skin={mascotSkin(state)} />}
        </View>

        {/* Lift breakdown */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
          <T size={17} weight="800" style={{ marginBottom: spacing.sm }}>Your lifts</T>
          <Card style={{ paddingVertical: spacing.sm }}>
            {p.lifts.length === 0 && <T muted size={13} style={{ paddingVertical: 8 }}>No ranked lifts yet. Squat, bench, deadlift, overhead press, pull-ups, dips and push-ups all count.</T>}
            {p.lifts.map((l, i) => (
              <FadeIn key={l.key} delay={i * 50} style={{ paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', marginBottom: 6 }}>
                  <T weight="800" style={{ flex: 1 }}>{l.label}</T>
                  <T size={12} weight="700" color={colors.primary}>{levelName(l.level)}</T>
                </View>
                <ProgressBar value={l.score} max={100} color={l.score >= 80 ? nutrientColors.protein : l.score >= 60 ? nutrientColors.fat : nutrientColors.calories} height={6} />
                <T size={11} muted style={{ marginTop: 4 }}>
                  Best {l.kind === 'ratio' ? `e1RM ${formatWeight(l.best, units, 0)}` : `${Math.round(l.best)} reps`} · {shortDate(l.date)}
                  {l.next ? ` · next at ${l.kind === 'ratio' ? formatWeight(l.next, units, 0) : `${Math.ceil(l.next)} reps`}` : ' · elite'}
                </T>
              </FadeIn>
            ))}
          </Card>

          <T size={17} weight="800" style={{ marginTop: spacing.md, marginBottom: spacing.sm }}>Growth</T>
          <Card>
            <LineChart points={p.history.map((h) => ({ label: shortDate(h.date), value: h.score }))} color={cur.tier.color} height={140} />
            <T size={11} muted style={{ marginTop: 4 }}>Rank points at the end of each of the last 8 weeks.</T>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
