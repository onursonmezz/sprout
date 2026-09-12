import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { LanguageProvider, useLanguage } from '@/context/language-context';
import { PlantsProvider, usePlants } from '@/context/plants-context';
import { SettingsProvider, useSettings } from '@/context/settings-context';
import { ThemeModeProvider, useThemeMode } from '@/context/theme-context';
import { useNotificationScheduler } from '@/hooks/use-notification-scheduler';
import { useSeasonalWeather } from '@/hooks/use-seasonal-weather';

SplashScreen.preventAutoHideAsync();

function Navigation() {
  const { scheme, loaded: themeLoaded } = useThemeMode();
  const { loaded: langLoaded } = useLanguage();
  const { loaded: plantsLoaded } = usePlants();
  const { loaded: settingsLoaded } = useSettings();
  const ready = themeLoaded && langLoaded && plantsLoaded && settingsLoaded;

  useNotificationScheduler();
  useSeasonalWeather();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="onboarding" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plant/[id]" />
        <Stack.Screen name="add-plant" options={{ presentation: 'modal' }} />
        <Stack.Screen name="light-meter" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeModeProvider>
      <LanguageProvider>
        <PlantsProvider>
          <SettingsProvider>
            <Navigation />
          </SettingsProvider>
        </PlantsProvider>
      </LanguageProvider>
    </ThemeModeProvider>
  );
}
