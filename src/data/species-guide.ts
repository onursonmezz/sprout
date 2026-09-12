import plantsDb from '../../veri/plants.json';

/** Canonical light-category keys the watering algorithm and the light
 * meter both key off of — see veri/VERITABANI.md. Order matches the
 * database's own dark→full_sun ordering used for display pickers. */
export type LightKey = 'full_sun' | 'part_sun' | 'shade' | 'dark';
export const LIGHT_KEYS: LightKey[] = ['full_sun', 'part_sun', 'shade', 'dark'];

/** Canonical pot-material keys the watering algorithm recognizes — see
 * veri/plants.json's wateringAlgorithm.potMaterial. */
export type PotMaterialKey =
  | 'terracotta'
  | 'earthenware'
  | 'concrete'
  | 'wood'
  | 'plastic'
  | 'glazed'
  | 'porcelain'
  | 'stoneware'
  | 'metal'
  | 'glass'
  | 'shallow'
  | 'no_pot';
export const POT_MATERIAL_KEYS: PotMaterialKey[] = [
  'terracotta',
  'earthenware',
  'concrete',
  'wood',
  'plastic',
  'glazed',
  'porcelain',
  'stoneware',
  'metal',
  'glass',
  'shallow',
  'no_pot',
];

export type ToxicitySeverity = 'none' | 'mild' | 'moderate' | 'severe';
export type HumidityLevel = 'low' | 'med' | 'high';
export type HeatingSensitivity = 'low' | 'med' | 'high';
export type SoilTypeKey = 'cactus' | 'coco_peat' | 'universal' | 'orchid_bark' | 'perlite' | 'acidic' | 'sandy' | 'rich';
export type PlantCategory = 'foliage' | 'succulent' | 'cactus' | 'palm' | 'fern' | 'flowering' | 'outdoor' | 'herb' | 'orchid';

export type SpeciesRecord = {
  id: string;
  scientificName: string;
  commonNamesTr: string[];
  commonNameEn: string;
  family: string;
  category: PlantCategory;
  categoryTr: string;
  difficulty: number;
  light: {
    preferred: LightKey;
    preferredTr: string;
    tolerated: LightKey[];
    luxMin: number;
    luxIdeal: number;
    luxMax: number;
  };
  water: {
    baseIntervalDays: number;
    dryLevel: 'full' | 'half' | 'top' | 'moist';
    dryLevelTr: string;
  };
  humidity: { level: HumidityLevel; levelTr: string };
  temperature: { idealMinC: number; idealMaxC: number; survivalMinC: number };
  soil: { types: SoilTypeKey[]; typesTr: string[] };
  repotEveryMonths: number;
  fertilize: { months: number[]; intervalDays: number };
  toxicity: {
    affects: string[];
    toxicToCats: boolean;
    toxicToDogs: boolean;
    toxicToHumans: boolean;
    severity: ToxicitySeverity;
    severityTr: string;
    note: string;
    source: string;
    needsVerification: boolean;
  };
  size: { heightMinCm: number; heightMaxCm: number; spreadMinCm: number; spreadMaxCm: number };
  growthRate: 'slow' | 'med' | 'fast';
  propagation: string[];
  heatingSensitivity: HeatingSensitivity;
  turkeyNote: string;
};

export type WateringAlgorithm = {
  potMaterial: Record<PotMaterialKey, number>;
  potSize: [number, number][];
  lightFactor: Record<LightKey, number>;
  windowDistance: [number, number][];
  season: Record<string, number>;
  heatingFactor: Record<HeatingSensitivity, number>;
  heatingMonths: number[];
  outdoorSummer: Record<string, number>;
  minIntervalDays: number;
  maxIntervalDays: number;
};

type PlantsDb = {
  meta: unknown;
  lookups: {
    lightLux: Record<LightKey, { min: number; ideal: number; max: number }>;
    lightLabelTr: Record<LightKey, string>;
    dryLabelTr: Record<string, string>;
    humidityLabelTr: Record<HumidityLevel, string>;
    toxSeverityTr: Record<ToxicitySeverity, string>;
    categoryTr: Record<PlantCategory, string>;
    soilTr: Record<SoilTypeKey, string>;
  };
  wateringAlgorithm: WateringAlgorithm;
  plants: SpeciesRecord[];
};

const db = plantsDb as unknown as PlantsDb;

export const speciesGuide: SpeciesRecord[] = db.plants;
export const wateringAlgorithm: WateringAlgorithm = db.wateringAlgorithm;
export const lookups = db.lookups;

function matches(record: SpeciesRecord, q: string) {
  return (
    record.commonNameEn.toLowerCase().includes(q) ||
    record.scientificName.toLowerCase().includes(q) ||
    record.commonNamesTr.some((n) => n.toLowerCase().includes(q))
  );
}

export function findSpeciesMatches(query: string, limit = 5): SpeciesRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return speciesGuide.filter((s) => matches(s, q)).slice(0, limit);
}

export function findSpeciesExact(name: string): SpeciesRecord | undefined {
  const q = name.trim().toLowerCase();
  return speciesGuide.find(
    (s) => s.commonNameEn.toLowerCase() === q || s.scientificName.toLowerCase() === q || s.commonNamesTr.some((n) => n.toLowerCase() === q)
  );
}

/** Looser match for real-world species text ("Monstera Deliciosa", "monstera")
 * that won't hit findSpeciesExact's exact-name requirement — matches either
 * direction as a substring against any of the plant's names. */
export function findSpeciesLoose(name: string): SpeciesRecord | undefined {
  const q = name.trim().toLowerCase();
  if (!q || q === '—') return undefined;
  const exact = findSpeciesExact(name);
  if (exact) return exact;
  return speciesGuide.find((s) => {
    const names = [s.commonNameEn, s.scientificName, ...s.commonNamesTr].map((n) => n.toLowerCase());
    return names.some((n) => n.includes(q) || q.includes(n));
  });
}

/** Display name for a species in the given UI language — Turkish's primary
 * common name, or the single English common name. */
export function speciesDisplayName(species: SpeciesRecord, language: 'en' | 'tr') {
  return language === 'tr' ? species.commonNamesTr[0] : species.commonNameEn;
}
