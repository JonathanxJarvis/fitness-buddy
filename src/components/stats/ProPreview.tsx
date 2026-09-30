import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Button, T } from '@/components/ui';
import { ProMark } from '@/components/ProMark';
import { spacing, useTheme } from '@/theme';

/**
 * A quiet look at a Pro feature for free users: a sample of the real thing,
 * faded under the card color, with one line about it and a way to Pro.
 */
export function ProPreview({ feature, title, body, children }: { feature: string; title: string; body: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View>
      <View style={{ opacity: 0.42, pointerEvents: 'none', maxHeight: 190, overflow: 'hidden' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {children}
        <LinearGradient colors={[colors.card + '00', colors.card]} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 }} />
      </View>
      <View style={{ alignItems: 'center', marginTop: -spacing.lg, gap: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <ProMark size={12} />
          <T weight="800" size={16}>{title}</T>
        </View>
        <T muted size={13} center style={{ maxWidth: 280 }}>{body}</T>
        <Button small variant="secondary" title="See Pro" pro onPress={() => router.push({ pathname: '/pro', params: { feature } })} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}
