import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { nativeDriver, PressScale, FadeIn } from '@/components/motion';
import { T } from '@/components/ui';
import { radius, spacing, useTheme } from '@/theme';

/** A radio row: a ring that fills with a dot, a title and a quiet hint. */
export function ChoiceRow({
  selected,
  onPress,
  title,
  hint,
  glyph,
  index = 0,
}: {
  selected: boolean;
  onPress: () => void;
  title: string;
  hint?: string;
  glyph?: React.ReactNode;
  index?: number;
}) {
  const { colors } = useTheme();
  const v = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: selected ? 1 : 0, useNativeDriver: nativeDriver, speed: 18, bounciness: 12 }).start();
  }, [selected, v]);
  return (
    <FadeIn delay={120 + index * 55} offset={10}>
      <PressScale
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onPress();
        }}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        accessibilityLabel={hint ? `${title}. ${hint}` : title}
        scaleTo={0.98}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 13,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primarySoft : colors.card,
          marginBottom: spacing.sm,
        }}
      >
        {glyph}
        <View style={{ flex: 1 }}>
          <T weight="700" size={15.5}>{title}</T>
          {hint ? <T muted size={13} style={{ marginTop: 1 }}>{hint}</T> : null}
        </View>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: selected ? colors.primary : colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, transform: [{ scale: v }] }} />
        </View>
      </PressScale>
    </FadeIn>
  );
}

/** A row of round number buttons (days per week, hours of sleep). */
export function NumberPicks<K extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { key: K; label: string }[];
  value: K | undefined;
  onChange: (k: K) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      {options.map((o, i) => {
        const on = o.key === value;
        const long = o.label.length > 2;
        return (
          <FadeIn key={String(o.key)} delay={120 + i * 50} offset={8} style={{ flex: 1 }}>
            <PressScale
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onChange(o.key);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={o.label}
              scaleTo={0.92}
              style={{
                aspectRatio: 1,
                borderRadius: 999,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1.5,
                borderColor: on ? colors.primary : colors.border,
                backgroundColor: on ? colors.primary : colors.card,
              }}
            >
              <T size={long ? 13 : 22} weight="800" color={on ? colors.onPrimary : colors.text} center>
                {o.label}
              </T>
            </PressScale>
          </FadeIn>
        );
      })}
    </View>
  );
}

/** A tiny hand-drawn trend line for the goal choices. */
export function TrendGlyph({ dir, active }: { dir: 'down' | 'flat' | 'up'; active: boolean }) {
  const { colors } = useTheme();
  const c = active ? colors.primary : colors.textMuted;
  const d = dir === 'down' ? 'M3 7 Q10 8 14 14 T27 21' : dir === 'up' ? 'M3 21 Q10 20 14 14 T27 7' : 'M3 15 Q9 11 15 14 T27 13';
  const end = dir === 'down' ? [27, 21] : dir === 'up' ? [27, 7] : [27, 13];
  return (
    <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: active ? colors.card : colors.cardAlt, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={30} height={28} viewBox="0 0 30 28">
        <Path d={d} stroke={c} strokeWidth={2.4} strokeLinecap="round" fill="none" />
        <Circle cx={end[0]} cy={end[1]} r={3} fill={c} />
      </Svg>
    </View>
  );
}

const SHORT: Record<string, string> = { upper: 'Upper', lower: 'Lower', full: 'Full', push: 'Push', pull: 'Pull', legs: 'Legs', chest: 'Chest', back: 'Back', shoulders: 'Delts', arms: 'Arms' };

/** Mon–Sun strip that lights up the training days of a week plan. */
export function WeekStrip({ week }: { week: (string | null)[] }) {
  const { colors } = useTheme();
  const names = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {week.map((d, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
          <View
            style={{
              width: '100%',
              height: 34,
              borderRadius: 10,
              backgroundColor: d ? colors.primary : colors.cardAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {d ? (
              <T size={10.5} weight="800" color={colors.onPrimary} numberOfLines={1}>
                {SHORT[d] ?? d.charAt(0).toUpperCase() + d.slice(1, 4)}
              </T>
            ) : (
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.textMuted, opacity: 0.5 }} />
            )}
          </View>
          <T size={11} muted weight="600">{names[i]}</T>
        </View>
      ))}
    </View>
  );
}
