import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useTheme } from '@/theme';

const NATIVE_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * A translucent "liquid glass" surface. iOS 26+ uses the system glass
 * material; the web uses a backdrop blur; older iOS and Android get a
 * frosted, semi-opaque fill so text stays readable.
 */
export function Glass({ style, children, tint, radius = 28 }: { style?: StyleProp<ViewStyle>; children?: React.ReactNode; tint?: string; radius?: number }) {
  const { dark } = useTheme();
  const ref = useRef<View>(null);
  useEffect(() => {
    // react-native-web drops backdrop-filter from styles, so set it on the DOM node.
    const el = ref.current as unknown as HTMLElement | null;
    if (Platform.OS !== 'web' || !el?.style) return;
    el.style.setProperty('backdrop-filter', 'blur(24px) saturate(180%)');
    el.style.setProperty('-webkit-backdrop-filter', 'blur(24px) saturate(180%)');
  }, []);
  if (NATIVE_GLASS) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive tintColor={tint} style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
        {children}
      </GlassView>
    );
  }
  const web = Platform.OS === 'web';
  const fill = dark ? (web ? 'rgba(20,28,23,0.8)' : 'rgba(22,30,25,0.94)') : web ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.95)';
  return (
    <View
      ref={ref}
      style={[
        {
          borderRadius: radius,
          backgroundColor: fill,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.9)',
          shadowColor: '#0B1A12',
          shadowOpacity: dark ? 0.5 : 0.14,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 10 },
          elevation: 14,
        },
        style,
      ]}
    >
      {/* soft top highlight, like light catching the edge of glass */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: radius * 0.6, right: radius * 0.6, height: 1, backgroundColor: dark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,1)' }} />
      {children}
    </View>
  );
}
