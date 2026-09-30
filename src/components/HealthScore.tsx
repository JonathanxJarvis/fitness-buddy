import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, CountUp, T } from './ui';
import { Ring } from './Ring';
import { useTheme } from '@/theme';
import type { HealthScore } from '@/lib/nutrition';

export function scoreColor(score: number) {
  return score >= 80 ? '#22B573' : score >= 60 ? '#8BC34A' : score >= 45 ? '#F2A93B' : '#E5664F';
}

export function HealthScoreCard({ score }: { score: HealthScore }) {
  const { colors } = useTheme();
  const color = scoreColor(score.score);
  const label = score.score >= 80 ? 'Great choice' : score.score >= 60 ? 'Solid choice' : score.score >= 45 ? 'Okay in moderation' : 'An occasional treat';
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <View style={{ flex: 1 }}>
          <T size={12} weight="800" muted style={{ letterSpacing: 0.8 }}>OVERALL HEALTH</T>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
            <CountUp value={score.score} size={34} weight="800" color={color} />
            <T size={15} muted weight="600">/100</T>
          </View>
          <T weight="700" style={{ marginTop: 2 }}>{label}</T>
        </View>
        <Ring size={78} stroke={8} progress={score.score / 100} color={color} gradient={[color + 'AA', color]}>
          <T size={24} weight="800" color={color}>{score.grade}</T>
        </Ring>
      </View>
      {score.highlights.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
          {score.highlights.map((h) => (
            <View key={h.text} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: (h.good ? '#22B573' : colors.warning) + '1F' }}>
              <Ionicons name={h.good ? 'checkmark-circle' : 'alert-circle'} size={13} color={h.good ? '#22B573' : colors.warning} />
              <T size={12} weight="700" color={h.good ? '#22B573' : colors.warning}>{h.text}</T>
            </View>
          ))}
        </View>
      )}
    </Card>
  );
}
