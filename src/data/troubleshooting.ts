export type SymptomKey =
  | 'yellowLeaves'
  | 'brownTips'
  | 'droopingWilting'
  | 'leafDrop'
  | 'blackSpots'
  | 'whitePowder'
  | 'slowGrowth'
  | 'curlingLeaves'
  | 'leggyGrowth'
  | 'mushyStem';

/** Symptom keys in display order. Display text and causes live in
 * translations.ts (t.troubleshooting) so this stays language-neutral. */
export const symptomKeys: SymptomKey[] = [
  'yellowLeaves',
  'brownTips',
  'droopingWilting',
  'leafDrop',
  'blackSpots',
  'whitePowder',
  'slowGrowth',
  'curlingLeaves',
  'leggyGrowth',
  'mushyStem',
];

export const symptomEmoji: Record<SymptomKey, string> = {
  yellowLeaves: '🍂',
  brownTips: '🥀',
  droopingWilting: '😔',
  leafDrop: '🍃',
  blackSpots: '⚫',
  whitePowder: '🩶',
  slowGrowth: '🐌',
  curlingLeaves: '🌀',
  leggyGrowth: '📏',
  mushyStem: '🦠',
};
