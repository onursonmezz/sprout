/**
 * How long seeds usually take to sprout, for species where at least two of
 * these university tables list them:
 *   - NDSU Extension, "Time and Temperature Chart" (H-1139)
 *   - Iowa State University Yard and Garden, "Germination Requirements for
 *     Annuals and Vegetables" (reviewed December 2023)
 *   - University of Missouri Extension, "Starting Plants Indoors From Seeds"
 *     (G6570, D. Trinklein)
 * Where the numbers differ, the range covers all of them.
 *
 * `soilTempC` is kept only where NDSU and Iowa State both give a germination
 * temperature (Missouri's table lists growing, not germination, temperature);
 * converted from °F and rounded. Without it the app gives the general
 * 18–24 °C that NC State and Missouri both recommend.
 *
 * `surface` (needs light: press onto the soil, do not cover) is set only where
 * two sources say so explicitly: Iowa State's light column plus Missouri's
 * "needs light to germinate" (or NC State for petunia). Left out, the app
 * gives the general covering rule and points to the seed packet.
 *
 * Found in only one table so far, and so left out: dill, nasturtium, marjoram.
 */
export type Germination = {
  days: [number, number];
  soilTempC?: [number, number];
  surface?: boolean;
};

export const GERMINATION: Record<string, Germination> = {
  'solanum-lycopersicum': { days: [6, 14], soilTempC: [21, 29] },
  'capsicum-annuum': { days: [7, 15], soilTempC: [21, 29] },
  'solanum-melongena': { days: [7, 14], soilTempC: [21, 32] },
  'ocimum-basilicum': { days: [5, 14], soilTempC: [18, 27] },
  'petroselinum-crispum': { days: [10, 25], soilTempC: [21, 24] },
  'lactuca-sativa': { days: [3, 14], soilTempC: [16, 24], surface: true },
  'petunia-atkinsiana': { days: [6, 12], soilTempC: [24, 26], surface: true },
  'antirrhinum-majus': { days: [7, 14], soilTempC: [18, 21], surface: true },
  'tagetes-patula': { days: [5, 7] },
  'zinnia-elegans': { days: [5, 7] },
  'cucumis-sativus': { days: [3, 10] },
  'salvia-splendens': { days: [10, 15], surface: true },
  'pelargonium-hortorum': { days: [7, 21] },
  // Iowa State says impatiens needs light, Missouri says to cover lightly.
  'impatiens-walleriana': { days: [10, 18] },
  'coleus-scutellarioides': { days: [8, 14], surface: true },
  'begonia-semperflorens': { days: [10, 14], surface: true },
  'cosmos-bipinnatus': { days: [5, 7] },
  'catharanthus-roseus': { days: [10, 15] },
};

/** Most seeds sprout well at about this soil temperature (NC State and Missouri: 65–75 °F). */
export const GENERAL_SOIL_TEMP_C: [number, number] = [18, 24];
