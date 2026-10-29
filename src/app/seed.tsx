import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ReactNode, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateField } from '@/components/date-field';
import { GlassCard, GlowBackground, GradientButton } from '@/components/glass';
import { PhotoPicker } from '@/components/photo-picker';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { SeedContainer, usePropagation } from '@/context/propagation-context';
import { GENERAL_SOIL_TEMP_C, GERMINATION } from '@/data/germination';
import { findSpeciesMatches, SpeciesRecord, speciesDisplayName } from '@/data/species-guide';
import { useGoBack } from '@/hooks/use-go-back';
import { useTheme } from '@/hooks/use-theme';
import { hapticSuccess, hapticTap } from '@/utils/haptics';

const CONTAINERS: SeedContainer[] = ['tray', 'pot', 'paper', 'peat'];

/** Starting a seed sowing: what, how many, in what and when. It is then
 * followed like a cutting, on the propagation page. */
export default function SeedScreen() {
  const colors = useTheme();
  const router = useRouter();
  const goBack = useGoBack();
  const { t, lang } = useLanguage();
  const { startProject } = usePropagation();

  const [query, setQuery] = useState('');
  const [species, setSpecies] = useState<SpeciesRecord | null>(null);
  const [name, setName] = useState('');
  const [count, setCount] = useState(6);
  const [container, setContainer] = useState<SeedContainer>('tray');
  const [sownOn, setSownOn] = useState(new Date());
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const matches = species ? [] : findSpeciesMatches(query, 5);
  const germination = species ? GERMINATION[species.id] : undefined;
  const speciesName = species ? speciesDisplayName(species, lang) : query.trim();

  const pick = (record: SpeciesRecord) => {
    setSpecies(record);
    setQuery(speciesDisplayName(record, lang));
    hapticTap();
  };

  const start = () => {
    const id = startProject({
      parentPlantId: null,
      name: name.trim() || (speciesName ? t.seed.sowingOf(speciesName) : t.seed.newSowing),
      species: species ? speciesDisplayName(species, lang) : speciesName || '—',
      latinName: species?.scientificName ?? '',
      method: 'seed',
      startedAt: sownOn.toISOString(),
      photoUri,
      seedCount: count,
      container,
    });
    hapticSuccess();
    router.replace(`/propagation/${id}`);
  };

  const inputStyle = [styles.input, { color: colors.text, backgroundColor: colors.backgroundElement, borderColor: colors.border }];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <GlowBackground />
      <View style={styles.header}>
        <Pressable onPress={goBack} accessibilityLabel={t.prop.back}>
          <GlassCard style={styles.roundButton}>
            <Ionicons name="close" size={20} color={colors.text} />
          </GlassCard>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{t.seed.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Field label={t.seed.what}>
          <View style={[styles.search, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <Ionicons name="search" size={16} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                setSpecies(null);
              }}
              placeholder={t.seed.searchPlaceholder}
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>
          {matches.map((record) => (
            <Pressable key={record.id} onPress={() => pick(record)} style={[styles.match, { borderColor: colors.border }]}>
              <Text style={[styles.matchName, { color: colors.text }]}>{speciesDisplayName(record, lang)}</Text>
              <Text style={[styles.matchLatin, { color: colors.textSecondary }]}>{record.scientificName}</Text>
            </Pressable>
          ))}
        </Field>

        {(species || query.trim().length > 0) && matches.length === 0 && (
          <GlassCard style={styles.info}>
            <Ionicons name="information-circle-outline" size={18} color={colors.tintBright} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {germination
                ? `${t.seed.speciesInfo(germination.days[0], germination.days[1], germination.soilTempC[0], germination.soilTempC[1])} ${germination.surface ? t.seed.surface : t.seed.cover}`
                : t.seed.noInfo(GENERAL_SOIL_TEMP_C[0], GENERAL_SOIL_TEMP_C[1])}
            </Text>
          </GlassCard>
        )}

        <Field label={t.seed.name}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={speciesName ? t.seed.sowingOf(speciesName) : t.seed.namePlaceholder}
            placeholderTextColor={colors.textSecondary}
            style={inputStyle}
          />
        </Field>

        <Field label={t.seed.count}>
          <View style={styles.counter}>
            <Pressable onPress={() => setCount((n) => Math.max(1, n - 1))} style={[styles.step, { backgroundColor: colors.backgroundSelected }]}>
              <Ionicons name="remove" size={18} color={colors.text} />
            </Pressable>
            <Text style={[styles.countText, { color: colors.text }]}>{t.seed.countValue(count)}</Text>
            <Pressable onPress={() => setCount((n) => Math.min(500, n + 1))} style={[styles.step, { backgroundColor: colors.backgroundSelected }]}>
              <Ionicons name="add" size={18} color={colors.text} />
            </Pressable>
          </View>
        </Field>

        <Field label={t.seed.where}>
          <View style={styles.chips}>
            {CONTAINERS.map((key) => {
              const selected = container === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setContainer(key)}
                  style={[styles.chip, { backgroundColor: selected ? colors.tint : colors.backgroundSelected, borderColor: selected ? colors.tint : colors.border }]}>
                  <Text style={[styles.chipText, { color: selected ? colors.onTint : colors.text }]}>{t.seed.containers[key]}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label={t.seed.date}>
          <DateField
            value={sownOn}
            mode="date"
            maximumDate={new Date()}
            onChange={setSownOn}
            displayText={sownOn.toLocaleDateString(t.today.dateLocale, { day: 'numeric', month: 'long', year: 'numeric' })}
            textColor={colors.text}
            backgroundColor={colors.backgroundElement}
          />
        </Field>

        <Field label={t.seed.photo}>
          <PhotoPicker uri={photoUri} onChange={setPhotoUri} colors={colors} t={t} height={130} />
        </Field>

        <GradientButton label={t.seed.start} onPress={start} size="large" />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  roundButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700' },
  body: { padding: Spacing.three, gap: Spacing.three, paddingBottom: Spacing.five },
  label: { fontSize: 12, fontWeight: '700' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12 },
  searchInput: { flex: 1, height: 46, fontSize: 14 },
  match: { borderBottomWidth: 1, paddingVertical: 10, paddingHorizontal: 4 },
  matchName: { fontSize: 14, fontWeight: '600' },
  matchLatin: { fontSize: 12, fontStyle: 'italic', marginTop: 1 },
  info: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  input: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 46, fontSize: 14 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  step: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  countText: { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontSize: 13, fontWeight: '600' },
});
