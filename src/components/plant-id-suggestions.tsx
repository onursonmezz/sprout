import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Translations } from '@/constants/translations';
import { SpeciesRecord, speciesDisplayName } from '@/data/species-guide';
import { SPECIES_PHOTOS } from '@/data/species-photos';
import { useTheme } from '@/hooks/use-theme';
import { identifyPlant, PLANT_ID_CONFIDENT, plantIdAvailable, PlantIdGuess } from '@/utils/plant-id';

type State = { status: 'idle' } | { status: 'working' } | { status: 'failed'; detail?: string } | { status: 'done'; guesses: PlantIdGuess[] };

/** Under the photo on the add-plant screen: the model's three best guesses for
 * the photo, each with a reference picture. Tapping one fills in the species. */
export function PlantIdSuggestions({
  photoUri,
  selectedId,
  onPick,
  colors,
  t,
  lang,
}: {
  photoUri: string | null;
  selectedId: string | null;
  onPick: (species: SpeciesRecord) => void;
  colors: ReturnType<typeof useTheme>;
  t: Translations;
  lang: 'en' | 'tr';
}) {
  const [state, setState] = useState<State>({ status: 'idle' });

  useEffect(() => {
    if (!photoUri || !plantIdAvailable) {
      setState({ status: 'idle' });
      return;
    }
    let current = true;
    setState({ status: 'working' });
    identifyPlant(photoUri)
      .then((guesses) => current && setState(guesses.length ? { status: 'done', guesses } : { status: 'failed' }))
      .catch((e: unknown) => current && setState({ status: 'failed', detail: e instanceof Error ? e.message : String(e) }));
    return () => {
      current = false;
    };
  }, [photoUri]);

  if (state.status === 'idle') return null;

  if (state.status === 'working') {
    return (
      <View style={[styles.box, styles.row, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <ActivityIndicator color={colors.tint} />
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{t.addPlant.idWorking}</Text>
      </View>
    );
  }

  if (state.status === 'failed') {
    return (
      <View style={[styles.box, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <Text style={[styles.hint, { color: colors.textSecondary }]}>{t.addPlant.idFailed}</Text>
        {state.detail && (
          <Text selectable style={[styles.detail, { color: colors.textSecondary }]}>
            {state.detail}
          </Text>
        )}
      </View>
    );
  }

  const confident = state.guesses[0].probability >= PLANT_ID_CONFIDENT;
  return (
    <View style={[styles.box, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
      <View style={styles.row}>
        <Ionicons name={confident ? 'leaf-outline' : 'help-circle-outline'} size={16} color={colors.tint} />
        <Text style={[styles.title, { color: colors.text }]}>{confident ? t.addPlant.idLikely : t.addPlant.idNotSure}</Text>
      </View>
      {state.guesses.map(({ species, probability }) => {
        const selected = species.id === selectedId;
        const photo = SPECIES_PHOTOS[species.id];
        return (
          <Pressable
            key={species.id}
            onPress={() => onPick(species)}
            style={[
              styles.option,
              { backgroundColor: selected ? colors.tintMuted : 'transparent', borderColor: selected ? colors.tint : colors.glassBorder },
            ]}>
            {photo ? (
              <Image source={photo} style={styles.thumb} contentFit="cover" />
            ) : (
              <View style={[styles.thumb, { backgroundColor: colors.tintMuted }]} />
            )}
            <View style={styles.optionText}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {speciesDisplayName(species, lang)}
              </Text>
              <Text style={[styles.latin, { color: colors.textSecondary }]} numberOfLines={1}>
                {species.scientificName}
              </Text>
            </View>
            <Text style={[styles.percent, { color: colors.textSecondary }]}>
              {lang === 'tr' ? `%${Math.round(probability * 100)}` : `${Math.round(probability * 100)}%`}
            </Text>
            {selected && <Text style={{ color: colors.tint, fontWeight: '700' }}>✓</Text>}
          </Pressable>
        );
      })}
      <Text style={[styles.hint, { color: colors.textSecondary }]}>{t.addPlant.idHint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: 8, borderRadius: 14, borderWidth: 1, padding: 10, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 13, fontWeight: '700', flex: 1 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, padding: 6 },
  thumb: { width: 48, height: 48, borderRadius: 10 },
  optionText: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700' },
  latin: { fontSize: 12, fontStyle: 'italic' },
  percent: { fontSize: 12, fontWeight: '600' },
  hint: { fontSize: 12, flexShrink: 1 },
  detail: { fontSize: 11, opacity: 0.7 },
});
