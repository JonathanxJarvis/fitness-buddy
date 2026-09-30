import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  useWindowDimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { ProMark } from './ProMark';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, radius, spacing, useTheme } from '@/theme';
import { nativeDriver, PressScale, useTween } from './motion';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Screen({
  children,
  scroll = true,
  padded = true,
  topInset = false,
  tabs = false,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  topInset?: boolean;
  /** Leaves room for the floating tab bar. */
  tabs?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = {
    padding: padded ? spacing.lg : 0,
    paddingTop: (padded ? spacing.lg : 0) + (topInset ? insets.top : 0),
    paddingBottom: spacing.xl + (tabs ? 84 + insets.bottom : 0),
  };
  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: colors.background }, pad, style]}>{children}</View>;
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[pad, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors, dark } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: dark ? colors.border : 'rgba(15,40,25,0.05)',
          shadowColor: colors.shadow,
          shadowOpacity: dark ? 0 : 0.06,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 6 },
          elevation: dark ? 0 : 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function T({
  children,
  style,
  muted,
  size = 15,
  weight,
  color,
  center,
  numberOfLines,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<TextStyle>;
  muted?: boolean;
  size?: number;
  weight?: TextStyle['fontWeight'];
  color?: string;
  center?: boolean;
  numberOfLines?: number;
}) {
  const { colors } = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      onPress={onPress}
      style={[
        {
          color: color ?? (muted ? colors.textMuted : colors.text),
          fontSize: size,
          ...font(weight),
          letterSpacing: size >= 24 ? -0.6 : size >= 18 ? -0.3 : 0,
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, marginBottom: spacing.sm }}>
      <T size={17} weight="800">
        {children}
      </T>
      {right}
    </View>
  );
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  style,
  small,
  pro,
}: {
  title: string;
  onPress: () => void;
  /** Marks a Pro feature with the small diamond. */
  pro?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const { colors, dark } = useTheme();
  const bg = {
    primary: colors.primary,
    secondary: colors.primarySoft,
    ghost: 'transparent',
    danger: 'transparent',
  }[variant];
  const fg = {
    primary: '#FFFFFF',
    secondary: colors.primary,
    ghost: colors.primary,
    danger: colors.danger,
  }[variant];
  const primary = variant === 'primary';
  return (
    <PressScale
      accessibilityRole="button"
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      disabled={disabled || loading}
      scaleTo={0.96}
      style={[
        {
          backgroundColor: bg,
          borderRadius: radius.pill,
          paddingVertical: small ? 9 : 14,
          paddingHorizontal: small ? 15 : 22,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.45 : 1,
          borderWidth: variant === 'danger' ? 1 : variant === 'secondary' ? StyleSheet.hairlineWidth : 0,
          borderColor: variant === 'danger' ? colors.danger : colors.primary + '40',
          overflow: 'hidden',
        },
        primary && {
          shadowColor: colors.hero[1],
          shadowOpacity: dark ? 0.5 : 0.35,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        },
        style,
      ]}
    >
      {primary && (
        <>
          <LinearGradient colors={[colors.hero[2], colors.hero[1], colors.hero[0]]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1.4 }} style={StyleSheet.absoluteFill} />
          {/* glossy top edge */}
          <LinearGradient colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%' }} />
        </>
      )}
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 18} color={fg} />}
          <Text numberOfLines={1} style={{ color: fg, ...font('700'), fontSize: small ? 14 : 16, letterSpacing: 0.2 }}>{title}</Text>
          {pro && <ProMark size={small ? 10 : 12} />}
        </>
      )}
    </PressScale>
  );
}

export function IconButton({
  icon,
  onPress,
  color,
  size = 22,
  label,
  filled,
}: {
  icon: IconName;
  onPress: () => void;
  color?: string;
  size?: number;
  label: string;
  filled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={10}
      style={({ pressed }) => ({
        opacity: pressed ? 0.6 : 1,
        backgroundColor: filled ? colors.primarySoft : 'transparent',
        borderRadius: radius.pill,
        padding: filled ? 8 : 2,
      })}
    >
      <Ionicons name={icon} size={size} color={color ?? colors.primary} />
    </Pressable>
  );
}

export function Field({
  label,
  suffix,
  style,
  ...props
}: TextInputProps & { label?: string; suffix?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ marginBottom: spacing.md }, style]}>
      {label ? (
        <T muted size={13} weight="600" style={{ marginBottom: 6 }}>
          {label}
        </T>
      ) : null}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.cardAlt,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
        }}
      >
        <TextInput
          placeholderTextColor={colors.textMuted}
          style={{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: 11, ...font('500') }}
          {...props}
        />
        {suffix ? <T muted>{suffix}</T> : null}
      </View>
    </View>
  );
}

export function Segmented<K extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', backgroundColor: colors.cardAlt, borderRadius: radius.pill, padding: 4 }, style]}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: radius.pill,
              backgroundColor: active ? colors.card : 'transparent',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOpacity: active ? 0.06 : 0,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
            }}
          >
            <T size={14} weight={active ? '700' : '500'} color={active ? colors.primary : colors.textMuted}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress, icon }: { label: string; active?: boolean; onPress: () => void; icon?: IconName }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: radius.pill,
        backgroundColor: active ? colors.primary : colors.cardAlt,
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      {icon && <Ionicons name={icon} size={16} color={active ? colors.onPrimary : colors.text} />}
      <T size={14} weight="600" color={active ? colors.onPrimary : colors.text}>
        {label}
      </T>
    </Pressable>
  );
}

