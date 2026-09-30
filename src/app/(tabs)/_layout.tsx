import React from 'react';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useStore } from '@/store/StoreProvider';
import { TabBar } from '@/components/TabBar';

export default function TabsLayout() {
  const { state } = useStore();
  if (!state.profile || !state.goals) return <Redirect href="/onboarding" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="train" options={{ title: 'Train' }} />
      <Tabs.Screen name="friends" options={{ title: 'Friends' }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach' }} />
      {/* Opened from Today's calendar button; not shown in the tab bar. */}
      <Tabs.Screen name="calendar" options={{ title: 'Diary' }} />
    </Tabs>
  );
}
