import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/context/language-context';
import { usePlants } from '@/context/plants-context';
import { findSpeciesLoose } from '@/data/species-guide';
import { useTheme } from '@/hooks/use-theme';
import { hapticSuccess } from '@/utils/haptics';
import { SoilFeedback } from '@/utils/watering-algorithm';

const AUTO_DISMISS_MS = 15000;

const OPTIONS: { key: SoilFeedback; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'dry', icon: 'sunny-outline' },
  { key: 'ok', icon: 'checkmark-circle-outline' },
  { key: 'wet', icon: 'water-outline' },
];

/** Asks how the soil was right after a watering. The answer nudges that
 * plant's interval; ignoring the question changes nothing. Floats above
 * whichever screen is open. */
export function WateringFeedbackPrompt() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { t, lang } = useLanguage();
  const { pendingFeedback, getPlant, answerWateringFeedback, dismissWateringFeedback } = usePlants();

  useEffect(() => {
    if (!pendingFeedback) return;
    const timer = setTimeout(dismissWateringFeedback, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
    // dismissWateringFeedback is a fresh closure every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFeedback]);

  const plant = pendingFeedback ? getPlant(pendingFeedback.plantId) : undefined;
  if (!pendingFeedback || !plant) return null;

  // What "dry enough" means differs per species, so remind the user of it.
  const species = lang === 'tr' ? (findSpeciesLoose(plant.species) ?? findSpeciesLoose(plant.latinName)) : undefined;

  return (
    <View
      style={[
        styles.card,
        {
          bottom: insets.bottom + 92,
          backgroundColor: colors.card,
          borderColor: colors.border,
          boxShadow: `0px 14px 30px ${colors.shadow}`,
        },
      ]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t.wateringFeedback.title(plant.name)}</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {species ? t.wateringFeedback.idealHint(species.water.dryLevelTr) : t.wateringFeedback.subtitle}
          </Text>
        </View>
        <Pressable onPress={dismissWateringFeedback} hitSlop={10} accessibilityLabel={t.wateringFeedback.dismiss}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
      <View style={styles.options}>
        {OPTIONS.map(({ key, icon }) => (
          <Pressable
            key={key}
            onPress={() => {
              answerWateringFeedback(key);
              hapticSuccess();
            }}
            style={[styles.option, { backgroundColor: colors.backgroundSelected }]}>
            <Ionicons name={icon} size={20} color={key === 'dry' ? colors.late : colors.tintBright} />
            <Text style={[styles.optionText, { color: colors.text }]}>{t.wateringFeedback.options[key]}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'absolute', left: 14, right: 14, borderRadius: 20, borderWidth: 1, padding: 14, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 12, marginTop: 2 },
  options: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, alignItems: 'center', gap: 5, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4 },
  optionText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
