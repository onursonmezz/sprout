import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Plant } from '@/data/plants';

export function PlantAvatar({
  plant,
  size,
  emojiSize,
  radius,
}: {
  plant: Plant;
  size: number;
  emojiSize?: number;
  /** Corner radius; defaults to a full circle. */
  radius?: number;
}) {
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: radius ?? size / 2, backgroundColor: plant.avatarColor },
      ]}>
      {plant.photoUri ? (
        <Image source={{ uri: plant.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Text style={{ fontSize: emojiSize ?? Math.round(size * 0.42) }}>{plant.emoji}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});

/** The plant's photo (or its emoji on its colour) stretched over a
 * rectangular area, for cards where the picture spans the full width. */
export function PlantPhoto({ plant, height, emojiSize = 40 }: { plant: Plant; height: number; emojiSize?: number }) {
  return (
    <View style={[styles.wrap, { height, backgroundColor: plant.avatarColor }]}>
      {plant.photoUri ? (
        <Image source={{ uri: plant.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Text style={{ fontSize: emojiSize }}>{plant.emoji}</Text>
      )}
    </View>
  );
}
