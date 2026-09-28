import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Badge, CountUp, Sheet, T } from '@/components/ui';
import { FadeIn, PressScale, useTween } from '@/components/motion';
import { FoodThumb, clockTime } from '@/components/FoodThumb';
import { useStore } from '@/store/StoreProvider';
import { spacing, useTheme } from '@/theme';
import { itemNutrients, servingText } from '@/lib/nutrition';
import type { DiaryEntry, MealType } from '@/lib/types';
import { MEAL_ACCENT, MealIcon } from './MealIcons';
import { mealSummary, shortFoodName } from './mealSummary';

/** Up to three overlapping food pictures, each ringed in the card color. */
function ThumbStack({ items, size = 20 }: { items: DiaryEntry[]; size?: number }) {
  const { colors } = useTheme();
  const seen = new Set<string>();
  const picks: DiaryEntry[] = [];
  for (const e of items) {
    const k = shortFoodName(e.food.name).toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    picks.push(e);
    if (picks.length === 3) break;
  }
  return (
    <View style={{ flexDirection: 'row' }}>
      {picks.map((e, i) => (
        <View
          key={e.id}
          style={{ marginLeft: i ? -size * 0.36 : 0, zIndex: 3 - i, borderRadius: size * 0.34, borderWidth: 1.5, borderColor: colors.card, backgroundColor: colors.card }}
        >
          <FoodThumb food={e.food} photo={e.photo} size={size} />
        </View>
      ))}
    </View>
  );
}

function EntryRow({ e, onOpen }: { e: DiaryEntry; onOpen: () => void }) {
  const { colors } = useTheme();
  const { dispatch } = useStore();
  const [confirm, setConfirm] = useState(false);
  const n = itemNutrients(e);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 2600);
    return () => clearTimeout(t);
  }, [confirm]);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
      <PressScale onPress={onOpen} scaleTo={0.98} accessibilityLabel={`Edit ${e.food.name}`} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <FoodThumb food={e.food} photo={e.photo} size={42} />
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
      <PressScale
        accessibilityLabel={confirm ? `Confirm remove ${e.food.name}` : `Remove ${e.food.name}`}
        scaleTo={0.88}
        onPress={() => {
          if (!confirm) {
            Haptics.selectionAsync().catch(() => {});
            setConfirm(true);
            return;
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
          dispatch({ type: 'deleteEntry', id: e.id });
        }}
        style={{
          height: 30,
          minWidth: 30,
          paddingHorizontal: confirm ? 10 : 0,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: confirm ? colors.danger : colors.track,
        }}
      >
        {confirm ? (
          <T size={12} weight="800" color="#fff">Remove</T>
        ) : (
          <Svg width={12} height={12} viewBox="0 0 12 12">
            <Path d="M3 3l6 6M9 3l-6 6" stroke={colors.textMuted} strokeWidth={1.8} strokeLinecap="round" />
          </Svg>
        )}
      </PressScale>
    </View>
  );
}

