import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { guideImages } from '@/data/guide-images';

/** The handful of layout properties every call site actually needs — kept
 * narrow (rather than ViewStyle/ImageStyle) so the same style object can be
 * handed to either the placeholder View or the real Image without their
 * slightly different style types (e.g. `overflow`) conflicting. */
type GuideImageStyle = {
  width?: number | `${number}%`;
  height?: number | `${number}%`;
  aspectRatio?: number;
  borderRadius?: number;
};

/** Renders a real photo once one exists at the given key (see guide-images.ts);
 * until then, falls back to a colored block + emoji, matching the app's
 * existing plant-avatar visual language. */
export function GuideImage({
  imageKey,
  emoji,
  backgroundColor,
  style,
  emojiSize = 32,
}: {
  imageKey: string;
  emoji: string;
  backgroundColor: string;
  style?: GuideImageStyle;
  emojiSize?: number;
}) {
  const source = guideImages[imageKey];
  if (source) {
    return <Image source={source} style={[styles.fill, style]} contentFit="cover" />;
  }
  return (
    <View style={[styles.fill, styles.placeholder, { backgroundColor }, style]}>
      <Text style={{ fontSize: emojiSize }}>{emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // No default height: it would fight a caller's aspectRatio-based sizing
  // (e.g. the guide grid's square cards) since RN can't resolve a percentage
  // height against an auto-height parent — width alone lets aspectRatio (or
  // an explicit height) in the caller's own style determine the rest.
  fill: { width: '100%' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
});
