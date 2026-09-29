import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CountUp, T } from '@/components/ui';
import { nativeDriver, PressScale, useTween } from '@/components/motion';
import { nutrientColors, spacing, useTheme } from '@/theme';
import { NUTRIENT_INFO } from '@/lib/nutrition';
import type { DiaryEntry, Goals, NutrientKey, Nutrients, UnitSystem } from '@/lib/types';
import { formatWater } from '@/lib/units';
import { macroSplit, sodiumToSaltG } from './dayContext';

// Read at render: the Simple look swaps nutrient colors after the module has loaded.
const macros = () =>
  [
    { key: 'protein', label: 'Protein', color: nutrientColors.protein },
    { key: 'carbs', label: 'Carbs', color: nutrientColors.carbs },
    { key: 'fat', label: 'Fat', color: nutrientColors.fat },
  ] as const;

/**
 * The calorie dial. The filled arc is split by where the calories came from
 * (protein / carbs / fat), so one ring answers both "how much" and "of what".
 */
function EnergyDial({ eaten, budget, totals, size }: { eaten: number; budget: number; totals: Nutrients; size: number }) {
  const { colors, dark } = useTheme();
  const stroke = 13;
  const r = (size - stroke) / 2 - 8;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const frac = useTween(budget > 0 ? eaten / budget : 0, 1100, 150);
  const first = Math.min(1, Math.max(0, frac));
  const over = frac > 1 ? Math.min(1, frac - 1) : 0;
  const split = macroSplit(totals);
  const hasSplit = split.protein + split.carbs + split.fat > 0;

  // Build arc segments along the eaten portion, leaving a hairline gap between them.
  const segs: { color: string; start: number; len: number }[] = [];
  if (first > 0.002) {
    if (!hasSplit) segs.push({ color: nutrientColors.calories, start: 0, len: first });
    else {
      let at = 0;
      for (const m of macros()) {
        const len = first * split[m.key];
        if (len > 0.001) segs.push({ color: m.color, start: at, len });
        at += len;
      }
    }
  }
  const gap = segs.length > 1 ? (stroke * 0.9) / c : 0;

  // A soft halo that swells whenever the eaten number goes up.
  const halo = useRef(new Animated.Value(0)).current;
  const prev = useRef(eaten);
  useEffect(() => {
    if (eaten > prev.current + 0.5) {
      halo.setValue(0);
      Animated.timing(halo, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }).start();
    }
    prev.current = eaten;
  }, [eaten, halo]);

  const remaining = Math.round(budget - eaten);
  const ticks = 48;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: r * 2 + stroke,
          height: r * 2 + stroke,
          borderRadius: r + stroke,
          borderWidth: 3,
          borderColor: remaining < 0 ? colors.warning : nutrientColors.calories,
          opacity: halo.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
          transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [1, 1.16] }) }],
        }}
      />
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <G transform={`rotate(-90 ${cx} ${cx})`}>
          {Array.from({ length: ticks }, (_, i) => {
            const a = (i / ticks) * Math.PI * 2;
            const major = i % 12 === 0;
            const r1 = r + stroke / 2 + 3;
            const r2 = r1 + (major ? 5 : 2.5);
            const lit = i / ticks <= first - 0.001;
            return (
              <Line
                key={i}
                x1={cx + Math.cos(a) * r1}
                y1={cx + Math.sin(a) * r1}
                x2={cx + Math.cos(a) * r2}
                y2={cx + Math.sin(a) * r2}
                stroke={lit ? colors.text : colors.textMuted}
                strokeOpacity={lit ? 0.55 : dark ? 0.25 : 0.3}
                strokeWidth={major ? 1.6 : 1}
                strokeLinecap="round"
              />
            );
          })}
          <Circle cx={cx} cy={cx} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
          {segs.map((s, i) => {
            const len = Math.max(0.0001, s.len - gap);
            return (
              <Circle
                key={i}
                cx={cx}
                cy={cx}
                r={r}
                stroke={s.color}
                strokeWidth={stroke}
                fill="none"
                strokeLinecap={segs.length > 1 ? 'butt' : 'round'}
                strokeDasharray={`${len * c} ${c}`}
                strokeDashoffset={-(s.start + (i > 0 ? gap / 2 : 0)) * c}
              />
            );
          })}
          {over > 0.002 && (
            <Circle cx={cx} cy={cx} r={r} stroke={colors.warning} strokeWidth={stroke * 0.55} fill="none" strokeLinecap="round" strokeDasharray={`${over * c} ${c}`} />
          )}
        </G>
      </Svg>
      <T size={11} weight="700" muted style={{ letterSpacing: 0.6 }}>
        {remaining < 0 ? 'OVER BY' : 'LEFT'}
      </T>
      <CountUp value={Math.abs(remaining)} size={34} weight="800" style={{ marginTop: -2, fontVariant: ['tabular-nums'] }} color={remaining < 0 ? colors.warning : colors.text} />
      <T size={12} muted weight="600" style={{ marginTop: -3 }}>kcal</T>
    </View>
  );
}

