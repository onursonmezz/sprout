import { useEffect } from 'react';

import { useSettings } from '@/context/settings-context';
import { fetchDayLengthHours, requestLocationPermission } from '@/utils/weather';

/** Fetches today's day length once per app session for the Today screen.
 * Tied to seasonal adjustment (on by default), so this is also what prompts
 * for location permission on a fresh install. Silently does nothing without
 * permission or network — a best-effort extra, not required for the app. */
export function useSeasonalWeather() {
  const { loaded, seasonalAdjustment, setDayLengthHours } = useSettings();

  useEffect(() => {
    if (!loaded || !seasonalAdjustment) return;
    (async () => {
      if (!(await requestLocationPermission())) return;
      const hours = await fetchDayLengthHours();
      if (hours != null) setDayLengthHours(hours);
    })();
    // setDayLengthHours is a fresh closure every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, seasonalAdjustment]);
}
