import { Ionicons } from '@expo/vector-icons';

import { CareTaskType } from './plants';

export type HowToKey = 'repot' | 'fertilize' | 'prune' | 'cutting' | 'cleanLeaves' | 'soilMix' | 'bottomWater';

export const howToKeys: HowToKey[] = ['repot', 'cutting', 'prune', 'fertilize', 'soilMix', 'cleanLeaves', 'bottomWater'];

export const howToIcons: Record<HowToKey, keyof typeof Ionicons.glyphMap> = {
  repot: 'flower-outline',
  fertilize: 'flask-outline',
  prune: 'cut-outline',
  cutting: 'git-branch-outline',
  cleanLeaves: 'sparkles-outline',
  soilMix: 'layers-outline',
  bottomWater: 'water-outline',
};

/** The walkthrough that explains a care task, for the tasks that have one. */
export const howToForCareTask: Partial<Record<CareTaskType, HowToKey>> = {
  repot: 'repot',
  fertilize: 'fertilize',
  prune: 'prune',
};
