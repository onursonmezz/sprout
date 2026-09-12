// @ts-ignore - veri/watering.js is a plain JS module (see veri/VERITABANI.md);
// its exports are typed at the call sites below instead of at the source.
import { wateringInterval as rawWateringInterval } from '../../veri/watering.js';
import { HeatingSensitivity, LightKey, PotMaterialKey, wateringAlgorithm, WateringAlgorithm } from '@/data/species-guide';

/** The algorithm needs a window-distance and a heating-on/off input that the
 * app doesn't collect from the user yet. Both are hardcoded here so they're
 * trivial to replace once there's a real UI for them — TODO: ask the user
 * directly instead of assuming these. */
export const DEFAULT_WINDOW_DISTANCE_CM = 100;

export function isHeatingSeasonNow(date: Date = new Date()): boolean {
  // TODO: ask the user whether their heating is actually on; for now this
  // just assumes it's on for the whole conventional Turkish heating season.
  return wateringAlgorithm.heatingMonths.includes(date.getMonth() + 1);
}

/** wateringAlgorithm with season/heating/outdoor-heat factors neutralized —
 * used when the user has "Seasonal adjustment" turned off, so the interval
 * still reflects pot + light but not the calendar. */
function neutralAlgorithm(algo: WateringAlgorithm): WateringAlgorithm {
  return {
    ...algo,
    season: Object.fromEntries(Object.keys(algo.season).map((m) => [m, 1])),
    heatingFactor: Object.fromEntries(Object.keys(algo.heatingFactor).map((k) => [k, 1])) as Record<HeatingSensitivity, number>,
    outdoorSummer: {},
  };
}

export type WateringSite = {
  potMaterial: PotMaterialKey;
  potDiameterCm: number;
  light: LightKey;
  windowDistanceCm: number;
  indoor: boolean;
  heatingOn: boolean;
};

type WateringPlantInput = {
  baseIntervalDays: number;
  heatingSensitivity: HeatingSensitivity;
  pot: { materialKey: PotMaterialKey; diameterCm: number | null };
  environment: { lightKey: LightKey };
  indoor: boolean;
};

/**
 * Recomputes a plant's watering interval from its own stored conditions and
 * today's calendar month. Meant to be called at well-defined points (add/edit
 * save, watering, the daily rollover check) rather than on every render.
 */
export function recomputeWateringInterval(plant: WateringPlantInput, date: Date = new Date(), applySeasonalFactors = true): number {
  const site: WateringSite = {
    potMaterial: plant.pot.materialKey,
    potDiameterCm: plant.pot.diameterCm ?? 15,
    light: plant.environment.lightKey,
    windowDistanceCm: DEFAULT_WINDOW_DISTANCE_CM,
    indoor: plant.indoor,
    heatingOn: isHeatingSeasonNow(date),
  };
  const speciesLike = { water: { baseIntervalDays: plant.baseIntervalDays }, heatingSensitivity: plant.heatingSensitivity };
  const algo = applySeasonalFactors ? wateringAlgorithm : neutralAlgorithm(wateringAlgorithm);
  const result = rawWateringInterval(speciesLike, site, algo, date) as { intervalDays: number };
  return result.intervalDays;
}
