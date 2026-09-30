import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** A small treasure chest for maps and lists: ready (glowing), opened, or locked. */
export function MiniChest({ size = 40, state = 'ready' }: { size?: number; state?: 'ready' | 'open' | 'locked' }) {
  const wood = state === 'locked' ? '#4A4E55' : '#8A4B22';
  const woodDark = state === 'locked' ? '#2E3136' : '#5A2E12';
  const metal = state === 'locked' ? '#8C939B' : '#F2C14E';
  const metalDark = state === 'locked' ? '#5E646B' : '#A8740F';
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      {state === 'open' ? (
        <>
          <Path d="M7 16 L10 6 Q20 3 30 6 L33 16 Z" fill={woodDark} stroke="#2A1406" strokeWidth={1.2} strokeLinejoin="round" />
          <Path d="M9 16 Q20 13 31 16 L31 19 L9 19 Z" fill="#2A1406" />
        </>
      ) : (
        <>
          <Path d="M6 19 L6 14 Q6 6 20 6 Q34 6 34 14 L34 19 Z" fill={wood} stroke="#2A1406" strokeWidth={1.2} />
          <Path d="M10 19 L10 11 Q11 8 13 7.4 L13 19 Z M30 19 L30 11 Q29 8 27 7.4 L27 19 Z" fill={metal} />
          <Path d="M10 10 Q16 7.5 22 7.5" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={1.2} fill="none" strokeLinecap="round" />
        </>
      )}
      <Rect x={6} y={18} width={28} height={16} rx={2.5} fill={wood} stroke="#2A1406" strokeWidth={1.2} />
      <Rect x={6} y={18} width={28} height={3} fill="#000000" opacity={0.2} />
      <Rect x={10} y={18} width={3} height={16} fill={metal} />
      <Rect x={27} y={18} width={3} height={16} fill={metal} />
      <Rect x={16.5} y={16} width={7} height={8.5} rx={1.6} fill={metal} stroke={metalDark} strokeWidth={1} />
      {state === 'locked' ? <Path d="M18.4 18.6 L18.4 17.4 Q20 15.4 21.6 17.4 L21.6 18.6" stroke={metalDark} strokeWidth={1} fill="none" /> : <Circle cx={20} cy={20} r={1.2} fill={metalDark} />}
      <Rect x={19.4} y={20.6} width={1.2} height={2.4} fill={metalDark} />
    </Svg>
  );
}
