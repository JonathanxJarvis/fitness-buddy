import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Card, IconButton, ProgressBar, T } from '@/components/ui';
import { FadeIn, usePulse } from '@/components/motion';
import { RankBadge } from '@/components/RankBadge';
import { Kettle } from '@/components/Mascot';
import { LineChart } from '@/components/Charts';
import { useStore } from '@/store/StoreProvider';
import { mascotSkin } from '@/lib/pro';
import { LEVEL_NAMES, progression, STAGES, type Stage } from '@/lib/progression';
import { formatWeight } from '@/lib/units';
import { shortDate, todayKey } from '@/lib/dates';
import { nutrientColors, radius, spacing, useTheme } from '@/theme';

const ROW = 92;
const XS = [0.5, 0.78, 0.5, 0.22]; // zig-zag across the screen, like a map

function PathNode({ stage, state, x }: { stage: Stage; state: 'done' | 'current' | 'locked'; x: number }) {
  const pulse = usePulse(1600);
  const size = state === 'current' ? 70 : 50;
  return (
    <View style={{ height: ROW }}>
      <View style={{ position: 'absolute', left: x - size / 2, top: ROW / 2 - size * 0.6, alignItems: 'center' }}>
        {state === 'current' && (
          <Animated.View
            style={{
              position: 'absolute',
              top: size * 0.6 - (size + 20) / 2,
              left: -10,
              width: size + 20,
              height: size + 20,
              borderRadius: (size + 20) / 2,
              backgroundColor: stage.tier.glow,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.45] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] }) }],
            }}
          />
        )}
        <View style={{ opacity: state === 'locked' ? 0.55 : 1 }}>
          <RankBadge stage={stage} size={size} locked={state === 'locked'} />
        </View>
        {state === 'done' && (
          <View style={{ position: 'absolute', right: -4, bottom: 4, width: 18, height: 18, borderRadius: 9, backgroundColor: nutrientColors.calories, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
        )}
      </View>
    </View>
  );
}

export default function RankScreen() {
  const { state } = useStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [pathTop, setPathTop] = useState(0);
  const units = state.settings.units;
  const p = useMemo(
    () => progression(state.workouts, state.profile?.weightKg ?? 75, state.profile?.sex ?? 'male', todayKey()),
    [state.workouts, state.profile],
  );
  const cur = p.stage;
  const next = STAGES[cur.index + 1];

  // Path is drawn top (Titan) to bottom (Rookie III).
  const ordered = [...STAGES].reverse();
  const xFor = (i: number) => XS[(STAGES.length - 1 - i) % XS.length] * width;
  const d = ordered
    .map((_, i) => {
      const x = xFor(i);
      const y = i * ROW + ROW / 2;
      if (i === 0) return `M ${x} ${y}`;
      const px = xFor(i - 1);
      const py = (i - 1) * ROW + ROW / 2;
      return `C ${px} ${py + ROW / 2}, ${x} ${y - ROW / 2}, ${x} ${y}`;
    })
    .join(' ');

  // Scroll so the current stage is in view once the path has laid out.
  useEffect(() => {
    if (!width || !pathTop) return;
    const row = STAGES.length - 1 - cur.index;
    const t = setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, pathTop + row * ROW - 260), animated: true }), 450);
    return () => clearTimeout(t);
  }, [width, pathTop, cur.index]);

  const levelName = (lvl: number) => (lvl < 0 ? 'Getting started' : LEVEL_NAMES[lvl]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={['#0B1A12', cur.tier.color]} start={{ x: 0, y: 0 }} end={{ x: 1.2, y: 1.2 }} style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <IconButton label="Back" icon="chevron-back" color="#fff" onPress={() => router.back()} />
            <T size={13} weight="800" color="rgba(255,255,255,0.75)" style={{ flex: 1, textAlign: 'center', letterSpacing: 1.2 }}>
              STRENGTH RANK
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
                <T size={12} color="rgba(255,255,255,0.7)">strength score</T>
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
            <Kettle size={54} mood={p.weakest ? 'pumped' : 'wink'} band={cur.tier.color} skin={mascotSkin(state)} />
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
                  : 'Your rank comes from how strong you are for your body weight. Workouts earn XP for levels.'}
              </T>
            </View>
          </Card>
        </View>

        {/* The path */}
        <T size={17} weight="800" style={{ marginTop: spacing.md, marginHorizontal: spacing.lg }}>The path</T>
        <View
          onLayout={(e) => {
            setWidth(e.nativeEvent.layout.width);
            setPathTop(e.nativeEvent.layout.y);
          }}
          style={{ marginHorizontal: spacing.lg, marginTop: spacing.sm }}
        >
          {width > 0 && (
            <Svg width={width} height={ordered.length * ROW} style={{ position: 'absolute', top: 0, left: 0 }}>
              <Path d={d} stroke={colors.border} strokeWidth={10} fill="none" strokeLinecap="round" />
              <Path d={d} stroke={colors.track} strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray="2 12" />
            </Svg>
          )}
          {width > 0 &&
            ordered.map((s, i) => {
              const tierStart = s.division === 'III' || s.division === '';
              return (
                <View key={s.index}>
                  <PathNode stage={s} x={xFor(i)} state={s.index < cur.index ? 'done' : s.index === cur.index ? 'current' : 'locked'} />
                  {s.index === cur.index && (
                    <View style={{ position: 'absolute', top: ROW / 2 - 30, left: xFor(i) < width / 2 ? xFor(i) + 46 : xFor(i) - 46 - 54 }}>
                      <Kettle size={54} mood="pumped" band={cur.tier.color} skin={mascotSkin(state)} />
                    </View>
                  )}
                  {tierStart && (
                    <View
                      style={{
                        position: 'absolute',
                        top: ROW / 2 - 16,
                        [xFor(i) < width / 2 ? 'right' : 'left']: 0,
                        maxWidth: width * 0.42,
                      }}
                    >
                      <T size={12} weight="800" color={s.index <= cur.index ? s.tier.color : colors.textMuted} style={{ letterSpacing: 1 }}>
                        {s.tier.name.toUpperCase()}
                      </T>
                      <T size={11} muted numberOfLines={2}>{s.tier.motto}</T>
                    </View>
                  )}
                </View>
              );
            })}
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
            <T size={11} muted style={{ marginTop: 4 }}>Strength score at the end of each of the last 8 weeks.</T>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
