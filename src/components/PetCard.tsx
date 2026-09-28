import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Card, T } from './ui';
import { Kettle, type Species } from './Mascot';
import { useStore } from '@/store/StoreProvider';
import { petCare } from '@/lib/quests';
import { mascotSkin, petName, petSpecies } from '@/lib/pro';
import { useTheme } from '@/theme';

/** Your pet on the Today screen: its mood follows how you're looking after yourself. */
export function PetCard({ date }: { date: string }) {
  const { state } = useStore();
  const { colors } = useTheme();
  const care = useMemo(() => petCare(state, date), [state, date]);
  const name = petName(state);
  const bars = [
    { label: 'Fed', v: care.fed, color: '#F08A24' },
    { label: 'Fit', v: care.fit, color: '#22B573' },
    { label: 'Water', v: care.hydrated, color: '#3B9EF0' },
  ];
  return (
    <Pressable onPress={() => router.push('/pets')} accessibilityLabel={`${name}: ${care.line}`}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Kettle species={petSpecies(state) as Species} size={64} mood={care.mood} skin={mascotSkin(state)} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={12} weight="800" muted>{name.toUpperCase()}</T>
          <T size={14} weight="700" numberOfLines={2}>“{care.line}”</T>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            {bars.map((b) => (
              <View key={b.label} style={{ flex: 1 }}>
                <View style={{ height: 5, borderRadius: 3, backgroundColor: colors.track, overflow: 'hidden' }}>
                  <View style={{ width: `${Math.round(b.v * 100)}%`, height: 5, backgroundColor: b.color }} />
                </View>
                <T size={10} muted style={{ marginTop: 2 }}>{b.label}</T>
              </View>
            ))}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
