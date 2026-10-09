// @ts-ignore - veri/watering.js is a plain JS module (see veri/VERITABANI.md);
// its exports are typed at the call sites below instead of at the source.
import { waterAmountMl as rawWaterAmountMl, wateringInterval as rawWateringInterval } from '../../veri/watering.js';
import { WateringStatus } from '@/data/plants';
import { HeatingSensitivity, LightKey, PotMaterialKey, SeasonProfile, wateringAlgorithm, WateringAlgorithm } from '@/data/species-guide';

export const DEFAULT_WINDOW_DISTANCE_CM = 100;

/** The distances offered in the add/edit form, one per band of the
 * algorithm's windowDistance table. */
export const WINDOW_DISTANCE_OPTIONS = [30, 100, 250, 400] as const;

/** Whether the calendar says this is conventional Turkish heating season
 * (Oct-Apr). Only a default / transition-detection signal — the live watering
 * calculation uses the user's own heatingOn setting instead. */
export function isHeatingSeasonNow(date: Date = new Date()): boolean {
  return wateringAlgorithm.heatingMonths.includes(date.getMonth() + 1);
}

/** wateringAlgorithm with season/heating/outdoor-heat factors neutralized —
 * used when the user has "Seasonal adjustment" turned off. */
function neutralAlgorithm(algo: WateringAlgorithm): WateringAlgorithm {
  return {
    ...algo,
    season: Object.fromEntries(Object.keys(algo.season).map((m) => [m, 1])),
    summerDormantSeason: Object.fromEntries(Object.keys(algo.summerDormantSeason).map((m) => [m, 1])),
    heatingFactor: Object.fromEntries(Object.keys(algo.heatingFactor).map((k) => [k, 1])) as Record<HeatingSensitivity, number>,
    outdoorSummer: {},
  };
}

type WateringPlantInput = {
  baseIntervalDays: number;
  heatingSensitivity: HeatingSensitivity;
  seasonProfile?: SeasonProfile;
  pot: { materialKey: PotMaterialKey; diameterCm: number | null; hasDrainage?: boolean };
  environment: { lightKey: LightKey; windowDistanceCm?: number };
  indoor: boolean;
};

export type SeasonalOptions = {
  /** "Seasonal adjustment" master toggle — off means season + heating both
   * sit at a neutral 1.0, only pot/light still shape the interval. */
  applySeasonalFactors: boolean;
  /** The user's own heating setting (Settings → "Kalorifer modu"). */
  heatingOn: boolean;
  /** Rounded latitude from the device's location, when known — flips the
   * seasons south of the equator and scales how strong they are. */
  latitude?: number | null;
  /** Date (YYYY-MM-DD) of the most recent day with real rain near the user. */
  lastRainDate?: string | null;
};

/** The algorithm's interval for a plant's own conditions on a given date. */
export function recomputeWateringInterval(plant: WateringPlantInput, date: Date = new Date(), options: SeasonalOptions): number {
  const site = {
    potMaterial: plant.pot.materialKey,
    potDiameterCm: plant.pot.diameterCm ?? 15,
    hasDrainage: plant.pot.hasDrainage ?? true,
    light: plant.environment.lightKey,
    windowDistanceCm: plant.environment.windowDistanceCm ?? DEFAULT_WINDOW_DISTANCE_CM,
    indoor: plant.indoor,
    heatingOn: options.heatingOn,
    latitude: options.latitude ?? null,
  };
  const speciesLike = { water: { baseIntervalDays: plant.baseIntervalDays }, heatingSensitivity: plant.heatingSensitivity, seasonProfile: plant.seasonProfile ?? 'normal' };
  const algo = options.applySeasonalFactors ? wateringAlgorithm : neutralAlgorithm(wateringAlgorithm);
  const result = rawWateringInterval(speciesLike, site, algo, date) as { intervalDays: number };
  return result.intervalDays;
}

/** How much water one watering should be for this pot, in ml. */
export function suggestWaterAmountMl(diameterCm: number | null, hasDrainage: boolean): number {
  return rawWaterAmountMl({ potDiameterCm: diameterCm ?? 15, hasDrainage }, wateringAlgorithm) as number;
}

export const INTERVAL_ADJUST_MIN = 0.5;
export const INTERVAL_ADJUST_MAX = 2;

const clampAdjust = (value: number) => Math.min(INTERVAL_ADJUST_MAX, Math.max(INTERVAL_ADJUST_MIN, value));

/** The interval actually in force: the user's own choice when they set one,
 * otherwise the algorithm's, corrected by what their soil feedback taught. */
export function effectiveWateringInterval(
  plant: WateringPlantInput & { customIntervalDays: number | null; intervalAdjust?: number },
  date: Date,
  options: SeasonalOptions
): number {
  if (plant.customIntervalDays != null) return plant.customIntervalDays;
  const algo = recomputeWateringInterval(plant, date, options);
  return Math.max(1, Math.round(algo * clampAdjust(plant.intervalAdjust ?? 1)));
}

/** How the soil was when the user watered. */
export type SoilFeedback = 'dry' | 'ok' | 'wet';

/** How strongly one answer pulls the correction toward what it implies. */
const LEARNING_RATE = 0.4;

/**
 * Updates a plant's interval correction from one answer.
 *
 * An answer is evidence about the ideal interval relative to how long the
 * soil actually went without water (elapsedDays), not relative to the
 * schedule: "just right" after 12 days says ~12 days is ideal; "still moist"
 * says the ideal is longer than that, so it can only lengthen the interval;
 * "too dry" says it is shorter, so it can only shorten it. That way watering
 * late or early by choice never teaches the wrong thing.
 */
export function learnIntervalAdjust(prevAdjust: number, algoIntervalDays: number, elapsedDays: number, answer: SoilFeedback): number {
  const prev = clampAdjust(prevAdjust);
  const elapsedRatio = elapsedDays / Math.max(1, algoIntervalDays);
  const target =
    answer === 'ok' ? elapsedRatio : answer === 'wet' ? Math.max(prev, elapsedRatio * 1.2) : Math.min(prev, elapsedRatio * 0.85);
  return clampAdjust(prev + LEARNING_RATE * (clampAdjust(target) - prev));
}

/** Whole calendar days since the last rainy day, or null when none is known. */
export function rainDaysAgo(lastRainDate: string | null | undefined, today: Date): number | null {
  if (!lastRainDate) return null;
  const [y, m, d] = lastRainDate.split('-').map(Number);
  if (!y || !m || !d) return null;
  const diff = Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(y, m - 1, d)) / 86400000);
  return diff >= 0 ? diff : null;
}

/** Days since the soil last got water: the user's own watering, or — for an
 * outdoor plant the rain reaches — a more recent rainy day. */
export function effectiveLastWatered(
  plant: { lastWateredDaysAgo: number; indoor: boolean; rainExposed?: boolean },
  options: SeasonalOptions,
  today: Date
): number {
  if (plant.indoor || !plant.rainExposed) return plant.lastWateredDaysAgo;
  const rain = rainDaysAgo(options.lastRainDate, today);
  return rain == null ? plant.lastWateredDaysAgo : Math.min(plant.lastWateredDaysAgo, rain);
}

/** Countdown + status from the three things that determine them. */
export function wateringSchedule(intervalDays: number, lastWateredDaysAgo: number, snoozeDays: number) {
  const daysUntilWatering = intervalDays - lastWateredDaysAgo + snoozeDays;
  const status: WateringStatus = daysUntilWatering < 0 ? 'overdue' : daysUntilWatering === 0 ? 'dueToday' : 'upcoming';
  return { daysUntilWatering, status };
}
