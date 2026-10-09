import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/context/language-context';
import { usePlants } from '@/context/plants-context';
import { findSpeciesLoose } from '@/data/species-guide';
import { useTheme } from '@/hooks/use-theme';
import { hapticSuccess, hapticTap } from '@/utils/haptics';
import { SoilFeedback } from '@/utils/watering-algorithm';

/** How long each form stays up before it goes away by itself. */
const QUESTION_MS = 15000;
const UNDO_ONLY_MS = 6000;

const OPTIONS: { key: SoilFeedback; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'dry', icon: 'sunny-outline' },
  { key: 'ok', icon: 'checkmark-circle-outline' },
  { key: 'wet', icon: 'water-outline' },
];

/**
 * Shown after every watering, floating above whichever screen is open.
 * Always offers "undo" (a watering is one tap, so a mis-tap must be one tap
 * to take back). When the answer can teach something, it also asks how the
 * soil was; ignoring the question changes nothing.
 */
export function WateringFeedbackPrompt() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { t, lang } = useLanguage();
  const { pendingFeedback, getPlant, answerWateringFeedback, dismissWateringFeedback, undoWatering } = usePlants();

  useEffect(() => {
    if (!pendingFeedback) return;
    const timer = setTimeout(dismissWateringFeedback, pendingFeedback.askSoil ? QUESTION_MS : UNDO_ONLY_MS);
    return () => clearTimeout(timer);
    // dismissWateringFeedback is a fresh closure every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingFeedback]);

  const plant = pendingFeedback ? getPlant(pendingFeedback.plantId) : undefined;
  if (!pendingFeedback || !plant) return null;

  const undo = (
    <Pressable
      onPress={() => {
        undoWatering();
        hapticTap();
      }}
      hitSlop={8}
      style={[styles.undo, { borderColor: colors.border }]}>
      <Ionicons name="arrow-undo-outline" size={15} color={colors.text} />
      <Text style={[styles.undoText, { color: colors.text }]}>{t.wateringFeedback.undo}</Text>
    </Pressable>
  );

  const cardStyle = [
    styles.card,
    {
      bottom: insets.bottom + 92,
      backgroundColor: colors.card,
      borderColor: colors.border,
      boxShadow: `0px 14px 30px ${colors.shadow}`,
    },
  ];

  if (!pendingFeedback.askSoil) {
    return (
      <View style={[cardStyle, styles.compact]}>
        <Ionicons name="checkmark-circle" size={20} color={colors.tintBright} />
        <Text style={[styles.title, { color: colors.text, flex: 1 }]} numberOfLines={1}>
          {t.wateringFeedback.watered(plant.name)}
        </Text>
        {undo}
      </View>
    );
  }

  // What "dry enough" means differs per species, so remind the user of it.
  const species = lang === 'tr' ? (findSpeciesLoose(plant.species) ?? findSpeciesLoose(plant.latinName)) : undefined;

  return (
    <View style={cardStyle}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t.wateringFeedback.title(plant.name)}</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {species ? t.wateringFeedback.idealHint(species.water.dryLevelTr) : t.wateringFeedback.subtitle}
          </Text>
        </View>
        {undo}
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
  compact: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 12, marginTop: 2 },
  undo: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  undoText: { fontSize: 12, fontWeight: '700' },
  options: { flexDirection: 'row', gap: 8 },
  option: { flex: 1, alignItems: 'center', gap: 5, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4 },
  optionText: { fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
