import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { SocialEvent } from '@/lib/types';

/** Small hand-drawn marks for the activity feed and stats (16×16 grid). */
export const EVENT_STYLE: Record<SocialEvent['kind'], { label: string; color: string }> = {
  pr: { label: 'Personal record', color: '#D59A1C' },
  workout: { label: 'Workout', color: '#1F9D64' },
  rank: { label: 'Rank up', color: '#7C5CE0' },
  quests: { label: 'Daily quests', color: '#D9722B' },
  streak: { label: 'Streak', color: '#E0523F' },
};

export function EventGlyph({ kind, size = 14, color }: { kind: SocialEvent['kind']; size?: number; color?: string }) {
  const c = color ?? EVENT_STYLE[kind].color;
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      {kind === 'pr' && (
        <>
          <Path d="M5 1.5h6v4.2a3 3 0 0 1-6 0z" fill={c} />
          <Path d="M5 3H2.8c0 2 1 3.2 2.4 3.5M11 3h2.2c0 2-1 3.2-2.4 3.5" stroke={c} strokeWidth={1.3} fill="none" strokeLinecap="round" />
          <Rect x={7.2} y={8.5} width={1.6} height={3} fill={c} />
          <Rect x={4.5} y={11.5} width={7} height={2.6} rx={1} fill={c} />
        </>
      )}
      {kind === 'workout' && (
        <>
          <Rect x={1} y={5} width={2.6} height={6} rx={1} fill={c} />
          <Rect x={12.4} y={5} width={2.6} height={6} rx={1} fill={c} />
          <Rect x={3.4} y={3.5} width={2.4} height={9} rx={1} fill={c} />
          <Rect x={10.2} y={3.5} width={2.4} height={9} rx={1} fill={c} />
          <Rect x={5.6} y={7.1} width={4.8} height={1.8} fill={c} />
        </>
      )}
      {kind === 'rank' && (
        <>
          <Path d="M3 9.5 8 4.5l5 5" stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M3 13.5 8 8.5l5 5" stroke={c} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.45} />
        </>
      )}
      {kind === 'quests' && (
        <>
          <Circle cx={8} cy={8} r={6.5} fill={c} />
          <Path d="M5 8.2 7.1 10.3 11.2 6" stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === 'streak' && <FlamePath color={c} />}
    </Svg>
  );
}

function FlamePath({ color }: { color: string }) {
  return (
    <>
      <Path d="M8 1c.6 2.4 4.6 4.2 4.6 8.4A4.6 4.6 0 0 1 3.4 9.4c0-2 1-3.2 2-4 .1 1.3.7 2.1 1.5 2.4C6.7 5.5 7 3 8 1z" fill={color} />
      <Path d="M8 8.2c.3 1.2 2.1 1.9 2.1 3.8a2.1 2.1 0 0 1-4.2 0c0-1 .6-1.6 1.1-2 .1.5.3.8.6.9-.1-1 .1-1.9.4-2.7z" fill="#fff" opacity={0.55} />
    </>
  );
}

/** A small flame for streak counts. */
export function Flame({ size = 12, color = '#E0523F' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <FlamePath color={color} />
    </Svg>
  );
}
