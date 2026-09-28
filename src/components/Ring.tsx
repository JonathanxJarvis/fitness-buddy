import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/theme';

/** A circular progress ring. Past 100% it wraps with a darker overlay lap. */
export function Ring({
  size,
  stroke,
  progress,
  color,
  children,
}: {
  size: number;
  stroke: number;
  progress: number;
  color: string;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, progress);
  const first = Math.min(1, p);
  const over = p > 1 ? Math.min(1, p - 1) : 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.track} strokeWidth={stroke} fill="none" />
        {first > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * first} ${c}`}
          />
        )}
        {over > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#000"
            strokeOpacity={0.25}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * over} ${c}`}
          />
        )}
      </Svg>
      {children}
    </View>
  );
}
