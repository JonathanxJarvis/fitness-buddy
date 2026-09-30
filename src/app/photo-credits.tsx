import React, { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { Card, Screen, T } from '@/components/ui';
import { MealImage } from '@/components/meal/MealImage';
import { PHOTO_CREDITS } from '@/components/meal/photoCredits';
import { findMeal } from '@/lib/meals';
import { radius, spacing, useTheme } from '@/theme';

const open = (url?: string) => url && Linking.openURL(url).catch(() => {});

/** Attribution for the meal photos, as their Creative Commons licenses require. */
export default function PhotoCredits() {
  const { colors } = useTheme();
  const rows = useMemo(
    () =>
      Object.entries(PHOTO_CREDITS)
        .map(([id, c]) => ({ id, c, name: findMeal(id)?.name ?? id }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );
  return (
    <Screen>
      <T muted size={13} style={{ marginBottom: spacing.md, lineHeight: 19 }}>
        Meal photos come from photographers on Flickr who shared them under Creative Commons licenses, via the Open Images dataset. They were cropped and resized for the app. Tap a photo’s title to see the original.
      </T>
      <Card style={{ paddingVertical: spacing.xs }}>
        {rows.map(({ id, c, name }, i) => (
          <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? StyleSheet.hairlineWidth : 0, borderTopColor: colors.border }}>
            <MealImage mealId={id} width={48} aspectRatio={1} rounded={radius.sm} iconSize={16} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={14} weight="700" numberOfLines={1}>{name}</T>
              <Pressable onPress={() => open(c.source)} accessibilityRole="link" hitSlop={4}>
                <T size={12} color={colors.primary} numberOfLines={1}>“{c.title}”</T>
              </Pressable>
              <T size={12} muted numberOfLines={1}>
                by {c.author} ·{' '}
                <T size={12} muted style={{ textDecorationLine: 'underline' }} onPress={() => open(c.licenseUrl)}>{c.license}</T>
              </T>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
