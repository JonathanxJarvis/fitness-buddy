import React, { useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/theme';
import { useTween } from './motion';

/**
 * A circular progress ring that animates to its value. Past 100% it wraps with
 * a darker overlay lap. Pass `gradient` for a two-tone stroke.
 */
export function Ring({
  size,
  stroke,
  progress,
  color,
  gradient,
  trackColor,
  delay = 0,
  children,
}: {
  size: number;
  stroke: number;
  progress: number;
  color: string;
  gradient?: readonly [string, string];
  trackColor?: string;
  delay?: number;
  children?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = useTween(Math.max(0, Number.isFinite(progress) ? progress : 0), 1000, delay);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const first = Math.min(1, p);
  const over = p > 1 ? Math.min(1, p - 1) : 0;
  const strokeColor = gradient ? `url(#g${id})` : color;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        {gradient && (
          <Defs>
            <LinearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradient[0]} />
              <Stop offset="1" stopColor={gradient[1]} />
            </LinearGradient>
          </Defs>
        )}
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor ?? colors.track} strokeWidth={stroke} fill="none" />
        {first > 0.001 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={strokeColor}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * first} ${c}`}
          />
        )}
        {over > 0.001 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#000"
            strokeOpacity={0.22}
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
