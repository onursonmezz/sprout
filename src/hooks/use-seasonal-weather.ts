import { useEffect } from 'react';

import { useSettings } from '@/context/settings-context';
import { fetchWeatherSnapshot, requestLocationPermission, seasonalFactorFromTemp } from '@/utils/weather';

/** Fetches current temperature and today's day length once per app session
 * when seasonal adjustment is on, and stores the results for plants-context
 * (watering factor) and the Today screen (day length) to use. Seasonal
 * adjustment defaults to on, so this is also what prompts for location
 * permission on a fresh install (the Settings toggle only re-prompts if the
 * user had declined and flips it off/on again). Silently does nothing
 * without permission or network — this is a best-effort enhancement, not
 * required for the app to function. */
export function useSeasonalWeather() {
  const { loaded, seasonalAdjustment, setSeasonalWeather } = useSettings();

  useEffect(() => {
    if (!loaded || !seasonalAdjustment) return;
    (async () => {
      const granted = await requestLocationPermission();
      if (!granted) return;
      const snapshot = await fetchWeatherSnapshot();
      if (snapshot) setSeasonalWeather(snapshot.tempC, seasonalFactorFromTemp(snapshot.tempC), snapshot.dayLengthHours);
    })();
    // setSeasonalWeather is a fresh closure every render (see settings-context.tsx);
    // depending on it here would refetch on every unrelated settings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, seasonalAdjustment]);
}
