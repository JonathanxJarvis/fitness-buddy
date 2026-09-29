import React, { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Chip, Stepper, T } from './ui';
import { itemNutrients } from '@/lib/nutrition';
import { amountInGrams, gramServingIndex } from '@/lib/portion';
import { font, nutrientColors, radius, spacing, useTheme } from '@/theme';
import type { Food } from '@/lib/types';

const GRAM_PRESETS = [50, 100, 150, 200, 250];

/**
 * Pick how much you ate: type the weight from a kitchen scale in grams, tap a
 * preset, or choose a serving (e.g. "1 slice") and how many.
 */
export function PortionPicker({
  food,
  servingIndex,
  quantity,
  onChange,
}: {
  food: Food;
  servingIndex: number;
  quantity: number;
  onChange: (servingIndex: number, quantity: number) => void;
}) {
  const { colors } = useTheme();
  const gIdx = gramServingIndex(food);
  const grams = amountInGrams(food, servingIndex, quantity);
  const isGram = servingIndex === gIdx;
  const [text, setText] = useState(grams === null ? '' : String(Math.round(grams)));
  const kcal = Math.round(itemNutrients({ food, servingIndex, quantity }).calories);

  // Keep the box in sync when a chip or the stepper changes the amount.
  useEffect(() => {
    if (grams === null) return;
    const shown = parseFloat(text.replace(',', '.'));
    if (!Number.isFinite(shown) || Math.round(shown) !== Math.round(grams)) setText(String(Math.round(grams)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grams]);

  const setGrams = (g: number) => {
    if (gIdx < 0) return;
    onChange(gIdx, Math.max(0, g));
  };

  const servingChips = food.servings.map((s, i) => ({ s, i })).filter(({ s }) => !/^(1 g|1 oz|100 g)$/.test(s.label));

  const tap = (i: number) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(i, i === servingIndex ? quantity : 1);
  };

  return (
    <View>
      {servingChips.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ flexGrow: 0, flexShrink: 0, marginBottom: spacing.xs }}>
          {servingChips.map(({ s, i }) => (
            <Chip key={s.label} label={s.label} active={i === servingIndex} onPress={() => tap(i)} />
          ))}
        </ScrollView>
      )}
      {gIdx >= 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.cardAlt, borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 6 }}>
          <Ionicons name="scale-outline" size={22} color={colors.primary} />
          <TextInput
            value={text}
            onChangeText={(t) => {
              setText(t);
              const n = parseFloat(t.replace(',', '.'));
              setGrams(Number.isFinite(n) ? n : 0);
            }}
            keyboardType="decimal-pad"
            selectTextOnFocus
            accessibilityLabel="Amount in grams"
            style={{ flex: 1, minWidth: 0, color: colors.text, fontSize: 26, paddingVertical: 4, ...font('800') }}
          />
          <T size={16} weight="700" muted>g</T>
          <View style={{ width: 1, height: 26, backgroundColor: colors.border, marginHorizontal: 4 }} />
          <View style={{ alignItems: 'flex-end' }}>
            <T size={16} weight="800" color={nutrientColors.calories}>{kcal}</T>
            <T size={11} muted>kcal</T>
          </View>
        </View>
      )}

      {gIdx >= 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: spacing.sm }} style={{ flexGrow: 0, flexShrink: 0 }}>
          {GRAM_PRESETS.map((g) => (
            <Chip
              key={g}
              label={`${g} g`}
              active={isGram && Math.round(quantity) === g}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                setGrams(g);
              }}
            />
          ))}
        </ScrollView>
      )}

      {!isGram && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <T weight="700" numberOfLines={1} style={{ flex: 1 }}>
            {food.servings[servingIndex]?.label ?? 'Serving'} ×
          </T>
          <Stepper value={quantity} onChange={(q) => onChange(servingIndex, q)} step={0.5} />
        </View>
      )}
      {gIdx >= 0 && isGram && <T size={12} muted>Type the weight from your scale, or tap a portion.</T>}
    </View>
  );
}
