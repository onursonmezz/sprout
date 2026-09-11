import { useEffect } from 'react';

import { useSettings } from '@/context/settings-context';
import { fetchCurrentTemperatureC, requestLocationPermission, seasonalFactorFromTemp } from '@/utils/weather';

/** Fetches current temperature once per app session when seasonal
 * adjustment is on, and stores the resulting factor for plants-context to
 * apply on its next load. Seasonal adjustment defaults to on, so this is
 * also what prompts for location permission on a fresh install (the
 * Settings toggle only re-prompts if the user had declined and flips it
 * off/on again). Silently does nothing without permission or network —
 * this is a best-effort enhancement, not required for the app to function. */
export function useSeasonalWeather() {
  const { loaded, seasonalAdjustment, setSeasonalWeather } = useSettings();

  useEffect(() => {
    if (!loaded || !seasonalAdjustment) return;
    (async () => {
      const granted = await requestLocationPermission();
      if (!granted) return;
      const tempC = await fetchCurrentTemperatureC();
      if (tempC !== null) setSeasonalWeather(tempC, seasonalFactorFromTemp(tempC));
    })();
    // setSeasonalWeather is a fresh closure every render (see settings-context.tsx);
    // depending on it here would refetch on every unrelated settings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, seasonalAdjustment]);
}