function Stat({ label, value, color, sub }: { label: string; value: number; color: string; sub?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: 10 }}>
      <View style={{ width: 3, borderRadius: 2, backgroundColor: color }} />
      <View style={{ flex: 1 }}>
        <T size={11} weight="700" muted style={{ letterSpacing: 0.4 }}>{label}</T>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
          <CountUp value={Math.round(value)} size={18} weight="800" style={{ fontVariant: ['tabular-nums'] }} />
          {sub ? <T size={11} muted>{sub}</T> : null}
        </View>
      </View>
    </View>
  );
}

function MacroColumn({ label, color, value, goal, delay }: { label: string; color: string; value: number; goal: number; delay: number }) {
  const { colors } = useTheme();
  const p = useTween(goal > 0 ? Math.min(1.25, value / goal) : 0, 1000, delay);
  const left = Math.round(goal - value);
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: color }} />
        <T size={12} weight="700" muted>{label}</T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 3 }}>
        <CountUp value={Math.round(value)} delay={delay} size={17} weight="800" style={{ fontVariant: ['tabular-nums'] }} />
        <T size={12} muted>{` / ${Math.round(goal)} g`}</T>
      </View>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.track, marginTop: 6, overflow: 'hidden' }}>
        <View style={{ width: `${Math.min(1, p) * 100}%`, height: 5, borderRadius: 3, backgroundColor: color }} />
      </View>
      <T size={11} muted style={{ marginTop: 4 }} color={left < 0 ? colors.warning : undefined}>
        {left > 0 ? `${left} g to go` : left === 0 ? 'Right on' : `${-left} g over`}
      </T>
    </View>
  );
}

const MICROS: { key: NutrientKey; short?: string; color: string }[] = [
  { key: 'fiber', color: '' },
  { key: 'sugar', color: '#E0689A' },
  { key: 'sodium', short: 'Salt', color: '#8C97A6' },
  { key: 'potassium', color: '#7E9C3A' },
  { key: 'calcium', color: '#5B8DEF' },
  { key: 'iron', color: '#B5553A' },
  { key: 'vitaminC', short: 'Vitamin C', color: '#F28C28' },
  { key: 'vitaminD', short: 'Vitamin D', color: '#E6B422' },
];

function fmt(v: number) {
  return v > 0 && v < 10 ? v.toFixed(1).replace(/\.0$/, '') : Math.round(v).toLocaleString('en-US');
}

function MicroCell({ k, short, color, value, goal, known, total, delay }: { k: NutrientKey; short?: string; color: string; value: number; goal: number; known: number; total: number; delay: number }) {
  const { colors } = useTheme();
  const info = NUTRIENT_INFO[k];
  const isSalt = k === 'sodium';
  const shown = isSalt ? sodiumToSaltG(value) : value;
  const target = isSalt ? sodiumToSaltG(goal) : goal;
  const unit = isSalt ? 'g' : info.unit;
  const ratio = goal > 0 ? value / goal : 0;
  const warn = info.limit && ratio > 0.9;
  const p = useTween(Math.min(1, ratio), 900, delay);
  const barColor = warn ? colors.warning : color;
  return (
    <View style={{ width: '50%', paddingRight: 12, paddingVertical: 7 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
        <T size={12} weight="700" style={{ flex: 1 }} numberOfLines={1}>{short ?? info.label}</T>
        {info.limit ? <T size={10} weight="700" muted>MAX</T> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 1 }}>
        <T size={14} weight="800" color={warn ? colors.warning : undefined} style={{ fontVariant: ['tabular-nums'] }}>{fmt(shown)}</T>
        <T size={11} muted>{` / ${fmt(target)} ${unit}`}</T>
        {total > 0 && known < total ? <View style={{ width: 5, height: 5, borderRadius: 3, borderWidth: 1, borderColor: colors.textMuted, marginLeft: 5, alignSelf: 'center' }} /> : null}
      </View>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.track, marginTop: 5, overflow: 'hidden' }}>
        <View style={{ width: `${p * 100}%`, height: 4, borderRadius: 2, backgroundColor: barColor }} />
      </View>
    </View>
  );
}

