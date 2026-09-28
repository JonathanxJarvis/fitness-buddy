import React from 'react';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { Ionicons } from '@expo/vector-icons';
import type { ColorValue } from 'react-native';
import { useStore } from '@/store/StoreProvider';
import { useTheme } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const tab = (icon: IconName, activeIcon: IconName) => ({
  tabBarIcon: ({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) => (
    <Ionicons name={focused ? activeIcon : icon} size={size} color={color as string} />
  ),
});

export default function TabsLayout() {
  const { state } = useStore();
  const { colors } = useTheme();
  if (!state.profile || !state.goals) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', ...tab('today-outline', 'today') }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar', ...tab('calendar-outline', 'calendar') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', ...tab('stats-chart-outline', 'stats-chart') }} />
      <Tabs.Screen name="meals" options={{ title: 'Meals', ...tab('bookmark-outline', 'bookmark') }} />
      <Tabs.Screen name="profile" options={{ title: 'Me', ...tab('person-circle-outline', 'person-circle') }} />
    </Tabs>
  );
}
