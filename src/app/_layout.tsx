import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { LanguageProvider } from '@/context/language-context';
import { PlantsProvider } from '@/context/plants-context';
import { ThemeModeProvider, useThemeMode } from '@/context/theme-context';

SplashScreen.preventAutoHideAsync();

function Navigation() {
  const { scheme } = useThemeMode();

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="onboarding" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plant/[id]" />
        <Stack.Screen name="add-plant" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <LanguageProvider>
        <PlantsProvider>
          <Navigation />
        </PlantsProvider>
      </LanguageProvider>
    </ThemeModeProvider>
  );
}
