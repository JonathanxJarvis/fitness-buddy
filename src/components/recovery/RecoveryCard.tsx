import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, T } from '@/components/ui';
import { PressScale } from '@/components/motion';
import { ProMark } from '@/components/ProMark';
import { useStore } from '@/store/StoreProvider';
import { isPro } from '@/lib/pro';
import { regionList } from '@/lib/recovery';
import { RecoveryBody, RecoveryLegend, SAMPLE_RECOVERY } from './RecoveryMap';
import { useRecoveryToday } from './useRecoveryToday';
import { spacing, useTheme } from '@/theme';

/** Compact recovery map for the Progress screen; opens the full map (or Pro for free users). */
export function RecoveryCard() {
  const { state } = useStore();
  const { colors } = useTheme();
  const pro = isPro(state);
  const { rec, ranked, counts } = useRecoveryToday();
  const tired = Object.values(rec).filter((r) => r.state === 'tired').map((r) => r.region);
  const best = ranked[0];

  const line = !pro
    ? 'See which muscles are fresh or still tired, and what to train today.'
    : tired.length
      ? `${regionList(tired, 2)} still tired.`
      : counts.recovering
        ? 'Nothing tired, a few muscles still recovering.'
        : 'Every muscle is fresh.';

  return (
    <PressScale
      onPress={() => (pro ? router.push('/recovery') : router.push({ pathname: '/pro', params: { feature: 'recovery' } }))}
      accessibilityRole="button"
      accessibilityLabel="Open recovery map"
      scaleTo={0.98}
    >
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }}>
        <View style={{ opacity: pro ? 1 : 0.5 }}>
          <RecoveryBody rec={pro ? rec : SAMPLE_RECOVERY} size={108} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <T weight="800" size={16}>Recovery</T>
            <ProMark size={11} />
          </View>
          <T size={13} muted>{line}</T>
          {pro && best ? (
            <T size={13} weight="700" color={colors.primary} numberOfLines={1}>Best today: {best.session.name}</T>
          ) : null}
          {pro && (
            <View style={{ alignItems: 'flex-start', marginTop: 4 }}>
              <RecoveryLegend counts={counts} align="flex-start" />
            </View>
          )}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Card>
    </PressScale>
  );
}
