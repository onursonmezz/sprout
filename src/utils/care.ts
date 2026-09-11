import { Translations } from '@/constants/translations';

/** Multipliers on the base watering interval, in the same order as
 * addPlant.potMaterials (Terracotta, Plastic, Ceramic, Glazed). Unglazed
 * terracotta is porous and wicks moisture out through the walls, so it
 * dries noticeably faster than a sealed plastic or glazed pot of the same
 * size — it needs watering more often, hence the shorter interval. */
const POT_MATERIAL_FACTORS = [0.8, 1.15, 1.05, 1.15];

/** Multipliers in the same order as addPlant.lightLevels (Low, Medium,
 * Bright indirect, Direct sun). More light drives more photosynthesis and
 * evaporation, drying the soil faster. */
const LIGHT_LEVEL_FACTORS = [1.15, 1.0, 0.9, 0.75];

/** Pots without drainage holes hold water rather than letting excess drain
 * away, so they need watering less often to avoid waterlogged, oxygen-
 * starved roots. */
const NO_DRAINAGE_FACTOR = 1.15;

/**
 * A starting watering-interval suggestion from a base cadence (a species
 * guide default, or a generic fallback), adjusted for how the specific pot
 * and light conditions actually affect drying speed. Not a substitute for
 * observing the plant — just a better-informed starting point than a flat
 * number, which the stepper next to it can always override.
 */
export function suggestWaterEveryDays(
  baseDays: number,
  { potMaterialIndex, lightLevelIndex, drainage }: { potMaterialIndex: number; lightLevelIndex: number; drainage: 'yes' | 'no' }
) {
  const potFactor = POT_MATERIAL_FACTORS[potMaterialIndex] ?? 1;
  const lightFactor = LIGHT_LEVEL_FACTORS[lightLevelIndex] ?? 1;
  const drainageFactor = drainage === 'no' ? NO_DRAINAGE_FACTOR : 1;
  return Math.max(1, Math.round(baseDays * potFactor * lightFactor * drainageFactor));
}

/** Days from now until the next occurrence; negative means overdue. */
export function daysUntilNext(intervalDays: number, lastDoneDaysAgo: number) {
  return intervalDays - lastDoneDaysAgo;
}

/** Days-ago values for past occurrences of a recurring task, most recent first. */
export function generateEventDaysAgoList(intervalDays: number, lastDoneDaysAgo: number, maxDaysBack = 84) {
  const days: number[] = [];
  let d = Math.max(0, lastDoneDaysAgo);
  while (d <= maxDaysBack) {
    days.push(d);
    d += Math.max(1, intervalDays);
  }
  return days;
}

export function formatDateFromDaysOffset(daysFromToday: number, t: Translations) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const day = date.getDate();
  const month = t.calendar.monthsShort[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function relativeTime(daysAgo: number, t: Translations) {
  if (daysAgo <= 0) return t.plantDetail.history.today;
  if (daysAgo === 1) return t.plantDetail.history.oneDayAgo;
  if (daysAgo < 30) return t.plantDetail.history.daysAgo(daysAgo);
  const months = Math.max(1, Math.round(daysAgo / 30));
  if (months === 1) return t.plantDetail.history.oneMonthAgo;
  return t.plantDetail.history.monthsAgo(months);
}
