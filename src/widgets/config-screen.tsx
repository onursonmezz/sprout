import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget';

import { PLACEHOLDER_LEAF } from '@/components/plant-avatar';
import { Colors } from '@/constants/theme';
import { translations } from '@/constants/translations';
import { SPECIES_PHOTOS } from '@/data/species-photos';
import { speciesOf } from '@/utils/care';
import { loadWidgetData, setWidgetPlantId, WidgetData } from '@/widgets/data';
import { renderWidgetFor } from '@/widgets/render';

const colors = Colors.dark;

/** Opens when a "single plant" widget is placed (or reconfigured): the user
 * picks which plant it shows. Runs on its own, outside the app's screens. */
export function WidgetConfigurationScreen({ widgetInfo, renderWidget, setResult }: WidgetConfigurationScreenProps) {
  const [data, setData] = useState<WidgetData | null>(null);

  useEffect(() => {
    loadWidgetData().then(setData);
  }, []);

  if (!data) return <View style={styles.screen} />;
  const t = translations[data.lang];

  const choose = async (plantId: string) => {
    await setWidgetPlantId(widgetInfo.widgetId, plantId);
    renderWidget(await renderWidgetFor(widgetInfo, data));
    setResult('ok');
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{t.widget.pickTitle}</Text>
      {data.plants.length === 0 ? (
        <Text style={styles.empty}>{t.widget.pickEmpty}</Text>
      ) : (
        <ScrollView contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
          {data.plants.map((plant) => {
            const photo = SPECIES_PHOTOS[speciesOf(plant)?.id ?? ''];
            return (
              <Pressable key={plant.id} onPress={() => choose(plant.id)} style={styles.row}>
                <View style={styles.thumb}>
                  {photo ? (
                    <Image source={photo} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <Ionicons name="leaf" size={20} color={PLACEHOLDER_LEAF} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {plant.name}
                  </Text>
                  <Text style={styles.species} numberOfLines={1}>
                    {plant.species}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      <Pressable onPress={() => setResult('cancel')} style={styles.cancel}>
        <Text style={styles.cancelText}>{t.widget.cancel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 },
  empty: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.tintMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 15, fontWeight: '600', color: colors.text },
  species: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  cancel: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 24, marginTop: 8 },
  cancelText: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },
});
