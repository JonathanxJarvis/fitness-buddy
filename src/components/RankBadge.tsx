import React, { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Polygon, Stop, Text as SvgText } from 'react-native-svg';
import { FONTS } from '@/theme';
import type { Stage } from '@/lib/progression';

/**
 * A faceted shield emblem in the tier's metal, with the division numeral.
 * Higher tiers get extra facets and a crown notch so the badge itself shows progress.
 */
export function RankBadge({ stage, size = 64, locked }: { stage: Stage; size?: number; locked?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { tier, division } = stage;
  const w = 100;
  const h = 112;
  const top = locked ? '#9AA39E' : tier.glow;
  const bottom = locked ? '#6B736F' : tier.color;
  const tierIndex = ['rookie', 'iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'champion', 'titan'].indexOf(tier.key);
  const shield = 'M50 4 L92 20 L92 60 C92 84 72 100 50 108 C28 100 8 84 8 60 L8 20 Z';
  return (
    <View style={{ width: size, height: (size * (h + 8)) / w }}>
      <Svg width="100%" height="100%" viewBox={`0 -8 ${w} ${h + 8}`}>
        <Defs>
          <LinearGradient id={`m${id}`} x1="0" y1="0" x2="0.3" y2="1">
            <Stop offset="0" stopColor={top} />
            <Stop offset="1" stopColor={bottom} />
          </LinearGradient>
          <LinearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
            <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={shield} fill={`url(#m${id})`} stroke={bottom} strokeWidth={3} />
        {/* inner bevel */}
        <Path d="M50 14 L83 26 L83 59 C83 78 67 91 50 98 C33 91 17 78 17 59 L17 26 Z" fill="none" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={2} />
        {/* facets appear from Silver up */}
        {tierIndex >= 3 && <Polygon points="50,14 83,26 50,40 17,26" fill="#FFFFFF" fillOpacity={0.18} />}
        {tierIndex >= 5 && <Polygon points="17,26 50,40 50,98 17,59" fill="#000000" fillOpacity={0.08} />}
        {/* crown notches from Diamond up */}
        {tierIndex >= 6 && <Path d="M34 6 L40 0 L46 5 L50 -1 L54 5 L60 0 L66 6" fill="none" stroke={tier.glow} strokeWidth={3} strokeLinejoin="round" />}
        <Path d={shield} fill={`url(#s${id})`} />
        <SvgText x="50" y={division ? 64 : 70} fontSize={division ? 30 : 26} fontFamily={FONTS.extrabold} fill="#FFFFFF" textAnchor="middle">
          {division || '★'}
        </SvgText>
        {division ? (
          <SvgText x="50" y="84" fontSize="11" fontFamily={FONTS.bold} fill="#FFFFFF" fillOpacity={0.85} textAnchor="middle" letterSpacing="1">
            {tier.name.toUpperCase()}
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}
