import React, { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, UIManager, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, T } from '@/components/ui';
import { spacing, useTheme } from '@/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) UIManager.setLayoutAnimationEnabledExperimental(true);

/** A card that shows only its title and a short summary until tapped open. */
export function Dropdown({
  title,
  summary,
  dot,
  initiallyOpen = false,
  detached,
  children,
}: {
  title: string;
  summary?: string;
  dot?: string;
  initiallyOpen?: boolean;
  /** Show the opened content below the header card instead of inside it (for content that brings its own cards). */
  detached?: boolean;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
    setOpen((o) => !o);
  };
  const header = (
    <Pressable
      onPress={toggle}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={summary ? `${title}, ${summary}` : title}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}
    >
      {dot ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: dot }} /> : null}
      <T size={16} weight="800" style={{ flex: 1 }} numberOfLines={1}>{title}</T>
      {summary ? <T size={13} muted numberOfLines={1}>{summary}</T> : null}
      <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textMuted} />
    </Pressable>
  );
  if (detached) {
    return (
      <>
        <Card style={{ paddingVertical: spacing.xs }}>{header}</Card>
        {open ? children : null}
      </>
    );
  }
  return (
    <Card style={{ paddingVertical: spacing.xs }}>
      {header}
      {open ? <View style={{ paddingBottom: spacing.sm }}>{children}</View> : null}
    </Card>
  );
}
