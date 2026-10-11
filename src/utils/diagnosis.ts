import { Plant } from '@/data/plants';
import { LightKey } from '@/data/species-guide';
import { SymptomKey } from '@/data/troubleshooting';
import { careTaskInSeason, daysUntilNext, speciesOf } from '@/utils/care';
import { ForecastDay } from '@/utils/seasonal-tasks';

export type CauseKey =
  | 'overwater'
  | 'underwater'
  | 'lowLight'
  | 'tooMuchSun'
  | 'dryAir'
  | 'cold'
  | 'shock'
  | 'pests'
  | 'fungus'
  | 'nutrients'
  | 'rootbound'
  | 'aging'
  | 'tapWater'
  | 'resting';

export type QuestionKey = 'soil' | 'where' | 'moved' | 'bugs' | 'stem';

export const QUESTION_OPTIONS = {
  soil: ['wet', 'moist', 'dry'],
  where: ['old', 'new', 'all'],
  moved: ['yes', 'no'],
  bugs: ['yes', 'no'],
  stem: ['yes', 'no'],
} as const satisfies Record<QuestionKey, readonly string[]>;

export type Answers = Partial<Record<QuestionKey, string>>;

/** How likely each cause is for a symptom before anything is known about the plant. */
const BASE: Record<SymptomKey, Partial<Record<CauseKey, number>>> = {
  yellowLeaves: { overwater: 3, lowLight: 1.5, nutrients: 1.5, underwater: 1, aging: 1, pests: 1, rootbound: 1 },
  brownTips: { dryAir: 3, tapWater: 2, underwater: 2, tooMuchSun: 1 },
  droopingWilting: { underwater: 3, overwater: 2, shock: 1.5, cold: 1, rootbound: 1, tooMuchSun: 1 },
  leafDrop: { shock: 3, cold: 2, overwater: 1.5, underwater: 1.5, lowLight: 1 },
  blackSpots: { fungus: 3, overwater: 2, cold: 1, tooMuchSun: 1, pests: 1 },
  whitePowder: { fungus: 3, pests: 2, tapWater: 1 },
  slowGrowth: { lowLight: 3, nutrients: 2, rootbound: 2, resting: 1, cold: 1 },
  curlingLeaves: { underwater: 2.5, dryAir: 2, tooMuchSun: 2, pests: 1.5, cold: 1, overwater: 1 },
  leggyGrowth: { lowLight: 4, nutrients: 0.5 },
  mushyStem: { overwater: 4, fungus: 2, cold: 1 },
};

/** The questions worth asking for each symptom, in order. */
export const QUESTIONS: Record<SymptomKey, QuestionKey[]> = {
  yellowLeaves: ['soil', 'where', 'bugs'],
  brownTips: ['soil'],
  droopingWilting: ['soil', 'moved'],
  leafDrop: ['moved', 'soil'],
  blackSpots: ['soil', 'bugs'],
  whitePowder: ['bugs'],
  slowGrowth: ['moved'],
  curlingLeaves: ['soil', 'bugs'],
  leggyGrowth: [],
  mushyStem: ['soil', 'stem'],
};

/** A piece of evidence: which cause it speaks for (or against), how strongly,
 * and the sentence shown to the user (a key into the translations). */
export type Evidence = { cause: CauseKey; weight: number; reason?: string; n?: number };

const ANSWER_EVIDENCE: Record<QuestionKey, Record<string, Evidence[]>> = {
  soil: {
    wet: [
      { cause: 'overwater', weight: 3, reason: 'soilWet' },
      { cause: 'fungus', weight: 1, reason: 'soilWet' },
      { cause: 'underwater', weight: -3 },
    ],
    moist: [
      { cause: 'underwater', weight: -1 },
      { cause: 'overwater', weight: -0.5 },
    ],
    dry: [
      { cause: 'underwater', weight: 3, reason: 'soilDry' },
      { cause: 'overwater', weight: -3 },
    ],
  },
  where: {
    old: [
      { cause: 'aging', weight: 2, reason: 'whereOld' },
      { cause: 'overwater', weight: 1 },
      { cause: 'nutrients', weight: 0.5 },
    ],
    new: [
      { cause: 'nutrients', weight: 1.5, reason: 'whereNew' },
      { cause: 'pests', weight: 1, reason: 'whereNew' },
      { cause: 'aging', weight: -2 },
    ],
    all: [
      { cause: 'overwater', weight: 1, reason: 'whereAll' },
      { cause: 'underwater', weight: 1, reason: 'whereAll' },
      { cause: 'aging', weight: -1 },
    ],
  },
  moved: {
    yes: [{ cause: 'shock', weight: 3, reason: 'movedYes' }],
    no: [{ cause: 'shock', weight: -2 }],
  },
  bugs: {
    yes: [{ cause: 'pests', weight: 4, reason: 'bugsYes' }],
    no: [
      { cause: 'pests', weight: -2 },
      { cause: 'fungus', weight: 0.5 },
    ],
  },
  stem: {
    yes: [
      { cause: 'overwater', weight: 3, reason: 'stemYes' },
      { cause: 'fungus', weight: 1, reason: 'stemYes' },
    ],
    no: [{ cause: 'overwater', weight: -1 }],
  },
};

const LIGHT_RANK: Record<LightKey, number> = { dark: 0, shade: 1, part_sun: 2, full_sun: 3 };

