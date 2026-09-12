import * as Location from 'expo-location';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export async function requestLocationPermission(): Promise<boolean> {
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.granted;
}

export type WeatherSnapshot = { tempC: number; dayLengthHours: number };

/** Current outdoor temperature and today's sunrise-to-sunset length near the
 * device, in a single request, or null if permission is missing, location
 * can't be resolved, or the network request fails. */
export async function fetchWeatherSnapshot(): Promise<WeatherSnapshot | null> {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) return null;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const { latitude, longitude } = position.coords;
    const url = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m&daily=sunrise,sunset&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const tempC = data?.current?.temperature_2m;
    const sunrise = data?.daily?.sunrise?.[0];
    const sunset = data?.daily?.sunset?.[0];
    if (typeof tempC !== 'number' || !sunrise || !sunset) return null;
    const dayLengthHours = (new Date(sunset).getTime() - new Date(sunrise).getTime()) / 3600000;
    if (!Number.isFinite(dayLengthHours) || dayLengthHours <= 0) return null;
    return { tempC, dayLengthHours };
  } catch {
    return null;
  }
}

/**
 * Rough heuristic, not a scientific model: warmer weather dries soil faster
 * (plants need water sooner), colder weather slower. 20°C is a neutral
 * baseline; the result scales how fast the watering countdown ticks down,
 * clamped to +/-40% so a single hot or cold day can't swing it wildly.
 */
export function seasonalFactorFromTemp(tempC: number): number {
  const raw = 1 + (tempC - 20) * 0.02;
  return Math.min(1.4, Math.max(0.6, raw));
}
