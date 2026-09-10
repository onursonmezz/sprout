import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Plant } from '@/data/plants';

export function PlantAvatar({ plant, size, emojiSize }: { plant: Plant; size: number; emojiSize?: number }) {
  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: plant.avatarColor },
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
