import { ImageSourcePropType } from 'react-native';

/**
 * Real photos, resized to a 1200px-long-side max and re-compressed to JPEG
 * quality 78 on the way in (the Envato originals ran 4-21MB each — fine for
 * print, but 15 of them would have bloated the app bundle and every EAS
 * Update download for a size no phone screen benefits from).
 */
export const guideImages: Partial<Record<string, ImageSourcePropType>> = {
  'featured-watering': require('../../assets/images/guide/featured-watering.jpg'),
  'guide-watering': require('../../assets/images/guide/guide-watering.jpg'),
  'guide-pot-soil': require('../../assets/images/guide/guide-pot-soil.jpg'),
  'guide-light': require('../../assets/images/guide/guide-light.jpg'),
  'guide-seasonal': require('../../assets/images/guide/guide-seasonal.jpg'),
  'issue-yellow-leaves': require('../../assets/images/guide/issue-yellow-leaves.jpg'),
  'issue-brown-tips': require('../../assets/images/guide/issue-brown-tips.jpg'),
  'issue-drooping-wilting': require('../../assets/images/guide/issue-drooping-wilting.jpg'),
  'issue-leaf-drop': require('../../assets/images/guide/issue-leaf-drop.jpg'),
  'issue-black-spots': require('../../assets/images/guide/issue-black-spots.jpg'),
  'issue-white-powder': require('../../assets/images/guide/issue-white-powder.jpg'),
  'issue-slow-growth': require('../../assets/images/guide/issue-slow-growth.jpg'),
  'issue-curling-leaves': require('../../assets/images/guide/issue-curling-leaves.jpg'),
  'issue-leggy-growth': require('../../assets/images/guide/issue-leggy-growth.jpg'),
  'issue-mushy-stem': require('../../assets/images/guide/issue-mushy-stem.jpg'),
};