/**
 * A meal: its scene icon, a progress sliver in the meal's colour, and one quiet
 * line of what was eaten. The card is the same height before and after logging;
 * tapping it opens the full list, where items can be edited or removed.
 */
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
  const [open, setOpen] = useState(false);
  const accent = MEAL_ACCENT[meal];
  const kcal = items.reduce((s, e) => s + itemNutrients(e).calories, 0);
  const protein = items.reduce((s, e) => s + itemNutrients(e).protein, 0);
  const p = useTween(target ? Math.min(1, kcal / target) : 0, 900, delay + 150);
  const over = kcal > target * 1.15;
  // How many characters fit beside the thumbnails (and the "+N more" tag when there
  // is one); 12 px text runs about 5.9 px per character.
  const [lineW, setLineW] = useState(0);
  const names = items.map((e) => e.food.name);
  const thumbsW = Math.min(3, new Set(names.map((n) => shortFoodName(n).toLowerCase())).size) * 16 + 13;
  const chars = (px: number) => (lineW ? Math.max(8, Math.floor(px / 5.9)) : 18);
  const all = mealSummary(names, 3, chars(lineW - thumbsW));
  const summary = all.more === 0 ? all : mealSummary(names, 3, chars(lineW - thumbsW - 50));
  const has = items.length > 0;

  // Close the sheet before navigating so the next screen isn't pushed under the modal.
  const after = (fn: () => void) => {
    setOpen(false);
    setTimeout(fn, 230);
  };
  const openCard = () => {
    if (!has) return onAdd();
    Haptics.selectionAsync().catch(() => {});
    setOpen(true);
  };
  // Last item removed while the sheet is open: nothing left to show.
  useEffect(() => {
    if (open && !has) setOpen(false);
  }, [open, has]);

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
          <PressScale onPress={openCard} scaleTo={0.92} accessibilityLabel={has ? `Show what you had for ${label}` : `${label} options`}>
            <MealIcon meal={meal} size={46} />
          </PressScale>
          <Pressable style={{ flex: 1 }} onPress={openCard} accessibilityLabel={has ? `Show what you had for ${label}` : `${label} options`}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T size={16} weight="800" style={{ flexShrink: 0 }}>{label}</T>
              {current && (
                <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: accent + (dark ? '33' : '1F') }}>
                  <T size={10} weight="800" color={accent} style={{ letterSpacing: 0.5 }}>UP NEXT</T>
                </View>
              )}
              <View style={{ flex: 1 }} />
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <CountUp value={Math.round(kcal)} delay={delay} size={13} weight="800" color={over ? colors.warning : colors.text} />
                <T size={12} muted>{` / ${target}`}</T>
              </View>
            </View>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.track, marginTop: 6, overflow: 'hidden' }}>
              <View style={{ width: `${p * 100}%`, height: 4, borderRadius: 2, backgroundColor: over ? colors.warning : accent }} />
            </View>
            <View onLayout={(ev) => setLineW(Math.round(ev.nativeEvent.layout.width))} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, height: 22 }}>
              {has ? (
                <>
                  <ThumbStack items={items} />
                  <T size={12} muted numberOfLines={1} style={{ flexShrink: 1 }}>
                    {summary.text}
                  </T>
                  {summary.more > 0 && (
                    <T size={12} weight="700" color={accent} style={{ flexShrink: 0 }}>
                      +{summary.more} more
                    </T>
                  )}
                </>
              ) : (
                <T size={12} muted style={{ opacity: 0.7 }}>Nothing logged yet</T>
              )}
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
      </View>

      <Sheet visible={open} onClose={() => setOpen(false)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: spacing.sm }}>
          <MealIcon meal={meal} size={40} />
          <View style={{ flex: 1 }}>
            <T size={18} weight="800">{label}</T>
            <T size={12} muted style={{ marginTop: 1 }}>
              {Math.round(kcal)} of {target} kcal · {Math.round(protein)} g protein · {items.length} {items.length === 1 ? 'item' : 'items'}
            </T>
          </View>
        </View>
        <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
          <View style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: 2 }}>
            {items.map((e, i) => (
              <FadeIn key={e.id} delay={40 + i * 40} offset={8}>
                <EntryRow e={e} onOpen={() => after(() => router.push({ pathname: '/food', params: { entryId: e.id } }))} />
              </FadeIn>
            ))}
          </View>
        </ScrollView>
        <PressScale
          accessibilityLabel={`Add food to ${label}`}
          onPress={() => after(onAdd)}
          scaleTo={0.97}
          style={{ marginTop: spacing.md, height: 48, borderRadius: 16, backgroundColor: accent + (dark ? '2E' : '1A'), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Svg width={14} height={14} viewBox="0 0 16 16">
            <Path d="M8 2.5v11M2.5 8h11" stroke={accent} strokeWidth={2.4} strokeLinecap="round" />
          </Svg>
          <T weight="800" color={accent}>Add to {label.toLowerCase()}</T>
        </PressScale>
      </Sheet>
    </FadeIn>
  );
}
