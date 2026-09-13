import { Ionicons } from '@expo/vector-icons';

import { SymptomKey } from './troubleshooting';

export type GuideCategoryKey = 'watering' | 'light' | 'potSoil' | 'pests' | 'seasonal';

/** Display order for the horizontal category row on the Guide tab. */
export const guideCategoryKeys: GuideCategoryKey[] = ['watering', 'light', 'potSoil', 'pests', 'seasonal'];

export const guideCategoryIcons: Record<GuideCategoryKey, keyof typeof Ionicons.glyphMap> = {
  watering: 'water-outline',
  light: 'sunny-outline',
  potSoil: 'flower-outline',
  pests: 'bug-outline',
  seasonal: 'calendar-outline',
};

export type GuideArticleKey = 'lowWaterVsOverwater' | 'wateringInterval' | 'potMaterial' | 'lightDistance' | 'seasonalCare';

export const guideArticleKeys: GuideArticleKey[] = [
  'lowWaterVsOverwater',
  'wateringInterval',
  'potMaterial',
  'lightDistance',
  'seasonalCare',
];

export type GuideArticleMeta = {
  key: GuideArticleKey;
  category: GuideCategoryKey;
  /** Matches an assets/images/guide/<imageKey>.jpg file once one exists; see guide-images.ts. */
  imageKey: string;
  emoji: string;
  readMinutes: number;
  featured?: boolean;
};

/** The "featured" entry doubles as the Guide tab's hero card; it's excluded
 * from the "Bakımın temelleri" grid, which renders everything else. */
export const guideArticles: Record<GuideArticleKey, GuideArticleMeta> = {
  lowWaterVsOverwater: { key: 'lowWaterVsOverwater', category: 'watering', imageKey: 'featured-watering', emoji: '💧', readMinutes: 6, featured: true },
  wateringInterval: { key: 'wateringInterval', category: 'watering', imageKey: 'guide-watering', emoji: '🚿', readMinutes: 4 },
  potMaterial: { key: 'potMaterial', category: 'potSoil', imageKey: 'guide-pot-soil', emoji: '🪴', readMinutes: 4 },
  lightDistance: { key: 'lightDistance', category: 'light', imageKey: 'guide-light', emoji: '☀️', readMinutes: 3 },
  seasonalCare: { key: 'seasonalCare', category: 'seasonal', imageKey: 'guide-seasonal', emoji: '🍂', readMinutes: 5 },
};

/** Which Guide category each troubleshooting symptom falls under, for the
 * category-row filter to apply to both articles and common issues. */
export const issueCategory: Record<SymptomKey, GuideCategoryKey> = {
  yellowLeaves: 'watering',
  brownTips: 'watering',
  droopingWilting: 'watering',
  leafDrop: 'seasonal',
  blackSpots: 'pests',
  whitePowder: 'pests',
  slowGrowth: 'light',
  curlingLeaves: 'light',
  leggyGrowth: 'light',
  mushyStem: 'potSoil',
};

/** Matches an assets/images/guide/<value>.jpg file once one exists. */
export const issueImageKeys: Record<SymptomKey, string> = {
  yellowLeaves: 'issue-yellow-leaves',
  brownTips: 'issue-brown-tips',
  droopingWilting: 'issue-drooping-wilting',
  leafDrop: 'issue-leaf-drop',
  blackSpots: 'issue-black-spots',
  whitePowder: 'issue-white-powder',
  slowGrowth: 'issue-slow-growth',
  curlingLeaves: 'issue-curling-leaves',
  leggyGrowth: 'issue-leggy-growth',
  mushyStem: 'issue-mushy-stem',
};

export type UrgencyLevel = 'low' | 'medium' | 'high';

export const urgencyColorKey: Record<UrgencyLevel, 'tint' | 'accent'> = {
  low: 'tint',
  medium: 'accent',
  high: 'accent',
};
