// @ts-ignore - veri/watering.js is a plain JS module (see veri/VERITABANI.md);
// its exports are typed at the call sites below instead of at the source.
import { wateringInterval as rawWateringInterval } from '../../veri/watering.js';
import { WateringStatus } from '@/data/plants';
import { HeatingSensitivity, LightKey, PotMaterialKey, wateringAlgorithm, WateringAlgorithm } from '@/data/species-guide';

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
    heatingFactor: Object.fromEntries(Object.keys(algo.heatingFactor).map((k) => [k, 1])) as Record<HeatingSensitivity, number>,
    outdoorSummer: {},
  };
}

type WateringPlantInput = {
  baseIntervalDays: number;
  heatingSensitivity: HeatingSensitivity;
  pot: { materialKey: PotMaterialKey; diameterCm: number | null };
  environment: { lightKey: LightKey; windowDistanceCm?: number };
  indoor: boolean;
};

export type SeasonalOptions = {
  /** "Seasonal adjustment" master toggle — off means season + heating both
   * sit at a neutral 1.0, only pot/light still shape the interval. */
  applySeasonalFactors: boolean;
  /** The user's own heating setting (Settings → "Kalorifer modu"). */
  heatingOn: boolean;
};

/** The algorithm's interval for a plant's own conditions on a given date. */
export function recomputeWateringInterval(plant: WateringPlantInput, date: Date = new Date(), options: SeasonalOptions): number {
  const site = {
    potMaterial: plant.pot.materialKey,
    potDiameterCm: plant.pot.diameterCm ?? 15,
    light: plant.environment.lightKey,
    windowDistanceCm: plant.environment.windowDistanceCm ?? DEFAULT_WINDOW_DISTANCE_CM,
    indoor: plant.indoor,
    heatingOn: options.heatingOn,
  };
  const speciesLike = { water: { baseIntervalDays: plant.baseIntervalDays }, heatingSensitivity: plant.heatingSensitivity };
  const algo = options.applySeasonalFactors ? wateringAlgorithm : neutralAlgorithm(wateringAlgorithm);
  const result = rawWateringInterval(speciesLike, site, algo, date) as { intervalDays: number };
  return result.intervalDays;
}

/** The interval actually in force: the user's own choice when they set one,
 * otherwise the algorithm's. */
export function effectiveWateringInterval(
  plant: WateringPlantInput & { customIntervalDays: number | null },
  date: Date,
  options: SeasonalOptions
): number {
  return plant.customIntervalDays ?? recomputeWateringInterval(plant, date, options);
}

/** Countdown + status from the three things that determine them. */
export function wateringSchedule(intervalDays: number, lastWateredDaysAgo: number, snoozeDays: number) {
  const daysUntilWatering = intervalDays - lastWateredDaysAgo + snoozeDays;
  const status: WateringStatus = daysUntilWatering < 0 ? 'overdue' : daysUntilWatering === 0 ? 'dueToday' : 'upcoming';
  return { daysUntilWatering, status };
}
