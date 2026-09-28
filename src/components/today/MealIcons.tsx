import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Ellipse, G, Line, Path } from 'react-native-svg';
import type { MealType } from '@/lib/types';

/**
 * One accent per meal, and a small scene for each that follows the sky through
 * the day: sunrise over coffee, a high sun over a bowl, the moon over dinner,
 * a spark for snacks.
 */
export const MEAL_ACCENT: Record<MealType, string> = {
  breakfast: '#EE9A2B',
  lunch: '#2E9E6B',
  dinner: '#5B5ED6',
  snacks: '#D9577E',
};

const SUN = '#FFE6A3';
const W = '#FFFFFF';

function Rays({ cx, cy, r, len, n = 8, color = SUN, width = 1.8, from = 0, to = 360 }: { cx: number; cy: number; r: number; len: number; n?: number; color?: string; width?: number; from?: number; to?: number }) {
  const full = to - from >= 360;
  return (
    <G stroke={color} strokeWidth={width} strokeLinecap="round">
      {Array.from({ length: n }, (_, i) => {
        const a = ((from + ((to - from) * i) / (full ? n : n - 1)) * Math.PI) / 180;
        return <Line key={i} x1={cx + Math.cos(a) * r} y1={cy + Math.sin(a) * r} x2={cx + Math.cos(a) * (r + len)} y2={cy + Math.sin(a) * (r + len)} />;
      })}
    </G>
  );
}

function Sparkle({ x, y, s, color = SUN }: { x: number; y: number; s: number; color?: string }) {
  return <Path d={`M${x} ${y - s}C${x + s * 0.18} ${y - s * 0.18} ${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y}C${x + s * 0.18} ${y + s * 0.18} ${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s}C${x - s * 0.18} ${y + s * 0.18} ${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y}C${x - s * 0.18} ${y - s * 0.18} ${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s}z`} fill={color} />;
}

const SCENES: Record<MealType, (accent: string) => React.ReactNode> = {
  breakfast: () => (
    <G>
      <Circle cx={15} cy={19} r={6} fill={SUN} />
      <Rays cx={15} cy={19} r={8.5} len={2.8} n={5} from={150} to={330} />
      <Path d="M29 11.5c-1.4-1.8 1.4-3.2 0-5M33.5 11.5c-1.4-1.8 1.4-3.2 0-5" fill="none" stroke={W} strokeOpacity={0.75} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M36.5 25.5c5 0 5 7.5-.5 7.5" fill="none" stroke={W} strokeWidth={2.6} />
      <Path d="M21 18h16v12.5a7.5 7.5 0 0 1-7.5 7.5h-1a7.5 7.5 0 0 1-7.5-7.5z" fill={W} />
      <Ellipse cx={29} cy={18.2} rx={7.6} ry={1.7} fill="#7A4A26" />
      <Path d="M25 23v8" stroke="#EE9A2B" strokeOpacity={0.35} strokeWidth={1.6} strokeLinecap="round" />
    </G>
  ),
  lunch: () => (
    <G>
      <Circle cx={36} cy={11} r={4} fill={SUN} />
      <Rays cx={36} cy={11} r={6} len={2.2} width={1.5} />
      <Circle cx={16} cy={23} r={5} fill="#A9EBC3" />
      <Circle cx={23} cy={20} r={5.8} fill="#D3F6E0" />
      <Circle cx={29.5} cy={23} r={4.5} fill="#A9EBC3" />
      <Circle cx={20} cy={24} r={2.6} fill="#FF9B87" />
      <Path d="M8 25.5h32c0 8-7 13.5-16 13.5S8 33.5 8 25.5z" fill={W} />
      <Path d="M12.5 30.5c2.6 3.6 6.4 5.4 11.5 5.6" fill="none" stroke="#2E9E6B" strokeOpacity={0.25} strokeWidth={1.6} strokeLinecap="round" />
    </G>
  ),
  dinner: (accent) => (
    <G>
      <Circle cx={36} cy={11.5} r={5.4} fill={SUN} />
      <Circle cx={38.6} cy={9.6} r={4.6} fill={accent} />
      <Sparkle x={12} y={10} s={2.6} />
      <Sparkle x={20} y={6.5} s={1.6} color="#D9DBFF" />
      <Ellipse cx={24} cy={37} rx={17} ry={3.2} fill="#CFD1FA" />
      <Path d="M9 36a15 14 0 0 1 30 0z" fill={W} />
      <Circle cx={24} cy={20.5} r={2.3} fill={W} />
      <Path d="M14 31c.6-4 3.4-7.4 7.4-8.6" fill="none" stroke={accent} strokeOpacity={0.3} strokeWidth={1.8} strokeLinecap="round" />
    </G>
  ),
  snacks: (accent) => (
    <G>
      <Sparkle x={11.5} y={12} s={3.6} />
      <Sparkle x={38} y={36} s={2} color="#FFD3E0" />
      <Path d="M24 17.5c-5.6-4.8-14-2.4-14 7.2 0 8.4 6.5 14.8 11.2 14 1.9-.3 3.7-.3 5.6 0 4.7.8 11.2-5.6 11.2-14 0-9.6-8.4-12-14-7.2z" fill="#FFF3EA" />
      <Circle cx={39} cy={27} r={4.6} fill={accent} />
      <Circle cx={36.5} cy={33} r={3.2} fill={accent} />
      <Path d="M24 17.5c.2-3.6 1.1-5.8 2.9-7.6" stroke="#8A5A3B" strokeWidth={1.8} strokeLinecap="round" fill="none" />
      <Path d="M25.5 13.8c2.3-4.2 7.4-4.2 8.9-2.5-2.4 2.7-6.2 3.4-8.9 2.5z" fill="#A6E3A9" />
      <Ellipse cx={16} cy={25} rx={2} ry={3.6} fill={accent} fillOpacity={0.18} transform="rotate(18 16 25)" />
    </G>
  ),
};

/** The meal's scene on a solid tile in its accent color. */
export function MealIcon({ meal, size = 44 }: { meal: MealType; size?: number }) {
  const accent = MEAL_ACCENT[meal];
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Svg width={size} height={size} viewBox="0 0 48 48">
        {SCENES[meal](accent)}
      </Svg>
    </View>
  );
}
