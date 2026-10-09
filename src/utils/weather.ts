import * as Location from 'expo-location';

import { wateringAlgorithm } from '@/data/species-guide';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export async function requestLocationPermission(): Promise<boolean> {
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.granted;
}

export type LocalConditions = {
  /** Today's sunrise-to-sunset length. */
  dayLengthHours: number | null;
  /** Latitude rounded to whole degrees — all the watering algorithm needs
   * (hemisphere and how strong the seasons are), and coarse on purpose. */
  latitude: number;
  /** Date (YYYY-MM-DD) of the most recent day in the past week with enough
   * rain to count as a watering, or null if there was none. */
  lastRainDate: string | null;
};

/** What the device's location says about light and rain right now, or null if
 * permission is missing, location can't be resolved, or the request fails. */
export async function fetchLocalConditions(): Promise<LocalConditions | null> {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) return null;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const { latitude, longitude } = position.coords;
    const url =
      `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}` +
      `&daily=sunrise,sunset,precipitation_sum&past_days=7&forecast_days=1&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const daily = data?.daily;
    const days: string[] = daily?.time ?? [];
    if (days.length === 0) return null;

    // With past_days the last entry is today.
    const today = days.length - 1;
    const sunrise = daily?.sunrise?.[today];
    const sunset = daily?.sunset?.[today];
    const hours = sunrise && sunset ? (new Date(sunset).getTime() - new Date(sunrise).getTime()) / 3600000 : NaN;

    let lastRainDate: string | null = null;
    for (let i = today; i >= 0; i--) {
      const mm = daily?.precipitation_sum?.[i];
      if (typeof mm === 'number' && mm >= wateringAlgorithm.rainThresholdMm) {
        lastRainDate = days[i];
        break;
      }
    }

    return {
      dayLengthHours: Number.isFinite(hours) && hours > 0 ? hours : null,
      latitude: Math.round(latitude),
      lastRainDate,
    };
  } catch {
    return null;
  }
}
