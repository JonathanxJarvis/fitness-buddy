import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ActionSheet, T, type IconName } from './ui';
import { nativeDriver } from './motion';
import { useStore } from '@/store/StoreProvider';
import { nutrientColors, useTheme } from '@/theme';
import { glassMl } from '@/lib/units';
import type { MealType } from '@/lib/types';
import { useStartWorkout } from '@/lib/useStartWorkout';

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  index: { label: 'Today', icon: 'home-outline', active: 'home' },
  train: { label: 'Train', icon: 'barbell-outline', active: 'barbell' },
  coach: { label: 'Coach', icon: 'sparkles-outline', active: 'sparkles' },
  progress: { label: 'Progress', icon: 'stats-chart-outline', active: 'stats-chart' },
};

/** Height of the bar above the bottom inset; screens pad by this much. */
export const tabBarHeight = (bottomInset: number) => 58 + Math.max(bottomInset, 10);

export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/** Picks the meal that fits the current time of day. */
export function mealForNow(d = new Date()): MealType {
  const h = d.getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h >= 17 && h < 22) return 'dinner';
  return 'snacks';
}

function TabItem({ name, focused, onPress }: { name: string; focused: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const t = TABS[name];
  const v = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: focused ? 1 : 0, useNativeDriver: nativeDriver, speed: 18, bounciness: 8 }).start();
  }, [focused, v]);
  if (!t) return null;
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={t.label} onPress={onPress} style={{ flex: 1, alignItems: 'center', paddingTop: 10 }}>
      <Animated.View style={{ transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}>
        <Ionicons name={focused ? t.active : t.icon} size={23} color={focused ? colors.text : colors.textMuted} />
      </Animated.View>
      <T size={11} weight={focused ? '700' : '500'} color={focused ? colors.text : colors.textMuted} style={{ marginTop: 3 }}>
        {t.label}
      </T>
      <Animated.View style={{ width: 4, height: 4, borderRadius: 2, marginTop: 3, backgroundColor: colors.primary, opacity: v }} />
    </Pressable>
  );
}

export function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { colors, dark } = useTheme();
  const { state: app, dispatch, selectedDate } = useStore();
  const [open, setOpen] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;
  const keyboard = useKeyboardVisible();
  const startWorkout = useStartWorkout();

  useEffect(() => {
    Animated.spring(spin, { toValue: open ? 1 : 0, useNativeDriver: nativeDriver, speed: 16, bounciness: 10 }).start();
  }, [open, spin]);

  const visible = state.routes.filter((r) => TABS[r.name]);
  const left = visible.slice(0, 2);
  const right = visible.slice(2);
  const meal = mealForNow();
  const date = selectedDate;
  const units = app.settings.units;

  const go = (name: string, key: string, focused: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    const event = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
    if (!focused && !event.defaultPrevented) navigation.navigate(name);
  };

  const renderTab = (r: (typeof state.routes)[number]) => {
    const focused = state.routes[state.index]?.key === r.key;
    return <TabItem key={r.key} name={r.name} focused={focused} onPress={() => go(r.name, r.key, focused)} />;
  };

  if (keyboard) return null;

  return (
    <>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: Math.max(insets.bottom, 10),
          backgroundColor: colors.card,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          flexDirection: 'row',
          alignItems: 'flex-start',
          shadowColor: '#000',
          shadowOpacity: dark ? 0 : 0.06,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12,
        }}
      >
        {left.map(renderTab)}
        <View style={{ width: 76, alignItems: 'center' }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              setOpen(true);
            }}
            style={{ marginTop: -22 }}
          >
            <Animated.View
              style={{
                borderRadius: 32,
                shadowColor: colors.primary,
                shadowOpacity: 0.45,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 8,
                transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }],
              }}
            >
              <LinearGradient
                colors={[colors.hero[1], colors.hero[2]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 62, height: 62, borderRadius: 31, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.background }}
              >
                <Ionicons name="add" size={30} color="#fff" />
              </LinearGradient>
            </Animated.View>
          </Pressable>
        </View>
        {right.map(renderTab)}
      </View>

      <ActionSheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Log something"
        actions={[
          {
            label: 'Snap a meal',
            subtitle: 'AI estimates calories & macros from a photo',
            icon: 'camera',
            color: colors.primary,
            onPress: () => router.push({ pathname: '/snap-meal', params: { meal, date } }),
          },
          { label: 'Scan a barcode', subtitle: 'Packaged foods', icon: 'barcode-outline', color: nutrientColors.fat, onPress: () => router.push({ pathname: '/scan', params: { meal, date } }) },
          { label: 'Search foods', subtitle: 'USDA & Open Food Facts databases', icon: 'search', color: nutrientColors.protein, onPress: () => router.push({ pathname: '/add-food', params: { meal, date } }) },
          {
            label: 'Add a glass of water',
            subtitle: units === 'us' ? '8 fl oz' : '250 ml',
            icon: 'water',
            color: nutrientColors.water,
            onPress: () => {
              dispatch({ type: 'setWater', date, ml: (app.water[date] ?? 0) + glassMl(units) });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            },
          },
          {
            label: app.activeWorkout ? 'Resume workout' : 'Start a workout',
            subtitle: 'Sets, reps, weight & rest timer',
            icon: 'barbell',
            color: nutrientColors.steps,
            onPress: () => startWorkout(),
          },
          { label: 'Log cardio or sport', icon: 'bicycle', color: nutrientColors.fiber, onPress: () => router.push({ pathname: '/log-exercise', params: { date } }) },
          { label: 'Log weight', icon: 'scale-outline', color: nutrientColors.carbs, onPress: () => router.push({ pathname: '/log-weight', params: { date } }) },
        ]}
      />
    </>
  );
}
