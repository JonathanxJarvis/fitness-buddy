import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { nativeDriver } from '../motion';

/** A barbell seen end-on: plates slide in on mount. Used on training days. */
export function BarbellGlyph({ color, size = 88, track, done }: { color: string; size?: number; track: string; done?: boolean }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, useNativeDriver: nativeDriver, damping: 12, stiffness: 140, mass: 0.8 }).start();
  }, [v]);
  return (
    <Animated.View style={{ width: size, height: size, opacity: v, transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-24deg', '0deg'] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }] }}>
      <Svg width={size} height={size} viewBox="0 0 88 88">
        <Circle cx={44} cy={44} r={42} fill={color} opacity={0.12} />
        <Circle cx={44} cy={44} r={33} fill="none" stroke={color} strokeOpacity={0.25} strokeWidth={1} strokeDasharray="2 4" />
        {/* bar */}
        <Rect x={10} y={41.5} width={68} height={5} rx={2.5} fill={track} />
        {/* left plates */}
        <Rect x={17} y={22} width={8} height={44} rx={3} fill={color} />
        <Rect x={26} y={28} width={6} height={32} rx={2.5} fill={color} opacity={0.75} />
        {/* right plates */}
        <Rect x={63} y={22} width={8} height={44} rx={3} fill={color} />
        <Rect x={56} y={28} width={6} height={32} rx={2.5} fill={color} opacity={0.75} />
        {done ? (
          <G>
            <Circle cx={44} cy={44} r={11} fill={color} />
            <Path d="M38.5 44.2l3.6 3.6 7.4-7.6" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </G>
        ) : null}
      </Svg>
    </Animated.View>
  );
}

/** A crescent moon that slowly breathes, with a couple of stars. Used on rest days. */
export function MoonGlyph({ color, size = 88 }: { color: string; size?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
        Animated.timing(v, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: nativeDriver }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [v]);
  return (
    <Animated.View style={{ width: size, height: size, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [2, -3] }) }] }}>
      <Svg width={size} height={size} viewBox="0 0 88 88">
        <Circle cx={44} cy={44} r={42} fill={color} opacity={0.1} />
        <Path d="M52 18a26 26 0 1 0 18 40A22 22 0 0 1 52 18z" fill={color} />
        <Path d="M22 22l1.6 3.4 3.4 1.6-3.4 1.6L22 32l-1.6-3.4L17 27l3.4-1.6z" fill={color} opacity={0.7} />
        <Circle cx={68} cy={26} r={2} fill={color} opacity={0.6} />
        <Line x1={24} y1={72} x2={40} y2={72} stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.4} />
        <Line x1={46} y1={72} x2={52} y2={72} stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.25} />
      </Svg>
    </Animated.View>
  );
}

/** Seven small bars showing a week's rhythm: tall = training, short = rest. */
export function WeekRhythm({ week, color, rest, height = 16 }: { week: (string | null)[]; color: string; rest: string; height?: number }) {
  const w = 7 * 6 + 6 * 3;
  return (
    <Svg width={w} height={height} viewBox={`0 0 ${w} ${height}`}>
      {week.map((d, i) => (
        <Rect key={i} x={i * 9} y={d ? 0 : height - 4} width={6} height={d ? height : 4} rx={2} fill={d ? color : rest} />
      ))}
    </Svg>
  );
}

/** Tiny crescent for rest days in the week strip. */
export function MiniMoon({ color, size = 12 }: { color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      <Path d="M7.2 1.2a4.8 4.8 0 1 0 3.6 7.2A4 4 0 0 1 7.2 1.2z" fill={color} />
    </Svg>
  );
}
