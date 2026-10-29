/**
 * How long seeds usually take to sprout, and how warm the soil likes to be,
 * for the species where two university tables agree on it being started from
 * seed:
 *   - NDSU Extension, "Time and Temperature Chart" (H-1139)
 *   - Iowa State University Yard and Garden, "Germination Requirements for
 *     Annuals and Vegetables" (reviewed December 2023)
 * Where their numbers differ, the range covers both. `surface` (needs light,
 * press onto the soil without covering) comes from Iowa State alone (NC State
 * Extension agrees for petunia), so the app adds "check the seed packet".
 * Temperatures are converted from °F and rounded to whole degrees.
 * Species found in only one table are left out until a second source agrees.
 */
export type Germination = {
  days: [number, number];
  soilTempC: [number, number];
  surface: boolean;
};

export const GERMINATION: Record<string, Germination> = {
  'solanum-lycopersicum': { days: [6, 12], soilTempC: [21, 29], surface: false },
  'capsicum-annuum': { days: [7, 15], soilTempC: [21, 29], surface: false },
  'solanum-melongena': { days: [7, 14], soilTempC: [21, 32], surface: false },
  'ocimum-basilicum': { days: [5, 14], soilTempC: [18, 27], surface: false },
  'petroselinum-crispum': { days: [10, 25], soilTempC: [21, 24], surface: false },
  'lactuca-sativa': { days: [3, 14], soilTempC: [16, 24], surface: true },
  'petunia-atkinsiana': { days: [7, 10], soilTempC: [24, 26], surface: true },
  'antirrhinum-majus': { days: [7, 14], soilTempC: [18, 21], surface: true },
};

/** Most seeds sprout well at about this soil temperature (NC State Extension: 65–75 °F). */
export const GENERAL_SOIL_TEMP_C: [number, number] = [18, 24];
