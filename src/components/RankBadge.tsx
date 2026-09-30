import React, { useId } from 'react';
import Svg, { Circle, Defs, Line, Polygon, RadialGradient, Stop } from 'react-native-svg';
import type { Stage } from '@/lib/progression';
import { RANK_FRAME_SLOT, RankFrame } from './RankFrame';

/**
 * The rank emblem: a game-style frame for the stage (ornaments grow with the
 * tier, division on the plate) holding a faceted crystal in the tier colors.
 * Square: size×size.
 */
export function RankBadge({ stage, size = 64, locked }: { stage: Stage; size?: number; locked?: boolean }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { tier } = stage;
  const glow = locked ? '#B4BAB7' : tier.glow;
  const color = locked ? '#7C8480' : tier.color;
  const slot = size * RANK_FRAME_SLOT;
  return (
    <RankFrame stage={stage} size={size} locked={locked}>
      <Svg width={slot} height={slot} viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`bg${id}`} cx="50%" cy="45%" r="55%">
            <Stop offset="0" stopColor={color} stopOpacity={0.55} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#bg${id})`} />
        {/* crown facets */}
        <Polygon points="50,14 22,36 36,36" fill={glow} />
        <Polygon points="50,14 36,36 64,36" fill="#FFFFFF" opacity={0.92} />
        <Polygon points="50,14 64,36 78,36" fill={color} />
        {/* pavilion facets */}
        <Polygon points="22,36 36,36 50,88" fill={color} />
        <Polygon points="36,36 64,36 50,88" fill={glow} />
        <Polygon points="64,36 78,36 50,88" fill="#000000" opacity={0.35} />
        <Polygon points="64,36 78,36 50,88" fill={color} opacity={0.6} />
        {/* edges */}
        <Polygon points="50,14 78,36 50,88 22,36" fill="none" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={2} strokeLinejoin="round" />
        <Line x1="22" y1="36" x2="78" y2="36" stroke="#FFFFFF" strokeOpacity={0.5} strokeWidth={1.5} />
        {/* sparkle */}
        {!locked && <Polygon points="28,12 30,18 36,20 30,22 28,28 26,22 20,20 26,18" fill="#FFFFFF" opacity={0.9} />}
      </Svg>
    </RankFrame>
  );
}