export type DiagnosisContext = { heatingOn: boolean; forecast: ForecastDay[]; latitude: number | null; today?: Date };

/** What the app already knows about this plant that bears on a diagnosis. */
export function plantEvidence(plant: Plant, context: DiagnosisContext): Evidence[] {
  const out: Evidence[] = [];
  const species = speciesOf(plant);
  const today = context.today ?? new Date();

  if (plant.daysUntilWatering < -1) out.push({ cause: 'underwater', weight: 2, reason: 'overdue', n: -plant.daysUntilWatering });
  if (plant.customIntervalDays == null && plant.intervalAdjust >= 1.1) out.push({ cause: 'overwater', weight: 1.5, reason: 'feedbackMoist' });
  if (plant.customIntervalDays == null && plant.intervalAdjust <= 0.9) out.push({ cause: 'underwater', weight: 1.5, reason: 'feedbackDry' });
  if (!plant.pot.hasDrainage) out.push({ cause: 'overwater', weight: 2, reason: 'noDrainage' });

  const lightGap = LIGHT_RANK[plant.environment.lightKey] - LIGHT_RANK[species?.light.preferred ?? 'part_sun'];
  if (lightGap < 0) out.push({ cause: 'lowLight', weight: 1.5 * -lightGap, reason: 'darkerThanLikes' });
  if (lightGap > 0) out.push({ cause: 'tooMuchSun', weight: 1.5 * lightGap, reason: 'brighterThanLikes' });
  if (plant.indoor && plant.environment.windowDistanceCm >= 250) out.push({ cause: 'lowLight', weight: 1, reason: 'farFromWindow' });

  if (plant.indoor && context.heatingOn) {
    out.push({ cause: 'dryAir', weight: plant.heatingSensitivity === 'high' ? 2.5 : plant.heatingSensitivity === 'med' ? 1.5 : 0.5, reason: 'heatingOn' });
  }

  const repot = plant.care.find((c) => c.type === 'repot');
  if (repot && daysUntilNext(repot.intervalDays, repot.lastDoneDaysAgo) <= 0) out.push({ cause: 'rootbound', weight: 2, reason: 'repotDue' });

  const lastRepot = plant.journalNotes.filter((e) => e.type === 'repotted').sort((a, b) => a.daysAgo - b.daysAgo)[0];
  if (lastRepot && lastRepot.daysAgo <= 21) out.push({ cause: 'shock', weight: 2.5, reason: 'recentRepot', n: lastRepot.daysAgo });
  else if (plant.createdDaysAgo <= 21) out.push({ cause: 'shock', weight: 1.5, reason: 'newPlant' });

  const fertilize = plant.care.find((c) => c.type === 'fertilize');
  if (fertilize && careTaskInSeason(fertilize, plant, today) && daysUntilNext(fertilize.intervalDays, fertilize.lastDoneDaysAgo) <= 0) {
    out.push({ cause: 'nutrients', weight: 1.5, reason: 'fertilizeDue' });
  } else if (plant.createdDaysAgo > 120 && !plant.journalNotes.some((e) => e.type === 'fertilized')) {
    out.push({ cause: 'nutrients', weight: 1, reason: 'neverFertilized' });
  }

  if (!plant.indoor && context.forecast.length > 0) {
    const coldest = Math.min(...context.forecast.map((d) => d.minC));
    const limit = (species?.temperature.survivalMinC ?? 5) + 3;
    if (coldest <= limit) out.push({ cause: 'cold', weight: 3, reason: 'coldForecast', n: Math.round(coldest) });
  }

  // Short winter days slow most plants down; south of the equator the months flip.
  const month = ((today.getMonth() + (context.latitude != null && context.latitude < 0 ? 6 : 0)) % 12) + 1;
  if ([11, 12, 1, 2].includes(month) && plant.seasonProfile !== 'winterActive') out.push({ cause: 'resting', weight: 3, reason: 'winter' });

  return out;
}

export type Diagnosis = { cause: CauseKey; score: number; reasons: { key: string; n?: number }[] };

/** Ranks the possible causes of a symptom from what is known about the plant
 * and the user's answers. Only causes that can produce the symptom compete. */
export function diagnose(symptom: SymptomKey, answers: Answers, evidence: Evidence[]): Diagnosis[] {
  const base = BASE[symptom];
  const answerEvidence = (Object.keys(answers) as QuestionKey[]).flatMap((q) => ANSWER_EVIDENCE[q][answers[q] ?? ''] ?? []);
  const ranked = (Object.keys(base) as CauseKey[]).map((cause) => {
    const relevant = [...answerEvidence, ...evidence].filter((e) => e.cause === cause);
    const reasons: Diagnosis['reasons'] = [];
    for (const e of relevant) {
      if (e.weight > 0 && e.reason && !reasons.some((r) => r.key === e.reason)) reasons.push({ key: e.reason, n: e.n });
    }
    return { cause, score: (base[cause] ?? 0) + relevant.reduce((sum, e) => sum + e.weight, 0), reasons };
  });
  ranked.sort((a, b) => b.score - a.score);
  const top = ranked[0]?.score ?? 0;
  return ranked.filter((d, i) => i === 0 || (d.score >= 2 && d.score >= top * 0.4)).slice(0, 3);
}
