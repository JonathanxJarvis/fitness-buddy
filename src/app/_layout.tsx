import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider, useStore } from '@/store/StoreProvider';
import { useTheme } from '@/theme';

function RootNavigator() {
  const { ready } = useStore();
  const { dark, colors } = useTheme();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const base = dark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          headerStyle: { backgroundColor: colors.card },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="add-food" options={{ title: 'Add food', presentation: 'modal' }} />
        <Stack.Screen name="food" options={{ title: 'Food details', presentation: 'modal' }} />
        <Stack.Screen name="scan" options={{ title: 'Scan barcode', presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="custom-food" options={{ title: 'Custom food', presentation: 'modal' }} />
        <Stack.Screen name="meal-builder" options={{ title: 'Saved meal', presentation: 'modal' }} />
        <Stack.Screen name="log-exercise" options={{ title: 'Log exercise', presentation: 'modal' }} />
        <Stack.Screen name="log-weight" options={{ title: 'Log weight', presentation: 'modal' }} />
        <Stack.Screen name="goals" options={{ title: 'Daily goals' }} />
        <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
        <Stack.Screen name="nutrients" options={{ title: 'Nutrients', presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <RootNavigator />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
