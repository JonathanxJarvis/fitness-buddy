import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/** Soft gold for the thin outline around Pro features. */
export const PRO_GOLD = '#C9A24A';
export const proOutline = { borderWidth: 1, borderColor: PRO_GOLD + 'B3' } as const;

/**
 * The small cut-diamond that marks a Pro feature. Deliberately quiet: a
 * faceted gem, no label, so it reads as a hint rather than a paywall.
 */
export function ProMark({ size = 11, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const h = size * 0.86;
  return (
    <View accessible accessibilityLabel="Pro" style={[{ width: size, height: h }, style]}>
      <Svg width={size} height={h} viewBox="0 0 24 21">
        <Defs>
          <LinearGradient id="pm" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#8FE3FF" />
            <Stop offset="0.55" stopColor="#7A8CFF" />
            <Stop offset="1" stopColor="#B06BFF" />
          </LinearGradient>
        </Defs>
        {/* body */}
        <Path d="M5 1h14l5 6.5L12 20.5 0 7.5z" fill="url(#pm)" />
        {/* crown facets */}
        <Path d="M5 1l3 6.5h8L19 1z" fill="#fff" opacity={0.35} />
        <Path d="M0 7.5h24L12 20.5z" fill="#3B2A8C" opacity={0.18} />
        <Path d="M8 7.5L12 20.5 16 7.5z" fill="#fff" opacity={0.22} />
      </Svg>
    </View>
  );
}
