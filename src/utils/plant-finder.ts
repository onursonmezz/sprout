import { LightKey, SpeciesRecord, speciesGuide } from '@/data/species-guide';

export type FinderPlace = 'indoor' | 'outdoor';
export type FinderPets = 'none' | 'cat' | 'dog' | 'both';
export type FinderAttention = 'often' | 'sometimes' | 'rarely';

export type FinderAnswers = {
  place: FinderPlace;
  /** The spot's light level; ignored when a measured lux value is given. */
  light: LightKey;
  /** A light-meter reading for the spot, when the finder was opened from it. */
  lux: number | null;
  pets: FinderPets;
  attention: FinderAttention;
  beginner: boolean;
};

/** Species grown outdoors in a pot: the ones that want a balcony or garden. */
const OUTDOOR_CATEGORIES = ['outdoor', 'herb'];

/** How a species' light needs sit against a measured reading. */
export function luxFit(species: SpeciesRecord, lux: number): 'tooDark' | 'dim' | 'ok' | 'tooBright' {
  if (lux < species.light.luxMin * 0.5) return 'tooDark';
  if (lux < species.light.luxMin) return 'dim';
  return lux <= species.light.luxMax ? 'ok' : 'tooBright';
}

/** How well a species suits the answers, or null when it should not be offered. */
function score(species: SpeciesRecord, a: FinderAnswers): number | null {
  const outdoorSpecies = OUTDOOR_CATEGORIES.includes(species.category);
  if (a.lux == null && a.place === 'indoor' && outdoorSpecies) return null;
  if (a.lux == null && a.place === 'outdoor' && !outdoorSpecies && !species.light.tolerated.includes('full_sun') && species.light.preferred !== 'full_sun') {
    return null;
  }

  let total = 0;
  if (a.lux != null) {
    const fit = luxFit(species, a.lux);
    if (fit === 'tooDark' || fit === 'tooBright') return null;
    total += fit === 'ok' ? 3 : 1;
  } else if (species.light.preferred === a.light) total += 3;
  else if (species.light.tolerated.includes(a.light)) total += 1.5;
  else return null;

  if ((a.pets === 'cat' || a.pets === 'both') && species.toxicity.toxicToCats) return null;
  if ((a.pets === 'dog' || a.pets === 'both') && species.toxicity.toxicToDogs) return null;

  const interval = species.water.baseIntervalDays;
  if (a.attention === 'rarely') {
    if (interval < 6) return null;
    total += interval >= 12 ? 2 : interval >= 8 ? 0.5 : -1;
  } else if (a.attention === 'sometimes') {
    total += interval >= 7 && interval <= 14 ? 1 : interval < 5 ? -1 : 0;
  } else if (interval <= 7) total += 1;

  if (a.beginner) {
    if (species.difficulty >= 4) return null;
    total += species.difficulty <= 2 ? 2 : 0;
  }
  return total;
}

/** Species that suit the answers, best matches first. */
export function findPlants(answers: FinderAnswers): SpeciesRecord[] {
  return speciesGuide
    .map((species) => ({ species, score: score(species, answers) }))
    .filter((r): r is { species: SpeciesRecord; score: number } => r.score != null)
    .sort((a, b) => b.score - a.score || a.species.difficulty - b.species.difficulty)
    .map((r) => r.species);
}
