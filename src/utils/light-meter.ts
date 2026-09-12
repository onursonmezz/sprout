import { lookups, LightKey } from '@/data/species-guide';

/** Highest-min-first order, so classification (below) checks full_sun before
 * falling back toward dark. */
const ZONE_ORDER: LightKey[] = ['full_sun', 'part_sun', 'shade', 'dark'];

/** Classifies a generic (no specific plant) lux reading into one of the
 * database's four light categories. lookups.lightLux ranges overlap by
 * design (a category's max reaches into the next one up), so this picks the
 * highest category whose min the reading meets rather than trying to find a
 * single non-overlapping bucket. */
export function lightKeyForLux(lux: number): LightKey {
  for (const key of ZONE_ORDER) {
    if (lux >= lookups.lightLux[key].min) return key;
  }
  return 'dark';
}

const METER_MIN_LUX = 10;
const METER_MAX_LUX = 100000;

/** 0..1 position for a fill/marker on the meter. Lux spans several orders
 * of magnitude between a dim room and full sun, so a log scale is used —
 * a linear one would make every indoor reading look like zero. */
export function logMeterPosition(lux: number) {
  const clamped = Math.min(METER_MAX_LUX, Math.max(METER_MIN_LUX, lux));
  const minLog = Math.log10(METER_MIN_LUX);
  const maxLog = Math.log10(METER_MAX_LUX);
  return (Math.log10(clamped) - minLog) / (maxLog - minLog);
}

/**
 * Expo Router has no built-in way to hand a value back to the screen that
 * pushed the light meter, so a one-shot listener fills that gap: add-plant.tsx
 * registers a callback before navigating in, the meter screen resolves it
 * when the user taps "Use this reading" and pops itself. Opening the meter
 * from anywhere else (no listener registered) just leaves it as a standalone
 * reference tool — "Use this reading" only renders when a listener exists.
 */
let pendingListener: ((lightKey: LightKey) => void) | null = null;

export function awaitLightMeterResult(listener: (lightKey: LightKey) => void) {
  pendingListener = listener;
}

export function hasPendingLightMeterListener() {
  return pendingListener !== null;
}

export function resolveLightMeterResult(lightKey: LightKey) {
  pendingListener?.(lightKey);
  pendingListener = null;
}