export function ListRow({
  title,
  subtitle,
  right,
  onPress,
  onLongPress,
  icon,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  icon?: IconName;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
        opacity: pressed ? 0.6 : 1,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border,
      })}
    >
      {icon && (
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <T weight="600" numberOfLines={1}>
          {title}
        </T>
        {subtitle ? (
          <T muted size={13} numberOfLines={1} style={{ marginTop: 2 }}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right}
    </Pressable>
  );
}

export function EmptyState({ icon, title, body }: { icon: IconName; title: string; body?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 }}>
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <T weight="700" size={16} style={{ marginTop: 12 }} center>
        {title}
      </T>
      {body ? (
        <T muted center style={{ marginTop: 6 }}>
          {body}
        </T>
      ) : null}
    </View>
  );
}

export function ProgressBar({ value, max, color, height = 8 }: { value: number; max: number; color: string; height?: number }) {
  const { colors } = useTheme();
  const pct = useTween(max > 0 ? Math.min(1, value / max) : 0, 900);
  return (
    <View style={{ height, backgroundColor: colors.track, borderRadius: height, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height, backgroundColor: color, borderRadius: height }} />
    </View>
  );
}

export function Stepper({ value, onChange, step = 1, min = 0 }: { value: number; onChange: (n: number) => void; step?: number; min?: number }) {
  const { colors } = useTheme();
  const fmt = Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '');
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <IconButton filled label="Decrease" icon="remove" onPress={() => onChange(Math.max(min, +(value - step).toFixed(2)))} />
      <TextInput
        value={fmt}
        onChangeText={(t) => {
          const n = parseFloat(t.replace(',', '.'));
          onChange(Number.isFinite(n) ? n : 0);
        }}
        keyboardType="decimal-pad"
        style={{ color: colors.text, fontSize: 22, ...font('800'), width: 64, textAlign: 'center', padding: 0 }}
      />
      <IconButton filled label="Increase" icon="add" onPress={() => onChange(+(value + step).toFixed(2))} />
    </View>
  );
}

/** A number that counts up to its value. */
export function CountUp({
  value,
  decimals = 0,
  delay = 0,
  ...rest
}: { value: number; decimals?: number; delay?: number } & Omit<React.ComponentProps<typeof T>, 'children'>) {
  const v = useTween(value, 1000, delay);
  const shown = decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString();
  return <T {...rest}>{shown}</T>;
}

/** A rounded-square icon on a soft tint of its color. */
export function IconTile({ icon, color, size = 40, iconSize }: { icon: IconName; color: string; size?: number; iconSize?: number }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.32,
        backgroundColor: color + '1F',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={iconSize ?? size * 0.5} color={color} />
    </View>
  );
}

export function Badge({ label, color, icon, solid }: { label: string; color: string; icon?: IconName; solid?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: solid ? color : color + '1F',
        alignSelf: 'flex-start',
      }}
    >
      {icon && <Ionicons name={icon} size={11} color={solid ? '#fff' : color} />}
      <T size={11} weight="800" color={solid ? '#fff' : color} style={{ letterSpacing: 0.4 }}>
        {label}
      </T>
    </View>
  );
}

/** A bottom sheet with a fading backdrop and a spring slide-up. */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.spring(v, { toValue: 1, useNativeDriver: nativeDriver, damping: 22, stiffness: 220, mass: 0.9 }).start();
    } else if (mounted) {
      Animated.timing(v, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: nativeDriver }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted) return null;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,15,10,0.45)', opacity: v }]}>
          <Pressable accessibilityLabel="Close" style={{ flex: 1 }} onPress={onClose} />
        </Animated.View>
        <Animated.View
          style={{
            backgroundColor: colors.card,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: spacing.lg,
            paddingTop: 10,
            paddingBottom: insets.bottom + spacing.lg,
            width: '100%',
            maxWidth: 520,
            alignSelf: 'center',
            transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }],
          }}
        >
          <View style={{ alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: spacing.md }} />
          {title ? (
            <T size={18} weight="800" style={{ marginBottom: spacing.md }}>
              {title}
            </T>
          ) : null}
          {/* Tall sheets scroll instead of pushing their buttons off screen. */}
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={{ flexGrow: 0, maxHeight: height * 0.8 - insets.top }}>
            {children}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export interface SheetAction {
  label: string;
  icon: IconName;
  color?: string;
  subtitle?: string;
  destructive?: boolean;
  /** Marks a Pro feature with the small diamond. */
  pro?: boolean;
  onPress: () => void;
}

/** A list of actions in a bottom sheet (replaces Alert menus, which don't exist on web). */
export function ActionSheet({
  visible,
  onClose,
  title,
  actions,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  actions: SheetAction[];
}) {
  const { colors } = useTheme();
  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      {actions.map((a) => {
        const color = a.destructive ? colors.danger : a.color ?? colors.primary;
        return (
          <PressScale
            key={a.label}
            scaleTo={0.98}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              setTimeout(a.onPress, 180);
            }}
            style={[{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 11 }]}
          >
            <IconTile icon={a.icon} color={color} size={42} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <T weight="700" color={a.destructive ? colors.danger : undefined}>
                  {a.label}
                </T>
                {a.pro && <ProMark />}
              </View>
              {a.subtitle ? (
                <T size={13} muted style={{ marginTop: 1 }}>
                  {a.subtitle}
                </T>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </PressScale>
        );
      })}
    </Sheet>
  );
}
