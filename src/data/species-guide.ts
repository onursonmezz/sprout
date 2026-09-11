/** Built-in care defaults for common houseplants, used to auto-suggest
 * settings when adding a plant and to show a quick reference card on the
 * plant detail screen. Not exhaustive or medical-grade — general guidance
 * only, editable by the user afterwards. */
export type SpeciesGuideEntry = {
  name: string;
  latinName: string;
  /** Index into addPlant.lightLevels: 0 Low, 1 Medium, 2 Bright indirect, 3 Direct sun. */
  lightLevelIndex: number;
  waterEveryDays: number;
  waterAmountMl: number;
  toxicToPets: boolean;
};

export const speciesGuide: SpeciesGuideEntry[] = [
  { name: 'Monstera', latinName: 'Monstera deliciosa', lightLevelIndex: 2, waterEveryDays: 8, waterAmountMl: 400, toxicToPets: true },
  { name: 'Pothos', latinName: 'Epipremnum aureum', lightLevelIndex: 1, waterEveryDays: 9, waterAmountMl: 250, toxicToPets: true },
  { name: 'Snake Plant', latinName: 'Sansevieria trifasciata', lightLevelIndex: 1, waterEveryDays: 18, waterAmountMl: 150, toxicToPets: true },
  { name: 'Fiddle Leaf Fig', latinName: 'Ficus lyrata', lightLevelIndex: 2, waterEveryDays: 8, waterAmountMl: 500, toxicToPets: true },
  { name: 'ZZ Plant', latinName: 'Zamioculcas zamiifolia', lightLevelIndex: 1, waterEveryDays: 16, waterAmountMl: 200, toxicToPets: true },
  { name: 'Peace Lily', latinName: 'Spathiphyllum wallisii', lightLevelIndex: 0, waterEveryDays: 7, waterAmountMl: 300, toxicToPets: true },
  { name: 'Spider Plant', latinName: 'Chlorophytum comosum', lightLevelIndex: 1, waterEveryDays: 7, waterAmountMl: 250, toxicToPets: false },
  { name: 'Boston Fern', latinName: 'Nephrolepis exaltata', lightLevelIndex: 1, waterEveryDays: 4, waterAmountMl: 200, toxicToPets: false },
  { name: 'Rubber Plant', latinName: 'Ficus elastica', lightLevelIndex: 2, waterEveryDays: 9, waterAmountMl: 350, toxicToPets: true },
  { name: 'Aloe Vera', latinName: 'Aloe barbadensis miller', lightLevelIndex: 3, waterEveryDays: 18, waterAmountMl: 150, toxicToPets: true },
  { name: 'Philodendron', latinName: 'Philodendron hederaceum', lightLevelIndex: 1, waterEveryDays: 8, waterAmountMl: 250, toxicToPets: true },
  { name: 'Succulent', latinName: 'Echeveria spp.', lightLevelIndex: 3, waterEveryDays: 14, waterAmountMl: 100, toxicToPets: false },
  { name: 'Orchid', latinName: 'Phalaenopsis spp.', lightLevelIndex: 2, waterEveryDays: 8, waterAmountMl: 150, toxicToPets: false },
  { name: 'English Ivy', latinName: 'Hedera helix', lightLevelIndex: 1, waterEveryDays: 6, waterAmountMl: 200, toxicToPets: true },
  { name: 'Calathea', latinName: 'Calathea spp.', lightLevelIndex: 1, waterEveryDays: 5, waterAmountMl: 250, toxicToPets: false },
  { name: 'Chinese Money Plant', latinName: 'Pilea peperomioides', lightLevelIndex: 2, waterEveryDays: 7, waterAmountMl: 200, toxicToPets: false },
  { name: 'Bird of Paradise', latinName: 'Strelitzia reginae', lightLevelIndex: 3, waterEveryDays: 7, waterAmountMl: 500, toxicToPets: true },
  { name: 'Dracaena', latinName: 'Dracaena fragrans', lightLevelIndex: 1, waterEveryDays: 12, waterAmountMl: 250, toxicToPets: true },
  { name: 'Jade Plant', latinName: 'Crassula ovata', lightLevelIndex: 3, waterEveryDays: 16, waterAmountMl: 100, toxicToPets: true },
  { name: 'Peperomia', latinName: 'Peperomia obtusifolia', lightLevelIndex: 1, waterEveryDays: 9, waterAmountMl: 150, toxicToPets: false },
];

export function findSpeciesMatches(query: string, limit = 5): SpeciesGuideEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return speciesGuide.filter((s) => s.name.toLowerCase().includes(q)).slice(0, limit);
}

export function findSpeciesExact(name: string): SpeciesGuideEntry | undefined {
  const q = name.trim().toLowerCase();
  return speciesGuide.find((s) => s.name.toLowerCase() === q);
}
