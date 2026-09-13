import { ImageSourcePropType } from 'react-native';

/**
 * Filled in once real photos land in assets/images/guide/ (filenames were
 * given to the user directly — featured-watering.jpg, guide-watering.jpg,
 * guide-pot-soil.jpg, guide-light.jpg, guide-seasonal.jpg, and one
 * issue-<slug>.jpg per troubleshooting symptom, see issueImageKeys in
 * guide-content.ts). Metro resolves require() at bundle time, so a call
 * pointing at a file that doesn't exist yet would break the whole app —
 * entries only get uncommented here once their file is actually in place.
 * Until then, GuideImage (components/guide-image.tsx) falls back to a
 * colored block + emoji, the same visual language as plant avatars.
 */
export const guideImages: Partial<Record<string, ImageSourcePropType>> = {
  // 'featured-watering': require('../../assets/images/guide/featured-watering.jpg'),
  // 'guide-watering': require('../../assets/images/guide/guide-watering.jpg'),
  // 'guide-pot-soil': require('../../assets/images/guide/guide-pot-soil.jpg'),
  // 'guide-light': require('../../assets/images/guide/guide-light.jpg'),
  // 'guide-seasonal': require('../../assets/images/guide/guide-seasonal.jpg'),
  // 'issue-yellow-leaves': require('../../assets/images/guide/issue-yellow-leaves.jpg'),
  // 'issue-brown-tips': require('../../assets/images/guide/issue-brown-tips.jpg'),
  // 'issue-drooping-wilting': require('../../assets/images/guide/issue-drooping-wilting.jpg'),
  // 'issue-leaf-drop': require('../../assets/images/guide/issue-leaf-drop.jpg'),
  // 'issue-black-spots': require('../../assets/images/guide/issue-black-spots.jpg'),
  // 'issue-white-powder': require('../../assets/images/guide/issue-white-powder.jpg'),
  // 'issue-slow-growth': require('../../assets/images/guide/issue-slow-growth.jpg'),
  // 'issue-curling-leaves': require('../../assets/images/guide/issue-curling-leaves.jpg'),
  // 'issue-leggy-growth': require('../../assets/images/guide/issue-leggy-growth.jpg'),
  // 'issue-mushy-stem': require('../../assets/images/guide/issue-mushy-stem.jpg'),
};
