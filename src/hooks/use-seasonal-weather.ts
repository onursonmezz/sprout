import { useEffect } from 'react';

import { useSettings } from '@/context/settings-context';
import { fetchLocalConditions, requestLocationPermission } from '@/utils/weather';

/** Looks up local conditions once per app session: day length for the Today
 * screen, latitude for the season factors and the last rainy day for outdoor
 * plants. Tied to seasonal adjustment (on by default), so this is also what
 * prompts for location permission on a fresh install. Silently does nothing
 * without permission or network — a best-effort extra, not required. */
export function useSeasonalWeather() {
  const { loaded, seasonalAdjustment, setLocalConditions } = useSettings();

  useEffect(() => {
    if (!loaded || !seasonalAdjustment) return;
    (async () => {
      if (!(await requestLocationPermission())) return;
      const conditions = await fetchLocalConditions();
      if (conditions) setLocalConditions(conditions);
    })();
    // setLocalConditions is a fresh closure every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, seasonalAdjustment]);
}
