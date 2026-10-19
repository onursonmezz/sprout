import type { SpeciesRecord } from '@/data/species-guide';

/** The identification model runs only on the phone; the web preview hides it. */

export const PLANT_ID_CONFIDENT = 0.7;

export type PlantIdGuess = { species: SpeciesRecord; probability: number };

export const plantIdAvailable = false;

export async function identifyPlant(_uri: string): Promise<PlantIdGuess[]> {
  return [];
}
