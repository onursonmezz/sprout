import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Plant } from '@/data/plants';

/** Leaf drawn on the plant's colour while it has no photo. The avatar colours
 * are all pale, so one muted green reads on every one of them. */
export const PLACEHOLDER_LEAF = '#5E8C68';

export function PlantAvatar({
  plant,
  size,
  iconSize,
  radius,
}: {
  plant: Plant;
  size: number;
  iconSize?: number;
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
        <Ionicons name="leaf" size={iconSize ?? Math.round(size * 0.46)} color={PLACEHOLDER_LEAF} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});

/** The plant's photo (or a leaf on its colour) stretched over a
 * rectangular area, for cards where the picture spans the full width. */
export function PlantPhoto({ plant, height, iconSize = 40 }: { plant: Plant; height: number; iconSize?: number }) {
  return (
    <View style={[styles.wrap, { height, backgroundColor: plant.avatarColor }]}>
      {plant.photoUri ? (
        <Image source={{ uri: plant.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Ionicons name="leaf" size={iconSize} color={PLACEHOLDER_LEAF} />
      )}
    </View>
  );
}
