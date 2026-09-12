/** Rough lux boundaries between the app's four light-level categories
 * (Low, Medium, Bright indirect, Direct sun — same order as
 * addPlant.lightLevels). General horticultural ballpark figures, not
 * precise thresholds — a spot right at a boundary can go either way. */
const ZONE_UPPER_BOUNDS = [200, 1000, 10000];

export function lightLevelIndexForLux(lux: number): number {
  for (let i = 0; i < ZONE_UPPER_BOUNDS.length; i++) {
    if (lux < ZONE_UPPER_BOUNDS[i]) return i;
  }
  return ZONE_UPPER_BOUNDS.length;
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
let pendingListener: ((lightLevelIndex: number) => void) | null = null;

export function awaitLightMeterResult(listener: (lightLevelIndex: number) => void) {
  pendingListener = listener;
}

export function hasPendingLightMeterListener() {
  return pendingListener !== null;
}

export function resolveLightMeterResult(lightLevelIndex: number) {
  pendingListener?.(lightLevelIndex);
  pendingListener = null;
}
