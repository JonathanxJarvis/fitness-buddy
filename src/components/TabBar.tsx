import React, { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ActionSheet, T, type IconName } from './ui';
import { nativeDriver } from './motion';
import { Glass } from './Glass';
import { useStore } from '@/store/StoreProvider';
import { nutrientColors, useTheme } from '@/theme';
import { glassMl } from '@/lib/units';
import type { MealType } from '@/lib/types';
import { useStartWorkout } from '@/lib/useStartWorkout';

const TABS: Record<string, { label: string; icon: IconName; active: IconName }> = {
  index: { label: 'Today', icon: 'home-outline', active: 'home' },
  train: { label: 'Train', icon: 'barbell-outline', active: 'barbell' },
  friends: { label: 'Friends', icon: 'people-outline', active: 'people' },
  coach: { label: 'Coach', icon: 'sparkles-outline', active: 'sparkles' },
};

/** Height of the bar above the bottom inset; screens pad by this much. */
export const tabBarHeight = (bottomInset: number) => BAR_H + barBottom(bottomInset) + 8;

const BAR_H = 64;
const barBottom = (bottomInset: number) => Math.max(bottomInset - 8, 12);

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
  const { colors, dark } = useTheme();
  const t = TABS[name];
  const v = useRef(new Animated.Value(focused ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: focused ? 1 : 0, useNativeDriver: nativeDriver, speed: 18, bounciness: 8 }).start();
  }, [focused, v]);
  if (!t) return null;
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={t.label} onPress={onPress} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: BAR_H }}>
      {/* the lens: a brighter capsule that swells in behind the active tab */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 7,
          bottom: 7,
          left: 3,
          right: 3,
          borderRadius: 22,
          backgroundColor: dark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.75)',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: dark ? 'rgba(255,255,255,0.14)' : 'rgba(15,26,20,0.06)',
          opacity: v,
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
        }}
      />
      <Animated.View style={{ transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -1] }) }] }}>
        <Ionicons name={focused ? t.active : t.icon} size={22} color={focused ? colors.primary : colors.textMuted} />
      </Animated.View>
      <T size={10.5} weight={focused ? '800' : '600'} color={focused ? colors.text : colors.textMuted} style={{ marginTop: 2 }}>
        {t.label}
      </T>
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
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 14, right: 14, bottom: barBottom(insets.bottom) }}>
        <Glass radius={32} style={{ height: BAR_H, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 }}>
          {left.map(renderTab)}
          <View style={{ width: 70, alignItems: 'center' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                setOpen(true);
              }}
            >
              <Animated.View
                style={{
                  borderRadius: 26,
                  shadowColor: colors.hero[1],
                  shadowOpacity: dark ? 0.6 : 0.4,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 5 },
                  elevation: 8,
                  transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }],
                }}
              >
                <LinearGradient
                  colors={[colors.hero[2], colors.hero[1], colors.hero[0]]}
                  start={{ x: 0.2, y: 0 }}
                  end={{ x: 0.8, y: 1 }}
                  style={{ width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                >
                  <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 26 }} />
                  <Ionicons name="add" size={28} color="#fff" />
                </LinearGradient>
              </Animated.View>
            </Pressable>
          </View>
          {right.map(renderTab)}
        </Glass>
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
