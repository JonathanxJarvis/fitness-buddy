import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { Badge, CountUp, T } from '@/components/ui';
import { FadeIn, PressScale, useTween } from '@/components/motion';
import { FoodThumb, clockTime } from '@/components/FoodThumb';
import { spacing, useTheme } from '@/theme';
import { itemNutrients, servingText } from '@/lib/nutrition';
import type { DiaryEntry, MealType } from '@/lib/types';
import { MEAL_ACCENT, MealIcon } from './MealIcons';

function EntryRow({ e }: { e: DiaryEntry }) {
  const { colors } = useTheme();
  const n = itemNutrients(e);
  return (
    <PressScale
      onPress={() => router.push({ pathname: '/food', params: { entryId: e.id } })}
      scaleTo={0.98}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 7 }}
    >
      <FoodThumb food={e.food} photo={e.photo} size={44} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <T weight="700" numberOfLines={1} style={{ flexShrink: 1 }}>
            {e.food.name}
          </T>
          {e.food.source === 'ai' && <Badge label="AI" color={colors.primary} icon="sparkles" />}
        </View>
        <T size={12} muted numberOfLines={1} style={{ marginTop: 2 }}>
          {servingText(e)} · {Math.round(n.protein)} g protein · {clockTime(e.createdAt)}
        </T>
      </View>
      <T weight="800" style={{ fontVariant: ['tabular-nums'] }}>{Math.round(n.calories)}</T>
    </PressScale>
  );
}

/** A meal: its scene icon, a progress sliver in the meal's colour, and what was eaten. */
export function MealCard({
  meal,
  label,
  items,
  target,
  current,
  onAdd,
  delay = 0,
}: {
  meal: MealType;
  label: string;
  items: DiaryEntry[];
  target: number;
  /** This is the meal to eat next; gets a quiet highlight. */
  current?: boolean;
  onAdd: () => void;
  delay?: number;
}) {
  const { colors, dark } = useTheme();
  const accent = MEAL_ACCENT[meal];
  const kcal = items.reduce((s, e) => s + itemNutrients(e).calories, 0);
  const p = useTween(target ? Math.min(1, kcal / target) : 0, 900, delay + 150);
  const over = kcal > target * 1.15;
  return (
    <FadeIn delay={delay}>
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 22,
          marginBottom: spacing.sm + 2,
          padding: spacing.md + 2,
          borderWidth: current ? 1.5 : StyleSheet.hairlineWidth,
          borderColor: current ? accent + (dark ? '99' : '66') : dark ? colors.border : 'rgba(15,40,25,0.05)',
          shadowColor: colors.shadow,
          shadowOpacity: dark ? 0 : 0.05,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 5 },
          elevation: dark ? 0 : 1,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <PressScale onPress={onAdd} scaleTo={0.92} accessibilityLabel={`${label} options`}>
            <MealIcon meal={meal} size={46} />
          </PressScale>
          <Pressable style={{ flex: 1 }} onPress={onAdd} accessibilityLabel={`${label} options`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T size={16} weight="800">{label}</T>
              {current && (
                <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: accent + (dark ? '33' : '1F') }}>
                  <T size={10} weight="800" color={accent} style={{ letterSpacing: 0.5 }}>UP NEXT</T>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 1 }}>
              <CountUp value={Math.round(kcal)} delay={delay} size={13} weight="800" color={over ? colors.warning : colors.text} />
              <T size={13} muted>{` / ${target} kcal`}</T>
            </View>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.track, marginTop: 6, overflow: 'hidden', maxWidth: 170 }}>
              <View style={{ width: `${p * 100}%`, height: 4, borderRadius: 2, backgroundColor: over ? colors.warning : accent }} />
            </View>
          </Pressable>
          <PressScale
            accessibilityLabel={`Add food to ${label}`}
            onPress={onAdd}
            scaleTo={0.88}
            style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: accent + (dark ? '2E' : '1A'), alignItems: 'center', justifyContent: 'center' }}
          >
            <Svg width={16} height={16} viewBox="0 0 16 16">
              <Path d="M8 2.5v11M2.5 8h11" stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
            </Svg>
          </PressScale>
        </View>
        {items.length > 0 ? (
          <View style={{ marginTop: spacing.sm, paddingTop: 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
            {items.map((e, i) => (
              <FadeIn key={e.id} delay={delay + 80 + i * 45} offset={8}>
                <EntryRow e={e} />
              </FadeIn>
            ))}
          </View>
        ) : null}
      </View>
    </FadeIn>
  );
}
