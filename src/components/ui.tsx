import React from 'react';
import {
  ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, spacing, useTheme } from '@/theme';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Screen({
  children,
  scroll = true,
  padded = true,
  topInset = false,
  style,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  topInset?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = {
    padding: padded ? spacing.lg : 0,
    paddingTop: (padded ? spacing.lg : 0) + (topInset ? insets.top : 0),
    paddingBottom: spacing.xl * 2,
  };
  if (!scroll) {
    return <View style={[{ flex: 1, backgroundColor: colors.background }, pad, style]}>{children}</View>;
  }
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[pad, style]}
      keyboardShouldPersistTaps="handled"
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
          borderWidth: dark ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOpacity: dark ? 0 : 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: dark ? 0 : 1,
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
}: {
  children: React.ReactNode;
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
      style={[
        {
          color: color ?? (muted ? colors.textMuted : colors.text),
          fontSize: size,
          fontWeight: weight,
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
      <T size={18} weight="700">
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
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const { colors } = useTheme();
  const bg = {
    primary: colors.primary,
    secondary: colors.primarySoft,
    ghost: 'transparent',
    danger: 'transparent',
  }[variant];
  const fg = {
    primary: colors.onPrimary,
    secondary: colors.primary,
    ghost: colors.primary,
    danger: colors.danger,
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderRadius: radius.pill,
          paddingVertical: small ? 8 : 14,
          paddingHorizontal: small ? 14 : 20,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          borderWidth: variant === 'danger' ? 1 : 0,
          borderColor: colors.danger,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={small ? 16 : 18} color={fg} />}
          <Text numberOfLines={1} style={{ color: fg, fontWeight: '700', fontSize: small ? 14 : 16 }}>{title}</Text>
        </>
      )}
    </Pressable>
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
          style={{ flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 }}
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
        <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
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
  const pct = max > 0 ? Math.min(1, value / max) : 0;
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
        style={{ color: colors.text, fontSize: 20, fontWeight: '700', width: 64, textAlign: 'center', padding: 0 }}
      />
      <IconButton filled label="Increase" icon="add" onPress={() => onChange(+(value + step).toFixed(2))} />
    </View>
  );
}
