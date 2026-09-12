import { useEffect } from 'react';
import { Alert, AppState } from 'react-native';

import { useLanguage } from '@/context/language-context';
import { useSettings } from '@/context/settings-context';
import { isHeatingSeasonNow } from '@/utils/watering-algorithm';

/**
 * Detects the calendar crossing into or out of conventional heating season
 * (checked on mount and whenever the app returns to the foreground — same
 * trigger points as plants-context.tsx's daily rollover check) and asks the
 * user via a native confirm dialog rather than silently flipping their
 * heatingOn setting. Only prompts while "Seasonal adjustment" is on, since
 * heating is one of the factors that toggle gates.
 */
export function useHeatingSeasonPrompt() {
  const { t } = useLanguage();
  const { loaded, seasonalAdjustment, heatingOn, setHeatingOn, lastHeatingSeasonState, setLastHeatingSeasonState } = useSettings();

  useEffect(() => {
    if (!loaded) return;
    const check = () => {
      const nowInSeason = isHeatingSeasonNow();
      if (nowInSeason === lastHeatingSeasonState) return;
      setLastHeatingSeasonState(nowInSeason);
      if (!seasonalAdjustment || nowInSeason === heatingOn) return;
      const copy = nowInSeason ? t.settings.heatingPromptEnter : t.settings.heatingPromptExit;
      Alert.alert(copy.title, copy.body, [
        { text: t.settings.heatingPromptNo, style: 'cancel' },
        { text: t.settings.heatingPromptYes, onPress: () => setHeatingOn(nowInSeason) },
      ]);
    };
    check();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => subscription.remove();
    // setHeatingOn/setLastHeatingSeasonState are fresh closures every render
    // (see settings-context.tsx); depending on them here would re-subscribe
    // on every unrelated settings change instead of just the ones that
    // actually affect what `check` should do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, seasonalAdjustment, heatingOn, lastHeatingSeasonState, t]);
}
