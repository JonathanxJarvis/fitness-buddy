import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import type { Food, SavedMeal } from '@/lib/types';
import { T } from './ui';
import { FoodArt, CATEGORY_TINT } from './today/FoodArt';
import { foodCategory } from './today/foodCategory';

/** Blend two #RRGGBB colors; t = share of `a`. Returns an opaque hex. */
export function mixHex(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ra, ga, ba] = p(a);
  const [rb, gb, bb] = p(b);
  const m = (x: number, y: number) => Math.round(x * t + y * (1 - t)).toString(16).padStart(2, '0');
  return `#${m(ra, rb)}${m(ga, gb)}${m(ba, bb)}`;
}

/** A meal photo when there is one, otherwise a little illustration of the food. */
export function FoodThumb({ food, photo, size = 46 }: { food: { name: string; source?: Food['source'] }; photo?: string; size?: number }) {
  const { colors, dark } = useTheme();
  const category = useMemo(() => foodCategory(food), [food.name]);
  const r = size * 0.3;
  if (photo) return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: r }} />;
  const bg = mixHex(CATEGORY_TINT[category], colors.card, dark ? 0.22 : 0.16);
  return <FoodArt category={category} size={size} bg={bg} radius={r} />;
}

/** Big version for screen heroes: the illustration on a pale tile of its own color. */
export function FoodHeroArt({ food, size = 96 }: { food: { name: string; source?: Food['source'] }; size?: number }) {
  const category = useMemo(() => foodCategory(food), [food.name]);
  return <FoodArt category={category} size={size} bg={mixHex(CATEGORY_TINT[category], '#FFFFFF', 0.2)} radius={size * 0.32} />;
}

/**
 * A saved meal's picture: the meal's own name when it says what it is
 * ("Porridge"), otherwise its first two foods, one tucked behind the other.
 */
export function MealThumb({ meal, size = 40 }: { meal: Pick<SavedMeal, 'name' | 'items'>; size?: number }) {
  const { colors } = useTheme();
  const own = foodCategory({ name: meal.name });
  const foods = meal.items.map((i) => i.food);
  if (own !== 'dish' || foods.length === 0) return <FoodThumb food={{ name: meal.name }} size={size} />;
  if (foods.length === 1) return <FoodThumb food={foods[0]} size={size} />;
  const small = Math.round(size * 0.68);
  return (
    <View style={{ width: size, height: size }}>
      <FoodThumb food={foods[1]} size={small} />
      <View style={{ position: 'absolute', right: -2, bottom: -2, borderRadius: small * 0.34, borderWidth: 2, borderColor: colors.card }}>
        <FoodThumb food={foods[0]} size={small} />
      </View>
    </View>
  );
}

/** A list row led by the food's illustration (use instead of ListRow for foods). */
export function FoodRow({
  food,
  thumb,
  title,
  subtitle,
  right,
  onPress,
  divider = true,
}: {
  food?: { name: string; source?: Food['source'] };
  /** Custom leading picture, e.g. a MealThumb. */
  thumb?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  divider?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        opacity: pressed ? 0.6 : 1,
        borderBottomWidth: divider ? StyleSheet.hairlineWidth : 0,
        borderBottomColor: colors.border,
      })}
    >
      {thumb ?? (food ? <FoodThumb food={food} size={40} /> : null)}
      <View style={{ flex: 1 }}>
        <T weight="700" numberOfLines={1}>{title}</T>
        {subtitle ? <T muted size={12} numberOfLines={1} style={{ marginTop: 2 }}>{subtitle}</T> : null}
      </View>
      {right}
    </Pressable>
  );
}

export function clockTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