/** Tap a drop to set the level; tap the last filled one to take a glass back. */
function WaterRow({ ml, goalMl, glass, units, onSet }: { ml: number; goalMl: number; glass: number; units: UnitSystem; onSet: (ml: number) => void }) {
  const { colors } = useTheme();
  const count = Math.max(6, Math.min(12, Math.round(goalMl / glass)));
  const filled = Math.round(ml / glass);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View style={{ minWidth: 76 }}>
        <T size={11} weight="700" muted style={{ letterSpacing: 0.4 }}>WATER</T>
        <T size={14} weight="800" style={{ fontVariant: ['tabular-nums'] }}>
          {formatWater(ml, units)}
        </T>
      </View>
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
        {Array.from({ length: count }, (_, i) => {
          const on = i < filled;
          return (
            <Pressable
              key={i}
              hitSlop={4}
              accessibilityLabel={`${i + 1} glasses of water`}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onSet(i + 1 === filled ? i * glass : (i + 1) * glass);
              }}
            >
              <Drop on={on} color={nutrientColors.water} track={colors.track} />
            </Pressable>
          );
        })}
      </View>
      <PressScale
        accessibilityLabel="Add a glass"
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onSet(ml + glass);
        }}
        style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: nutrientColors.water, alignItems: 'center', justifyContent: 'center' }}
      >
        <Svg width={14} height={14} viewBox="0 0 14 14">
          <Path d="M7 2v10M2 7h10" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" />
        </Svg>
      </PressScale>
    </View>
  );
}

