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
  // Aroids
  { name: 'Monstera', latinName: 'Monstera deliciosa', lightLevelIndex: 2, waterEveryDays: 8, waterAmountMl: 400, toxicToPets: true },
  { name: 'Monstera Adansonii', latinName: 'Monstera adansonii', lightLevelIndex: 2, waterEveryDays: 7, waterAmountMl: 300, toxicToPets: true },
  { name: 'Split Leaf Philodendron', latinName: 'Thaumatophyllum bipinnatifidum', lightLevelIndex: 2, waterEveryDays: 9, waterAmountMl: 400, toxicToPets: true },
  { name: 'Pothos', latinName: 'Epipremnum aureum', lightLevelIndex: 1, waterEveryDays: 9, waterAmountMl: 250, toxicToPets: true },
  { name: 'Philodendron', latinName: 'Philodendron hederaceum', lightLevelIndex: 1, waterEveryDays: 8, waterAmountMl: 250, toxicToPets: true },
  { name: 'Philodendron Birkin', latinName: "Philodendron 'Birkin'", lightLevelIndex: 2, waterEveryDays: 8, waterAmountMl: 250, toxicToPets: true },
  { name: 'Syngonium', latinName: 'Syngonium podophyllum', lightLevelIndex: 1, waterEveryDays: 7, waterAmountMl: 200, toxicToPets: true },
  { name: 'Scindapsus', latinName: 'Scindapsus pictus', lightLevelIndex: 1, waterEveryDays: 8, waterAmountMl: 200, toxicToPets: true },
  { name: 'Alocasia', latinName: 'Alocasia amazonica', lightLevelIndex: 2, waterEveryDays: 6, waterAmountMl: 250, toxicToPets: true },
  { name: 'Elephant Ear', latinName: 'Alocasia macrorrhiza', lightLevelIndex: 2, waterEveryDays: 6, waterAmountMl: 300, toxicToPets: true },
  { name: 'Anthurium', latinName: 'Anthurium andraeanum', lightLevelIndex: 2, waterEveryDays: 7, waterAmountMl: 200, toxicToPets: true },
  { name: 'Caladium', latinName: 'Caladium bicolor', lightLevelIndex: 2, waterEveryDays: 5, waterAmountMl: 200, toxicToPets: true },
  { name: 'Aglaonema', latinName: 'Aglaonema commutatum', lightLevelIndex: 1, waterEveryDays: 8, waterAmountMl: 250, toxicToPets: true },
  { name: 'Dieffenbachia', latinName: 'Dieffenbachia seguine', lightLevelIndex: 1, waterEveryDays: 7, waterAmountMl: 250, toxicToPets: true },

  // Succulents & cacti
  { name: 'Succulent', latinName: 'Echeveria spp.', lightLevelIndex: 3, waterEveryDays: 14, waterAmountMl: 100, toxicToPets: false },
  { name: 'Aloe Vera', latinName: 'Aloe barbadensis miller', lightLevelIndex: 3, waterEveryDays: 18, waterAmountMl: 150, toxicToPets: true },
  { name: 'Jade Plant', latinName: 'Crassula ovata', lightLevelIndex: 3, waterEveryDays: 16, waterAmountMl: 100, toxicToPets: true },
  { name: 'Haworthia', latinName: 'Haworthia fasciata', lightLevelIndex: 2, waterEveryDays: 16, waterAmountMl: 100, toxicToPets: false },
  { name: 'Kalanchoe', latinName: 'Kalanchoe blossfeldiana', lightLevelIndex: 3, waterEveryDays: 12, waterAmountMl: 150, toxicToPets: true },
  { name: 'Panda Plant', latinName: 'Kalanchoe tomentosa', lightLevelIndex: 3, waterEveryDays: 16, waterAmountMl: 100, toxicToPets: true },
  { name: "Burro's Tail", latinName: 'Sedum morganianum', lightLevelIndex: 3, waterEveryDays: 14, waterAmountMl: 100, toxicToPets: false },
  { name: 'String of Pearls', latinName: 'Senecio rowleyanus', lightLevelIndex: 2, waterEveryDays: 12, waterAmountMl: 100, toxicToPets: true },
  { name: 'String of Bananas', latinName: 'Senecio radicans', lightLevelIndex: 2, waterEveryDays: 12, waterAmountMl: 100, toxicToPets: true },
  { name: 'String of Hearts', latinName: 'Ceropegia woodii', lightLevelIndex: 2, waterEveryDays: 12, waterAmountMl: 100, toxicToPets: false },
  { name: 'Barrel Cactus', latinName: 'Echinocactus grusonii', lightLevelIndex: 3, waterEveryDays: 21, waterAmountMl: 100, toxicToPets: false },
  { name: 'Prickly Pear Cactus', latinName: 'Opuntia spp.', lightLevelIndex: 3, waterEveryDays: 21, waterAmountMl: 150, toxicToPets: false },
  { name: 'Christmas Cactus', latinName: 'Schlumbergera bridgesii', lightLevelIndex: 1, waterEveryDays: 10, waterAmountMl: 150, toxicToPets: false },
  { name: 'Yucca', latinName: 'Yucca elephantipes', lightLevelIndex: 3, waterEveryDays: 14, waterAmountMl: 300, toxicToPets: true },
  { name: 'Ponytail Palm', latinName: 'Beaucarnea recurvata', lightLevelIndex: 3, waterEveryDays: 21, waterAmountMl: 150, toxicToPets: false },

  // Ferns
  { name: 'Boston Fern', latinName: 'Nephrolepis exaltata', lightLevelIndex: 1, waterEveryDays: 4, waterAmountMl: 200, toxicToPets: false },
  { name: 'Maidenhair Fern', latinName: 'Adiantum raddianum', lightLevelIndex: 1, waterEveryDays: 3, waterAmountMl: 200, toxicToPets: false },
  { name: "Bird's Nest Fern", latinName: 'Asplenium nidus', lightLevelIndex: 1, waterEveryDays: 6, waterAmountMl: 250, toxicToPets: false },
  { name: 'Staghorn Fern', latinName: 'Platycerium bifurcatum', lightLevelIndex: 2, waterEveryDays: 10, waterAmountMl: 200, toxicToPets: false },

  // Palms
  { name: 'Areca Palm', latinName: 'Dypsis lutescens', lightLevelIndex: 2, waterEveryDays: 7, waterAmountMl: 400, toxicToPets: false },
  { name: 'Parlor Palm', latinName: 'Chamaedorea elegans', lightLevelIndex: 1, waterEveryDays: 8, waterAmountMl: 300, toxicToPets: false },
  { name: 'Majesty Palm', latinName: 'Ravenea rivularis', lightLevelIndex: 2, waterEveryDays: 5, waterAmountMl: 400, toxicToPets: false },

  // Trees & large foliage
  { name: 'Fiddle Leaf Fig', latinName: 'Ficus lyrata', lightLevelIndex: 2, waterEveryDays: 8, waterAmountMl: 500, toxicToPets: true },
  { name: 'Rubber Plant', latinName: 'Ficus elastica', lightLevelIndex: 2, waterEveryDays: 9, waterAmountMl: 350, toxicToPets: true },
  { name: 'Weeping Fig', latinName: 'Ficus benjamina', lightLevelIndex: 2, waterEveryDays: 8, waterAmountMl: 400, toxicToPets: true },
  { name: 'Money Tree', latinName: 'Pachira aquatica', lightLevelIndex: 1, waterEveryDays: 10, waterAmountMl: 300, toxicToPets: false },
  { name: 'Norfolk Island Pine', latinName: 'Araucaria heterophylla', lightLevelIndex: 2, waterEveryDays: 8, waterAmountMl: 300, toxicToPets: true },
  { name: 'Croton', latinName: 'Codiaeum variegatum', lightLevelIndex: 3, waterEveryDays: 6, waterAmountMl: 250, toxicToPets: true },
  { name: 'Umbrella Tree', latinName: 'Schefflera arboricola', lightLevelIndex: 2, waterEveryDays: 8, waterAmountMl: 300, toxicToPets: true },
  { name: 'Coffee Plant', latinName: 'Coffea arabica', lightLevelIndex: 2, waterEveryDays: 6, waterAmountMl: 300, toxicToPets: true },
  { name: 'Avocado Plant', latinName: 'Persea americana', lightLevelIndex: 2, waterEveryDays: 5, waterAmountMl: 300, toxicToPets: true },
  { name: 'Bird of Paradise', latinName: 'Strelitzia reginae', lightLevelIndex: 3, waterEveryDays: 7, waterAmountMl: 500, toxicToPets: true },
  { name: 'Dracaena', latinName: 'Dracaena fragrans', lightLevelIndex: 1, waterEveryDays: 12, waterAmountMl: 250, toxicToPets: true },
  { name: 'Lucky Bamboo', latinName: 'Dracaena sanderiana', lightLevelIndex: 1, waterEveryDays: 10, waterAmountMl: 200, toxicToPets: true },
  { name: 'Ti Plant', latinName: 'Cordyline fruticosa', lightLevelIndex: 2, waterEveryDays: 6, waterAmountMl: 250, toxicToPets: true },
  { name: 'Cast Iron Plant', latinName: 'Aspidistra elatior', lightLevelIndex: 0, waterEveryDays: 12, waterAmountMl: 250, toxicToPets: false },
  { name: 'ZZ Plant', latinName: 'Zamioculcas zamiifolia', lightLevelIndex: 1, waterEveryDays: 16, waterAmountMl: 200, toxicToPets: true },
  { name: 'Snake Plant', latinName: 'Sansevieria trifasciata', lightLevelIndex: 1, waterEveryDays: 18, waterAmountMl: 150, toxicToPets: true },

  // Trailing & vining
  { name: 'English Ivy', latinName: 'Hedera helix', lightLevelIndex: 1, waterEveryDays: 6, waterAmountMl: 200, toxicToPets: true },
  { name: 'Grape Ivy', latinName: 'Cissus rhombifolia', lightLevelIndex: 1, waterEveryDays: 7, waterAmountMl: 200, toxicToPets: false },
  { name: 'Swedish Ivy', latinName: 'Plectranthus verticillatus', lightLevelIndex: 1, waterEveryDays: 6, waterAmountMl: 200, toxicToPets: false },
  { name: 'Wandering Jew', latinName: 'Tradescantia zebrina', lightLevelIndex: 2, waterEveryDays: 6, waterAmountMl: 200, toxicToPets: true },

  // Flowering
  { name: 'Peace Lily', latinName: 'Spathiphyllum wallisii', lightLevelIndex: 0, waterEveryDays: 7, waterAmountMl: 300, toxicToPets: true },
  { name: 'Orchid', latinName: 'Phalaenopsis spp.', lightLevelIndex: 2, waterEveryDays: 8, waterAmountMl: 150, toxicToPets: false },
  { name: 'African Violet', latinName: 'Saintpaulia ionantha', lightLevelIndex: 1, waterEveryDays: 6, waterAmountMl: 100, toxicToPets: false },
  { name: 'Begonia', latinName: 'Begonia spp.', lightLevelIndex: 1, waterEveryDays: 6, waterAmountMl: 200, toxicToPets: true },
  { name: 'Rex Begonia', latinName: 'Begonia rex', lightLevelIndex: 1, waterEveryDays: 6, waterAmountMl: 200, toxicToPets: true },
  { name: 'Hibiscus', latinName: 'Hibiscus rosa-sinensis', lightLevelIndex: 3, waterEveryDays: 4, waterAmountMl: 400, toxicToPets: false },
  { name: 'Cyclamen', latinName: 'Cyclamen persicum', lightLevelIndex: 1, waterEveryDays: 6, waterAmountMl: 150, toxicToPets: true },
  { name: 'Amaryllis', latinName: 'Hippeastrum spp.', lightLevelIndex: 2, waterEveryDays: 7, waterAmountMl: 200, toxicToPets: true },
  { name: 'Bromeliad', latinName: 'Guzmania lingulata', lightLevelIndex: 1, waterEveryDays: 14, waterAmountMl: 100, toxicToPets: false },
  { name: 'Air Plant', latinName: 'Tillandsia spp.', lightLevelIndex: 2, waterEveryDays: 10, waterAmountMl: 50, toxicToPets: false },

  // Patterned foliage
  { name: 'Calathea', latinName: 'Calathea spp.', lightLevelIndex: 1, waterEveryDays: 5, waterAmountMl: 250, toxicToPets: false },
  { name: 'Rattlesnake Plant', latinName: 'Calathea lancifolia', lightLevelIndex: 1, waterEveryDays: 5, waterAmountMl: 250, toxicToPets: false },
  { name: 'Prayer Plant', latinName: 'Maranta leuconeura', lightLevelIndex: 1, waterEveryDays: 5, waterAmountMl: 250, toxicToPets: false },
  { name: 'Fittonia', latinName: 'Fittonia albivenis', lightLevelIndex: 0, waterEveryDays: 4, waterAmountMl: 200, toxicToPets: false },
  { name: 'Polka Dot Plant', latinName: 'Hypoestes phyllostachya', lightLevelIndex: 1, waterEveryDays: 5, waterAmountMl: 200, toxicToPets: false },
  { name: 'Chinese Money Plant', latinName: 'Pilea peperomioides', lightLevelIndex: 2, waterEveryDays: 7, waterAmountMl: 200, toxicToPets: false },
  { name: 'Spider Plant', latinName: 'Chlorophytum comosum', lightLevelIndex: 1, waterEveryDays: 7, waterAmountMl: 250, toxicToPets: false },
  { name: 'Peperomia', latinName: 'Peperomia obtusifolia', lightLevelIndex: 1, waterEveryDays: 9, waterAmountMl: 150, toxicToPets: false },
  { name: 'Watermelon Peperomia', latinName: 'Peperomia argyreia', lightLevelIndex: 1, waterEveryDays: 9, waterAmountMl: 150, toxicToPets: false },

  // Herbs
  { name: 'Basil', latinName: 'Ocimum basilicum', lightLevelIndex: 3, waterEveryDays: 3, waterAmountMl: 250, toxicToPets: false },
  { name: 'Mint', latinName: 'Mentha spp.', lightLevelIndex: 2, waterEveryDays: 3, waterAmountMl: 250, toxicToPets: false },
  { name: 'Rosemary', latinName: 'Salvia rosmarinus', lightLevelIndex: 3, waterEveryDays: 5, waterAmountMl: 200, toxicToPets: false },
  { name: 'Lavender', latinName: 'Lavandula spp.', lightLevelIndex: 3, waterEveryDays: 6, waterAmountMl: 200, toxicToPets: false },
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

/** Looser match for real-world species text ("Monstera Deliciosa", "monstera")
 * that won't hit findSpeciesExact's exact-name requirement — matches either
 * direction as a substring against the common name or the Latin name. */
export function findSpeciesLoose(name: string): SpeciesGuideEntry | undefined {
  const q = name.trim().toLowerCase();
  if (!q || q === '—') return undefined;
  return (
    findSpeciesExact(name) ??
    speciesGuide.find((s) => {
      const n = s.name.toLowerCase();
      const latin = s.latinName.toLowerCase();
      return n.includes(q) || q.includes(n) || latin.includes(q) || q.includes(latin);
    })
  );
}
