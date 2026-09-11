import * as Location from 'expo-location';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export async function requestLocationPermission(): Promise<boolean> {
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.granted;
}

/** Current outdoor temperature near the device, or null if permission is
 * missing, location can't be resolved, or the network request fails. */
export async function fetchCurrentTemperatureC(): Promise<number | null> {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) return null;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const { latitude, longitude } = position.coords;
    const url = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const temp = data?.current?.temperature_2m;
    return typeof temp === 'number' ? temp : null;
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
