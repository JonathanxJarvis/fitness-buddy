import React from 'react';
import { Image, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { T } from './ui';
import { nutrientColors } from '@/theme';
import type { Food } from '@/lib/types';

const TINTS = [nutrientColors.calories, nutrientColors.protein, nutrientColors.carbs, nutrientColors.fat, nutrientColors.fiber, nutrientColors.steps];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** A meal photo when there is one, otherwise a tinted monogram tile. */
export function FoodThumb({ food, photo, size = 46 }: { food: Pick<Food, 'name' | 'source'>; photo?: string; size?: number }) {
  const r = size * 0.3;
  if (photo) return <Image source={{ uri: photo }} style={{ width: size, height: size, borderRadius: r }} />;
  const tint = TINTS[hash(food.name) % TINTS.length];
  return (
    <View style={{ width: size, height: size, borderRadius: r, backgroundColor: tint + '22', alignItems: 'center', justifyContent: 'center' }}>
      {food.source === 'ai' ? (
        <Ionicons name="sparkles" size={size * 0.42} color={tint} />
      ) : food.source === 'recipe' ? (
        <Ionicons name="book" size={size * 0.4} color={tint} />
      ) : (
        <T size={size * 0.4} weight="800" color={tint}>
          {food.name.trim().charAt(0).toUpperCase()}
        </T>
      )}
    </View>
  );
}

export function clockTime(ms: number): string {
  const d = new Date(ms);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
