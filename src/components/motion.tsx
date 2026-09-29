import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

export const nativeDriver = Platform.OS !== 'web';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Smoothly animates a number toward `target` and returns the current value.
 * Runs on requestAnimationFrame so it works for SVG props and text alike.
 */
export function useTween(target: number, duration = 900, delay = 0): number {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  const current = useRef(0);

  useEffect(() => {
    from.current = current.current;
    let raf = 0;
    let start: number | null = null;
    const step = (ts: number) => {
      if (start === null) start = ts + delay;
      const t = Math.min(1, Math.max(0, (ts - start) / duration));
      const v = from.current + (target - from.current) * easeOutCubic(t);
      current.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    // Browsers pause animation frames in background or throttled tabs; never leave a number stuck mid-way.
    const settle = setTimeout(() => {
      cancelAnimationFrame(raf);
      current.current = target;
      setValue(target);
    }, delay + duration + 250);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [target, duration, delay]);

  return value;
}

/** Fades and slides its children in once, optionally after a stagger delay. */
export function FadeIn({
  children,
  delay = 0,
  offset = 14,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  offset?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 480,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: nativeDriver,
    }).start();
  }, [v, delay]);
  return (
    <Animated.View
      style={[
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.001, 1] }),
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [offset, 0] }) }],
        },
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** A Pressable that springs down slightly while pressed. */
export function PressScale({
  children,
  style,
  scaleTo = 0.97,
  ...props
}: Omit<PressableProps, 'style' | 'children'> & { children: React.ReactNode; style?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: nativeDriver, speed: 40, bounciness: 6 }).start();
  // Sizing props belong on the outer Pressable so flex layouts work; the rest styles the animated view.
  const { flex, width, alignSelf, margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical, ...inner } = StyleSheet.flatten(style) ?? {};
  const outer: ViewStyle = { flex, width, alignSelf, margin, marginTop, marginBottom, marginLeft, marginRight, marginHorizontal, marginVertical };
  return (
    <Pressable
      {...props}
      style={outer}
      onPressIn={(e) => {
        to(scaleTo);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        props.onPressOut?.(e);
      }}
    >
      <Animated.View style={[inner, flex !== undefined ? { flex: 1 } : null, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Three dots that pulse in sequence, used while the coach is thinking. */
export function TypingDots({ color }: { color: string }) {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];
  useEffect(() => {
    const anims = dots.map((d, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(d, { toValue: 1, duration: 320, useNativeDriver: nativeDriver }),
          Animated.timing(d, { toValue: 0, duration: 320, useNativeDriver: nativeDriver }),
          Animated.delay((2 - i) * 160),
        ]),
      ),
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <Animated.View style={{ flexDirection: 'row', gap: 5, paddingVertical: 4 }}>
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          style={{
            width: 7,
            height: 7,
            borderRadius: 4,
            backgroundColor: color,
            opacity: d.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
            transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) }],
          }}
        />
      ))}
    </Animated.View>
  );
}

/** A gentle, endless pulse (0 → 1 → 0), for "live" indicators and shimmer. */
export function usePulse(duration = 1400) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: duration / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
        Animated.timing(v, { toValue: 0, duration: duration / 2, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
      ]),
    );
    a.start();
    return () => a.stop();
  }, [v, duration]);
  return v;
}
