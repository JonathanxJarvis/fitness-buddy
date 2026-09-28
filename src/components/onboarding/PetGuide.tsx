import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Pet, type Mood, type Species } from '@/components/Mascot';
import { nativeDriver } from '@/components/motion';
import { T } from '@/components/ui';
import { font, useTheme } from '@/theme';
import type { Pep } from './script';

/** Reveals `text` a few characters at a time. Returns how many are showing and a way to skip ahead. */
export function useTypewriter(text: string, cps = 48) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    const step = Math.max(1, Math.round(cps / 30));
    const id = setInterval(() => {
      setN((c) => {
        if (c >= text.length) {
          clearInterval(id);
          return c;
        }
        return Math.min(text.length, c + step);
      });
    }, 1000 / 30);
    return () => clearInterval(id);
  }, [text, cps]);
  return { shown: n, done: n >= text.length, skip: () => setN(text.length) };
}

/**
 * The pet with a speech bubble. The line types itself out; the pet hops
 * whenever `beat` changes (a new question, or a reaction to your answer).
 */
export function PetGuide({
  species,
  mood,
  line,
  beat,
  pep,
  size = 92,
}: {
  species: Species;
  mood: Mood;
  line: string;
  beat: string | number;
  pep?: Pep[];
  size?: number;
}) {
  const { colors, dark } = useTheme();
  const { shown, done, skip } = useTypewriter(line);

  const hop = useRef(new Animated.Value(0)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      hop.setValue(1);
      Animated.spring(hop, { toValue: 0, useNativeDriver: nativeDriver, speed: 6, bounciness: 10 }).start();
      return;
    }
    Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: nativeDriver }),
      Animated.spring(hop, { toValue: 0, useNativeDriver: nativeDriver, speed: 14, bounciness: 14 }),
    ]).start();
  }, [beat, hop]);

  const bubbleBg = dark ? '#16211B' : colors.card;
  const bubbleEdge = dark ? '#26352C' : colors.border;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
        <Animated.View
          style={{
            transform: [
              { translateY: hop.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) },
              { scaleY: hop.interpolate({ inputRange: [0, 0.2, 1], outputRange: [1, 0.96, 1.03] }) },
            ],
          }}
        >
          {/* soft spotlight so darker pets read on a dark background */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: size * 0.08,
              top: size * 0.12,
              width: size * 0.84,
              height: size * 0.84,
              borderRadius: size,
              backgroundColor: colors.primary,
              opacity: dark ? 0.16 : 0.1,
            }}
          />
          <Pet species={species} mood={mood} size={size} />
        </Animated.View>
        <Pressable
          onPress={skip}
          accessibilityRole="text"
          accessibilityLabel={line}
          accessibilityLiveRegion="polite"
          style={{ flex: 1, marginBottom: size * 0.34 }}
        >
          <View
            style={{
              backgroundColor: bubbleBg,
              borderColor: bubbleEdge,
              borderWidth: StyleSheet.hairlineWidth * 2,
              borderRadius: 20,
              borderBottomLeftRadius: 6,
              paddingHorizontal: 15,
              paddingVertical: 12,
              shadowColor: colors.shadow,
              shadowOpacity: dark ? 0.4 : 0.07,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 6 },
              elevation: 2,
            }}
          >
            {/* The full line holds the bubble's size so it doesn't grow while typing. */}
            <T size={16.5} weight="600" style={{ lineHeight: 23, color: 'transparent' }}>
              {line}
            </T>
            <T size={16.5} weight="600" style={{ lineHeight: 23, position: 'absolute', left: 15, right: 15, top: 12 }}>
              {line.slice(0, shown)}
              {!done ? <T size={16.5} weight="600" color={colors.primary}>▍</T> : null}
            </T>
          </View>
          {/* tail pointing at the pet */}
          <Svg width={14} height={14} viewBox="0 0 14 14" style={{ position: 'absolute', left: -9, bottom: 0 }}>
            <Path d="M14 0 L14 12 Q6 14 0 13 Q8 8 10 0 Z" fill={bubbleBg} />
            <Path d="M10 0 Q8 8 0 13 Q6 14 14 12" stroke={bubbleEdge} strokeWidth={1} fill="none" />
          </Svg>
        </Pressable>
      </View>
      {pep && pep.length ? <PepLine lines={pep} /> : null}
    </View>
  );
}

/** A quiet quote that rotates every few seconds. */
function PepLine({ lines }: { lines: Pep[] }) {
  const { colors } = useTheme();
  const [i, setI] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setI(0);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 500, delay: 500, useNativeDriver: nativeDriver }).start();
    if (lines.length < 2) return;
    const id = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 280, useNativeDriver: nativeDriver }).start(() => {
        setI((x) => (x + 1) % lines.length);
        Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: nativeDriver }).start();
      });
    }, 7000);
    return () => clearInterval(id);
  }, [lines, fade]);

  const q = lines[i % lines.length];
  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        gap: 10,
        marginTop: 2,
        marginLeft: 6,
        opacity: fade,
        transform: [{ translateY: fade.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }],
      }}
    >
      <View style={{ width: 2, borderRadius: 1, backgroundColor: colors.primary, opacity: 0.55 }} />
      <View style={{ flex: 1 }}>
        <T muted size={13.5} style={{ lineHeight: 19, fontStyle: 'italic', ...font('500') }}>
          {q.by ? `“${q.text}”` : q.text}
        </T>
        {q.by ? (
          <T size={11} weight="700" color={colors.textMuted} style={{ marginTop: 3, letterSpacing: 1.1, textTransform: 'uppercase' }}>
            {q.by}
          </T>
        ) : null}
      </View>
    </Animated.View>
  );
}
