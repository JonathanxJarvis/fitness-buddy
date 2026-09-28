import React, { useMemo } from 'react';
import { Image } from 'react-native';
import { useTheme } from '@/theme';
import type { Food } from '@/lib/types';
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
export function FoodThumb({ food, photo, size = 46 }: { food: Pick<Food, 'name' | 'source'>; photo?: string; size?: number }) {
  const { colors, dark } = useTheme();
  const category = useMemo(() => foodCategory(food), [food.name]);
  const r = size * 0.3;
  if (photo) return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: r }} />;
  const bg = mixHex(CATEGORY_TINT[category], colors.card, dark ? 0.22 : 0.16);
  return <FoodArt category={category} size={size} bg={bg} radius={r} />;
}

export function clockTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
