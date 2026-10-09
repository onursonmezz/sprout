import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { View } from 'react-native';

import { WateringFeedbackPrompt } from '@/components/watering-feedback-prompt';
import { LanguageProvider, useLanguage } from '@/context/language-context';
import { PlantsProvider, usePlants } from '@/context/plants-context';
import { SettingsProvider, useSettings } from '@/context/settings-context';
import { ThemeModeProvider, useThemeMode } from '@/context/theme-context';
import { useHeatingSeasonPrompt } from '@/hooks/use-heating-season-prompt';
import { useNotificationScheduler } from '@/hooks/use-notification-scheduler';
import { useSeasonalWeather } from '@/hooks/use-seasonal-weather';

SplashScreen.preventAutoHideAsync();

function Navigation() {
  const { scheme, loaded: themeLoaded } = useThemeMode();
  const { loaded: langLoaded } = useLanguage();
  const { loaded: plantsLoaded, recomputeIntervals } = usePlants();
  const { loaded: settingsLoaded, seasonalAdjustment, heatingOn } = useSettings();
  const ready = themeLoaded && langLoaded && plantsLoaded && settingsLoaded;

  useNotificationScheduler();
  useSeasonalWeather();
  useHeatingSeasonPrompt();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Flipping seasonal adjustment or heating mode re-times every plant at once,
  // rather than leaving each one on its old interval until it's next watered.
  useEffect(() => {
    if (plantsLoaded && settingsLoaded) recomputeIntervals({ applySeasonalFactors: seasonalAdjustment, heatingOn });
    // recomputeIntervals is a fresh closure every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantsLoaded, settingsLoaded, seasonalAdjustment, heatingOn]);

  if (!ready) return null;

  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={{ flex: 1 }}>
      <Stack initialRouteName="onboarding" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="plant/[id]" />
        <Stack.Screen name="add-plant" options={{ presentation: 'modal' }} />
        <Stack.Screen name="light-meter" options={{ presentation: 'modal' }} />
        <Stack.Screen name="guide/article/[key]" />
        <Stack.Screen name="guide/issue/[key]" />
        <Stack.Screen name="guide/issues" />
      </Stack>
      <WateringFeedbackPrompt />
      </View>
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
