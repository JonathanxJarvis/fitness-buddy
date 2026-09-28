import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { nativeDriver } from './motion';

export type Mood = 'happy' | 'pumped' | 'proud' | 'hungry' | 'sleepy' | 'wink';

/** Kettle outfits: bell body colors. 'classic' is free; the rest come with Pro. */
export const SKINS: Record<string, { name: string; body: string; shade: string; dark: string }> = {
  classic: { name: 'Classic', body: '#1F4A36', shade: '#2E6B4E', dark: '#1C3A2C' },
  gold: { name: 'Gold', body: '#9A6B12', shade: '#E0A82E', dark: '#6E4B0B' },
  midnight: { name: 'Midnight', body: '#1E2250', shade: '#3A43A0', dark: '#151837' },
  cherry: { name: 'Cherry', body: '#6E1830', shade: '#B2304F', dark: '#4F1022' },
  neon: { name: 'Neon', body: '#0F2A2A', shade: '#19D3C5', dark: '#0A1C1C' },
};

/**
 * Kettle: a small kettlebell with a sweatband who cheers you on. Drawn in SVG
 * so it stays crisp at any size; the band color follows your rank tier.
 */
export function Kettle({ size = 72, mood = 'happy', band = '#22B573', animate = true, skin = 'classic' }: { size?: number; mood?: Mood; band?: string; animate?: boolean; skin?: string }) {
  const c = SKINS[skin] ?? SKINS.classic;
  const bob = useRef(new Animated.Value(0)).current;
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!animate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
      ]),
    );
    loop.start();
    let t: ReturnType<typeof setTimeout>;
    const schedule = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 140);
        schedule();
      }, 2200 + Math.random() * 2600);
    };
    schedule();
    return () => {
      loop.stop();
      clearTimeout(t);
    };
  }, [animate, bob]);

  const eyesClosed = blink || mood === 'sleepy';
  const flex = mood === 'pumped' || mood === 'proud';

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.05] }) }] }}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        {/* shadow */}
        <Ellipse cx="50" cy="95" rx="24" ry="3.5" fill="#000" opacity={0.12} />
        {/* handle */}
        <Path d="M32 34 C30 10 70 10 68 34" fill="none" stroke={c.dark} strokeWidth={9} strokeLinecap="round" />
        <Path d="M36 32 C35 16 65 16 64 32" fill="none" stroke={c.shade} strokeWidth={3} strokeLinecap="round" />
        {/* arms */}
        {flex ? (
          <G>
            <Path d="M20 60 Q8 52 12 38" stroke={c.dark} strokeWidth={7} strokeLinecap="round" fill="none" />
            <Circle cx="12" cy="36" r="6" fill={c.dark} />
            <Path d="M80 60 Q92 52 88 38" stroke={c.dark} strokeWidth={7} strokeLinecap="round" fill="none" />
            <Circle cx="88" cy="36" r="6" fill={c.dark} />
          </G>
        ) : (
          <G>
            <Path d="M21 64 Q12 70 14 78" stroke={c.dark} strokeWidth={7} strokeLinecap="round" fill="none" />
            <Path d="M79 64 Q88 58 90 48" stroke={c.dark} strokeWidth={7} strokeLinecap="round" fill="none" />
            <Circle cx="90" cy="46" r="5" fill={c.dark} />
          </G>
        )}
        {/* bell body */}
        <Circle cx="50" cy="62" r="31" fill={c.body} />
        <Circle cx="50" cy="62" r="31" fill={c.shade} opacity={0.55} />
        <Ellipse cx="40" cy="48" rx="12" ry="7" fill="#FFFFFF" opacity={0.14} transform="rotate(-25 40 48)" />
        {/* flat base */}
        <Rect x="33" y="88" width="34" height="5" rx="2.5" fill={c.dark} />
        {/* sweatband */}
        <Path d="M22 48 Q50 38 78 48 L77 55 Q50 46 23 55 Z" fill={band} />
        <Path d="M76 50 L86 45 L84 53 Z" fill={band} />
        {/* eyes */}
        {eyesClosed ? (
          <G>
            <Path d="M36 66 Q40 69 44 66" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" fill="none" />
            <Path d="M56 66 Q60 69 64 66" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" fill="none" />
          </G>
        ) : mood === 'wink' ? (
          <G>
            <Circle cx="40" cy="65" r="5.5" fill="#fff" />
            <Circle cx="41" cy="66" r="3" fill="#0B1A12" />
            <Path d="M56 66 Q60 62 64 66" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" fill="none" />
          </G>
        ) : (
          <G>
            <Circle cx="40" cy="65" r="5.5" fill="#fff" />
            <Circle cx="60" cy="65" r="5.5" fill="#fff" />
            <Circle cx={mood === 'hungry' ? 42 : 41} cy="66" r="3" fill="#0B1A12" />
            <Circle cx={mood === 'hungry' ? 62 : 61} cy="66" r="3" fill="#0B1A12" />
            <Circle cx="42" cy="64.5" r="1" fill="#fff" />
            <Circle cx="62" cy="64.5" r="1" fill="#fff" />
          </G>
        )}
        {/* determined brows when pumped */}
        {flex && (
          <G>
            <Path d="M34 57 L45 59" stroke="#0B1A12" strokeWidth={2.5} strokeLinecap="round" />
            <Path d="M66 57 L55 59" stroke="#0B1A12" strokeWidth={2.5} strokeLinecap="round" />
          </G>
        )}
        {/* cheeks */}
        <Circle cx="32" cy="74" r="4" fill="#FF8FA3" opacity={0.55} />
        <Circle cx="68" cy="74" r="4" fill="#FF8FA3" opacity={0.55} />
        {/* mouth */}
        {mood === 'hungry' ? (
          <Ellipse cx="50" cy="78" rx="4" ry="4.5" fill="#0B1A12" />
        ) : mood === 'sleepy' ? (
          <Path d="M46 78 L54 78" stroke="#0B1A12" strokeWidth={2.4} strokeLinecap="round" />
        ) : (
          <Path d={flex ? 'M42 75 Q50 85 58 75 Z' : 'M44 76 Q50 82 56 76'} stroke="#0B1A12" strokeWidth={2.4} strokeLinecap="round" fill={flex ? '#0B1A12' : 'none'} />
        )}
      </Svg>
    </Animated.View>
  );
}

/** A springy pop-in used for the mascot toast. */
export function usePop(visible: boolean) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: visible ? 1 : 0, useNativeDriver: nativeDriver, speed: 14, bounciness: visible ? 12 : 0 }).start();
  }, [visible, v]);
  return v;
}
