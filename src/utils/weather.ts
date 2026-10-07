import * as Location from 'expo-location';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export async function requestLocationPermission(): Promise<boolean> {
  const existing = await Location.getForegroundPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.granted;
}

/** Today's sunrise-to-sunset length near the device, or null if permission is
 * missing, location can't be resolved, or the network request fails. */
export async function fetchDayLengthHours(): Promise<number | null> {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();
    if (!granted) return null;
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    const { latitude, longitude } = position.coords;
    const url = `${OPEN_METEO_URL}?latitude=${latitude}&longitude=${longitude}&daily=sunrise,sunset&timezone=auto`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const sunrise = data?.daily?.sunrise?.[0];
    const sunset = data?.daily?.sunset?.[0];
    if (!sunrise || !sunset) return null;
    const hours = (new Date(sunset).getTime() - new Date(sunrise).getTime()) / 3600000;
    return Number.isFinite(hours) && hours > 0 ? hours : null;
  } catch {
    return null;
  }
}
