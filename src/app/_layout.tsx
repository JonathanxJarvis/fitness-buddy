import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack, ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
// Per-weight imports so only these five font files ship with the app.
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { StoreProvider, useStore } from '@/store/StoreProvider';
import { font, useTheme } from '@/theme';
import { MascotToast } from '@/components/MascotToast';

function RootNavigator() {
  const { ready } = useStore();
  const { dark, colors } = useTheme();
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!ready || (!fontsLoaded && !fontError)) {
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
          headerTintColor: colors.text,
          headerTitleStyle: { color: colors.text, ...font('700'), fontSize: 17 },
          headerStyle: { backgroundColor: colors.background },
          headerBackButtonDisplayMode: 'minimal',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="add-food" options={{ title: 'Add food', presentation: 'modal' }} />
        <Stack.Screen name="food" options={{ title: 'Food details', presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="snap-meal" options={{ title: 'Snap a meal', presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="my-foods" options={{ title: 'My foods & meals' }} />
        <Stack.Screen name="scan" options={{ title: 'Scan barcode', presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="custom-food" options={{ title: 'Custom food', presentation: 'modal' }} />
        <Stack.Screen name="meal-builder" options={{ title: 'Saved meal', presentation: 'modal' }} />
        <Stack.Screen name="log-exercise" options={{ title: 'Log exercise', presentation: 'modal' }} />
        <Stack.Screen name="log-weight" options={{ title: 'Log weight', presentation: 'modal' }} />
        <Stack.Screen name="goals" options={{ title: 'Daily goals' }} />
        <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
        <Stack.Screen name="nutrients" options={{ title: 'Nutrients', presentation: 'modal' }} />
        <Stack.Screen name="workout" options={{ headerShown: false, presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="exercise-picker" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="workout-detail" options={{ title: 'Workout' }} />
        <Stack.Screen name="rank" options={{ headerShown: false }} />
        <Stack.Screen name="pro" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="friends" options={{ title: 'Your crew' }} />
        <Stack.Screen name="friend/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      </Stack>
      <MascotToast />
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