function Drop({ on, color, track }: { on: boolean; color: string; track: string }) {
  const s = useRef(new Animated.Value(on ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(s, { toValue: on ? 1 : 0, useNativeDriver: nativeDriver, speed: 18, bounciness: 12 }).start();
  }, [on, s]);
  return (
    <View style={{ width: 16, height: 20, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={14} height={18} viewBox="0 0 14 18" style={{ position: 'absolute' }}>
        <Path d="M7 1.5C4.5 5.2 1.8 8.4 1.8 11.6a5.2 5.2 0 0 0 10.4 0C12.2 8.4 9.5 5.2 7 1.5z" fill={track} />
      </Svg>
      <Animated.View style={{ position: 'absolute', transform: [{ scale: s }], opacity: s }}>
        <Svg width={14} height={18} viewBox="0 0 14 18">
          <Path d="M7 1.5C4.5 5.2 1.8 8.4 1.8 11.6a5.2 5.2 0 0 0 10.4 0C12.2 8.4 9.5 5.2 7 1.5z" fill={color} />
          <Path d="M4.4 11.5c0 1.2.7 2.2 1.7 2.6" stroke="#fff" strokeOpacity={0.6} strokeWidth={1.1} strokeLinecap="round" fill="none" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const TABS = ['Calories & macros', 'Vitamins & minerals'];

/**
 * Everything the day's food adds up to, in one card: a calorie dial with the
 * macro split, then (swipe) the micronutrients, with water along the bottom.
 */
export function NutritionPanel({
  date,
  totals,
  entries,
  goals,
  burned,
  waterMl,
  waterGoal,
  glass,
  units,
  onSetWater,
}: {
  date: string;
  totals: Nutrients;
  entries: DiaryEntry[];
  goals: Goals;
  burned: number;
  waterMl: number;
  waterGoal: number;
  glass: number;
  units: UnitSystem;
  onSetWater: (ml: number) => void;
}) {
  const { colors, dark } = useTheme();
  const [w, setW] = useState(0);
  const [page, setPage] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  const scroller = useRef<ScrollView>(null);
  const eaten = totals.calories;
  const budget = goals.calories + burned;

  // `page` is the one source of truth. The pager and the underline are put back
  // on it whenever they could have drifted: when the pager (re)mounts or resizes,
  // and when the screen regains focus (coming back from "Full breakdown" can
  // leave the scroll view reset to the first page while the tab still said page 2).
  const pageRef = useRef(0);
  pageRef.current = page;
  const setPageFromOffset = (offset: number) => {
    if (!w) return;
    const p = Math.max(0, Math.min(TABS.length - 1, Math.round(offset / w)));
    if (p !== pageRef.current) {
      pageRef.current = p;
      setPage(p);
    }
  };
  const sync = useCallback(() => {
    if (!w) return;
    const to = pageRef.current * w;
    scroller.current?.scrollTo({ x: to, animated: false });
    x.setValue(to);
  }, [w, x]);
  useEffect(sync, [sync]);
  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(sync, 0);
      return () => clearTimeout(t);
    }, [sync]),
  );
  // Where the pager starts when it mounts; after that only scrollTo moves it,
  // so re-renders never snap it mid-swipe.
  const initialOffset = useRef({ x: 0, y: 0 });
  if (w && initialOffset.current.x !== pageRef.current * w && !scroller.current) initialOffset.current = { x: pageRef.current * w, y: 0 };

  // The scroll position drives the underline and the tab labels on the native
  // thread; React state only changes once a swipe or tap has settled.
  const onScroll = Animated.event([{ nativeEvent: { contentOffset: { x } } }], { useNativeDriver: nativeDriver });
  const go = (p: number) => {
    if (p === pageRef.current) return;
    Haptics.selectionAsync().catch(() => {});
    pageRef.current = p;
    setPage(p);
    scroller.current?.scrollTo({ x: p * w, animated: true });
  };
  const known = (k: NutrientKey) => entries.filter((e) => e.food.nutrients[k] !== undefined).length;
  const tabW = w ? (w - spacing.lg * 2) / 2 : 0;

  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: 26,
        marginBottom: spacing.md,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: dark ? colors.border : 'rgba(15,40,25,0.05)',
        shadowColor: colors.shadow,
        shadowOpacity: dark ? 0 : 0.07,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: dark ? 0 : 3,
        overflow: 'hidden',
      }}
      onLayout={(e) => {
        // A hidden screen reports width 0; keep the last real width so the pager
        // isn't unmounted (and reset to page 1) while another screen is on top.
        const nw = Math.round(e.nativeEvent.layout.width);
        if (nw > 0 && nw !== w) setW(nw);
      }}
    >
      {/* Tabs with an indicator that follows the swipe */}
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <View style={{ flexDirection: 'row' }}>
          {TABS.map((t, i) => (
            <Pressable key={t} onPress={() => go(i)} style={{ flex: 1, paddingVertical: 6 }} accessibilityRole="tab" accessibilityState={{ selected: page === i }}>
              <T size={13} weight="800" center color={colors.textMuted}>{t}</T>
              {w > 0 && (
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 6,
                    opacity: x.interpolate({ inputRange: [(i - 1) * w, i * w, (i + 1) * w], outputRange: [0, 1, 0], extrapolate: 'clamp' }),
                  }}
                >
                  <T size={13} weight="800" center color={colors.text}>{t}</T>
                </Animated.View>
              )}
            </Pressable>
          ))}
        </View>
        <View style={{ height: 2, backgroundColor: colors.track, borderRadius: 1 }}>
          {tabW > 0 && (
            <Animated.View
              style={{
                position: 'absolute',
                height: 2,
                borderRadius: 1,
                width: tabW * 0.5,
                left: tabW * 0.25,
                backgroundColor: colors.text,
                transform: [{ translateX: x.interpolate({ inputRange: [0, w], outputRange: [0, tabW], extrapolate: 'clamp' }) }],
              }}
            />
          )}
        </View>
      </View>

      {w > 0 && (
        <Animated.ScrollView
          ref={scroller as never}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          onMomentumScrollEnd={(e) => setPageFromOffset(e.nativeEvent.contentOffset.x)}
          onLayout={sync}
          contentOffset={initialOffset.current}
          scrollEventThrottle={16}
          decelerationRate="fast"
          style={{ width: w }}
        >
          {/* Page 1: calories + macros */}
          <View style={{ width: w, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
              <EnergyDial eaten={eaten} budget={budget} totals={totals} size={158} />
              <View style={{ flex: 1, gap: 12 }}>
                <Stat label="EATEN" value={eaten} color={nutrientColors.calories} sub="kcal" />
                <Stat label="BURNED" value={burned} color={nutrientColors.steps} sub="kcal" />
                <Stat label="GOAL" value={goals.calories} color={colors.textMuted} sub="kcal" />
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 14, marginTop: spacing.md }}>
              {macros().map((m, i) => (
                <MacroColumn key={m.key} label={m.label} color={m.color} value={totals[m.key]} goal={goals[m.key]} delay={250 + i * 90} />
              ))}
            </View>
          </View>

          {/* Page 2: everything else */}
          <View style={{ width: w, paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {MICROS.map((m, i) => (
                <MicroCell
                  key={m.key}
                  k={m.key}
                  short={m.short}
                  color={m.color || nutrientColors.fiber}
                  value={totals[m.key] ?? 0}
                  goal={goals[m.key as keyof Goals] as number}
                  known={known(m.key)}
                  total={entries.length}
                  delay={i * 50}
                />
              ))}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 4 }}>
              <Pressable onPress={() => router.push({ pathname: '/nutrients', params: { date } })} style={{ paddingVertical: 6, flex: 1 }}>
                <T size={12} weight="700" color={colors.primary}>Full breakdown →</T>
              </Pressable>
              {MICROS.some((m) => entries.length > 0 && known(m.key) < entries.length) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 3, borderWidth: 1, borderColor: colors.textMuted }} />
                  <T size={11} muted>some foods lack data</T>
                </View>
              )}
            </View>
          </View>
        </Animated.ScrollView>
      )}

      {/* Water, on both pages */}
      <View style={{ marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: dark ? 'rgba(56,182,242,0.05)' : 'rgba(56,182,242,0.045)' }}>
        <WaterRow ml={waterMl} goalMl={waterGoal} glass={glass} units={units} onSet={onSetWater} />
      </View>
    </View>
  );
}

