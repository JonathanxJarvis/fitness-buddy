import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { T } from './ui';
import { PressScale } from './motion';
import { Pet } from './Mascot';
import { usePetLook } from './pet/usePetLook';
import { TIERS } from '@/lib/progression';
import { radius, useTheme } from '@/theme';

/** Your pet on the Today screen: it trains when you train, glows when you eat well and carries water when you drink. */
export function PetCard({ date }: { date: string }) {
  const { colors, dark } = useTheme();
  const look = usePetLook(date);
  const { care, name } = look;
  const tier = TIERS[look.tier];
  const stats = [
    { label: 'Train', v: care.fit, color: '#22B573' },
    { label: 'Food', v: care.fed, color: '#F08A24' },
    { label: 'Water', v: care.hydrated, color: '#3B9EF0' },
  ];
  return (
    <PressScale onPress={() => router.push('/pets')} accessibilityRole="button" accessibilityLabel={`${name}: ${care.line}`} style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'stretch', borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: dark ? colors.border : 'rgba(15,40,25,0.05)', overflow: 'hidden' }}>
        <View style={{ width: 104, alignItems: 'center', justifyContent: 'flex-end', paddingTop: 6 }}>
          <LinearGradient colors={[tier.color + (dark ? '40' : '2E'), tier.color + '00']} start={{ x: 0.5, y: 1 }} end={{ x: 0.5, y: 0 }} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
          <Pet species={look.species} size={96} mood={care.mood} skin={look.skin} tier={look.tier} aura={look.aura} care={care} />
        </View>
        <View style={{ flex: 1, minWidth: 0, paddingVertical: 12, paddingRight: 14, paddingLeft: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
            <T size={15} weight="800" numberOfLines={1} style={{ flexShrink: 1 }}>{name}</T>
            <T size={10} weight="800" color={tier.color} style={{ letterSpacing: 1 }}>{tier.name.toUpperCase()}</T>
          </View>
          <T size={13} weight="600" muted numberOfLines={2} style={{ marginTop: 2 }}>“{care.line}”</T>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 9 }}>
            {stats.map((s) => (
              <View key={s.label} style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 2 }}>
                  {[0, 1, 2, 3].map((i) => (
                    <View key={i} style={{ flex: 1, height: 5, borderRadius: 2, backgroundColor: s.v >= (i + 1) / 4 - 0.01 ? s.color : colors.track }} />
                  ))}
                </View>
                <T size={10} weight="700" muted style={{ marginTop: 3 }}>{s.label}</T>
              </View>
            ))}
          </View>
        </View>
      </View>
    </PressScale>
  );
}
