import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ReactNode, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard, GlowBackground } from '@/components/glass';
import { PlantAvatar } from '@/components/plant-avatar';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { usePlants } from '@/context/plants-context';
import { LIGHT_KEYS, LightKey, speciesDisplayName } from '@/data/species-guide';
import { useTheme } from '@/hooks/use-theme';
import { speciesOf } from '@/utils/care';
import { lightKeyForLux } from '@/utils/light-meter';
import { FinderAttention, FinderPets, FinderPlace, findPlants, luxFit } from '@/utils/plant-finder';

const PLACES: FinderPlace[] = ['indoor', 'outdoor'];
const PETS: FinderPets[] = ['none', 'cat', 'dog', 'both'];
const ATTENTION: FinderAttention[] = ['often', 'sometimes', 'rarely'];

/** How many of the best matches are listed. */
const SHOWN = 30;

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? colors.tint : colors.glass, borderColor: selected ? colors.tint : colors.glassBorder }]}>
      <Text style={[styles.chipText, { color: selected ? colors.onTint : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function Question({ label, children }: { label: string; children: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

/**
 * The plant finder: describe the spot and yourself, get the species that
 * suit. Opened from the light meter with a reading, it becomes the corner
 * advisor: the measured light replaces the light question, and the user's own
 * plants are judged against this corner too.
 */
export default function FinderScreen() {
  const params = useLocalSearchParams<{ lux?: string }>();
  const router = useRouter();
  const colors = useTheme();
  const { t, lang } = useLanguage();
  const { plants } = usePlants();
  const lux = params.lux != null && Number.isFinite(Number(params.lux)) ? Number(params.lux) : null;

  const [place, setPlace] = useState<FinderPlace>('indoor');
  const [light, setLight] = useState<LightKey>('part_sun');
  const [pets, setPets] = useState<FinderPets>('none');
  const [attention, setAttention] = useState<FinderAttention>('sometimes');
  const [beginner, setBeginner] = useState(false);

  const results = useMemo(() => findPlants({ place, light, lux, pets, attention, beginner }), [place, light, lux, pets, attention, beginner]);

  // The user's own plants against this corner's measured light.
  const mine = useMemo(() => {
    if (lux == null) return [];
    return plants.flatMap((plant) => {
      const species = speciesOf(plant);
      return species ? [{ plant, fit: luxFit(species, lux) }] : [];
    });
  }, [plants, lux]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <GlowBackground />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.round, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{lux != null ? t.finder.cornerTitle : t.finder.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {lux != null ? t.finder.cornerSubtitle(Math.round(lux), t.addPlant.lightLevels[lightKeyForLux(lux)].label) : t.finder.subtitle}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {mine.length > 0 && (
          <View style={{ gap: Spacing.two }}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.finder.yourPlants}</Text>
            {mine.map(({ plant, fit }) => (
              <GlassCard key={plant.id} style={styles.mineRow}>
                <PlantAvatar plant={plant} size={40} radius={10} />
                <Text style={[styles.mineName, { color: colors.text }]} numberOfLines={1}>
                  {plant.name}
                </Text>
                <Text style={[styles.mineFit, { color: fit === 'ok' ? colors.tintBright : colors.late }]}>{t.finder.fits[fit]}</Text>
              </GlassCard>
            ))}
          </View>
        )}

        <GlassCard style={styles.filters}>
          {lux == null && (
            <>
              <Question label={t.finder.placeQuestion}>
                {PLACES.map((key) => (
                  <Chip key={key} label={t.finder.places[key]} selected={place === key} onPress={() => setPlace(key)} />
                ))}
              </Question>
              <Question label={t.finder.lightQuestion}>
                {LIGHT_KEYS.map((key) => (
                  <Chip key={key} label={t.addPlant.lightLevels[key].label} selected={light === key} onPress={() => setLight(key)} />
                ))}
              </Question>
            </>
          )}
          <Question label={t.finder.petsQuestion}>
            {PETS.map((key) => (
              <Chip key={key} label={t.finder.pets[key]} selected={pets === key} onPress={() => setPets(key)} />
            ))}
          </Question>
          <Question label={t.finder.attentionQuestion}>
            {ATTENTION.map((key) => (
              <Chip key={key} label={t.finder.attention[key]} selected={attention === key} onPress={() => setAttention(key)} />
            ))}
          </Question>
          <Question label={t.finder.beginnerQuestion}>
            <Chip label={t.finder.beginnerYes} selected={beginner} onPress={() => setBeginner(true)} />
            <Chip label={t.finder.beginnerNo} selected={!beginner} onPress={() => setBeginner(false)} />
          </Question>
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.finder.resultCount(results.length)}</Text>
        {results.length === 0 && <Text style={[styles.note, { color: colors.textSecondary }]}>{t.finder.empty}</Text>}
        {results.slice(0, SHOWN).map((species) => {
          const safe = !species.toxicity.toxicToCats && !species.toxicity.toxicToDogs;
          return (
            <Pressable
              key={species.id}
              onPress={() =>
                router.push({
                  pathname: '/add-plant',
                  params: { prefillSpecies: speciesDisplayName(species, lang), prefillLatin: species.scientificName },
                })
              }>
              <GlassCard style={styles.result}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.resultName, { color: colors.text }]}>{speciesDisplayName(species, lang)}</Text>
                  <Text style={[styles.resultLatin, { color: colors.textSecondary }]}>{species.scientificName}</Text>
                  <Text style={[styles.resultMeta, { color: colors.textSecondary }]}>
                    {t.finder.meta(t.addPlant.lightLevels[species.light.preferred].label, species.water.baseIntervalDays, species.difficulty)}
                  </Text>
                  {safe && pets !== 'none' && <Text style={[styles.resultMeta, { color: colors.tintBright }]}>{t.finder.petSafe}</Text>}
                </View>
                <Ionicons name="add-circle-outline" size={22} color={colors.tintBright} />
              </GlassCard>
            </Pressable>
          );
        })}
        {results.length > SHOWN && <Text style={[styles.note, { color: colors.textSecondary }]}>{t.finder.showingBest(SHOWN)}</Text>}
        {results.length > 0 && <Text style={[styles.note, { color: colors.textSecondary }]}>{pets !== 'none' ? t.finder.petNote : t.finder.note}</Text>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  round: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 1 },
  scroll: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  filters: { padding: Spacing.three, gap: 14 },
  label: { fontSize: 12, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '600' },
  mineRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 },
  mineName: { flex: 1, fontSize: 14, fontWeight: '700' },
  mineFit: { fontSize: 12, fontWeight: '700' },
  result: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.three },
  resultName: { fontSize: 15, fontWeight: '700' },
  resultLatin: { fontSize: 12, fontStyle: 'italic' },
  resultMeta: { fontSize: 12 },
  note: { fontSize: 12, lineHeight: 17 },
});
