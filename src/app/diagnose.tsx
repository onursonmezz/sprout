import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard, GlowBackground } from '@/components/glass';
import { GuideImage } from '@/components/guide-image';
import { PlantAvatar } from '@/components/plant-avatar';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { usePlants } from '@/context/plants-context';
import { useSettings } from '@/context/settings-context';
import { issueImageKeys } from '@/data/guide-content';
import { SymptomKey, symptomKeys } from '@/data/troubleshooting';
import { useTheme } from '@/hooks/use-theme';
import { Answers, diagnose, plantEvidence, QUESTION_OPTIONS, QUESTIONS } from '@/utils/diagnosis';
import { hapticTap } from '@/utils/haptics';

/**
 * Diagnosis for one plant: pick what you see, answer a couple of questions,
 * and get the likeliest causes — ranked using what the app already knows about
 * this plant (its watering, pot, light, heating, recent repotting), which a
 * general article cannot do.
 */
export default function DiagnoseScreen() {
  const params = useLocalSearchParams<{ plantId: string; symptom?: string }>();
  const router = useRouter();
  const colors = useTheme();
  const { t } = useLanguage();
  const { getPlant } = usePlants();
  const { heatingOn, forecast, latitude } = useSettings();
  const plant = getPlant(params.plantId);

  const [symptom, setSymptom] = useState<SymptomKey | null>(
    symptomKeys.includes(params.symptom as SymptomKey) ? (params.symptom as SymptomKey) : null
  );
  const [answers, setAnswers] = useState<Answers>({});

  const evidence = useMemo(() => (plant ? plantEvidence(plant, { heatingOn, forecast, latitude: latitude ?? null }) : []), [plant, heatingOn, forecast, latitude]);

  if (!plant) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.text }}>{t.plantDetail.notFound}</Text>
      </View>
    );
  }

  const questions = symptom ? QUESTIONS[symptom] : [];
  const question = questions.find((q) => answers[q] == null);
  const step = questions.filter((q) => answers[q] != null).length;
  const results = symptom && !question ? diagnose(symptom, answers, evidence) : [];

  /** One step back: the last answer, then the symptom, then out of the screen. */
  const back = () => {
    const answered = questions.filter((q) => answers[q] != null);
    if (answered.length > 0) {
      const last = answered[answered.length - 1];
      setAnswers((prev) => ({ ...prev, [last]: undefined }));
    } else if (symptom && !params.symptom) {
      setSymptom(null);
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <GlowBackground />
      <View style={styles.header}>
        <Pressable onPress={back} hitSlop={10} style={[styles.round, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <PlantAvatar plant={plant} size={34} radius={10} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {t.diag.title(plant.name)}
          </Text>
          {symptom && (
            <Text style={[styles.headerSub, { color: colors.textSecondary }]} numberOfLines={1}>
              {t.troubleshooting.symptoms[symptom].label}
            </Text>
          )}
        </View>
        <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.round, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!symptom && (
          <>
            <Text style={[styles.question, { color: colors.text }]}>{t.diag.pickSymptom}</Text>
            <View style={styles.grid}>
              {symptomKeys.map((key) => (
                <Pressable
                  key={key}
                  style={styles.gridItem}
                  onPress={() => {
                    hapticTap();
                    setSymptom(key);
                  }}>
                  <GlassCard style={styles.symptomCard}>
                    <GuideImage imageKey={issueImageKeys[key]} emoji="" backgroundColor={colors.track} style={{ height: 96 }} />
                    <Text style={[styles.symptomLabel, { color: colors.text }]} numberOfLines={2}>
                      {t.troubleshooting.symptoms[key].label}
                    </Text>
                  </GlassCard>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {symptom && question && (
          <>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>{t.diag.step(step + 1, questions.length)}</Text>
            <Text style={[styles.question, { color: colors.text }]}>{t.diag.questions[question].text}</Text>
            <View style={{ gap: Spacing.two }}>
              {QUESTION_OPTIONS[question].map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    hapticTap();
                    setAnswers((prev) => ({ ...prev, [question]: option }));
                  }}>
                  <GlassCard style={styles.option}>
                    <Text style={[styles.optionText, { color: colors.text }]}>
                      {(t.diag.questions[question].options as Record<string, string>)[option]}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                  </GlassCard>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {symptom && !question && (
          <>
            {results.map((result, i) => (
              <GlassCard key={result.cause} style={[styles.result, i === 0 && { borderColor: colors.tintBright }]}>
                <Text style={[styles.rank, { color: i === 0 ? colors.tintBright : colors.textSecondary }]}>
                  {i === 0 ? t.diag.mostLikely : t.diag.alsoPossible}
                </Text>
                <Text style={[styles.causeName, { color: colors.text }]}>{t.diag.causes[result.cause].name}</Text>

                <Text style={[styles.blockTitle, { color: colors.textSecondary }]}>{t.diag.whyWeThink}</Text>
                {(result.reasons.length > 0 ? result.reasons : [{ key: 'common', n: undefined }]).map((reason) => (
                  <View key={reason.key} style={styles.bulletRow}>
                    <Ionicons name="checkmark" size={15} color={colors.tintBright} style={styles.bulletIcon} />
                    <Text style={[styles.bulletText, { color: colors.text }]}>
                      {(t.diag.reasons as Record<string, (n: number) => string>)[reason.key]?.(reason.n ?? 0) ?? ''}
                    </Text>
                  </View>
                ))}

                <Text style={[styles.blockTitle, { color: colors.textSecondary }]}>{t.diag.whatToDo}</Text>
                {t.diag.causes[result.cause].advice.map((line, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <View style={[styles.dot, { backgroundColor: colors.tint }]} />
                    <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{line}</Text>
                  </View>
                ))}
              </GlassCard>
            ))}

            <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>{t.diag.disclaimer}</Text>

            <Pressable onPress={() => router.push(`/guide/issue/${symptom}`)}>
              <GlassCard style={styles.option}>
                <Ionicons name="book-outline" size={18} color={colors.tintBright} />
                <Text style={[styles.optionText, { color: colors.text }]}>{t.diag.readGuide}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
              </GlassCard>
            </Pressable>
            <Pressable
              onPress={() => {
                setAnswers({});
                if (!params.symptom) setSymptom(null);
              }}
              style={styles.link}>
              <Text style={[styles.linkText, { color: colors.textSecondary }]}>{t.diag.restart}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  round: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  scroll: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  stepText: { fontSize: 12, fontWeight: '700' },
  question: { fontSize: 20, fontWeight: '700', lineHeight: 26 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  gridItem: { width: '48%' },
  symptomCard: { overflow: 'hidden' },
  symptomLabel: { fontSize: 13, fontWeight: '700', lineHeight: 17, padding: 10, minHeight: 54 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.three },
  optionText: { flex: 1, fontSize: 15, fontWeight: '600' },
  result: { padding: Spacing.three, gap: 6 },
  rank: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  causeName: { fontSize: 18, fontWeight: '700', marginBottom: 2 },
  blockTitle: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bulletIcon: { marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 7, marginHorizontal: 5 },
  bulletText: { flex: 1, fontSize: 13, lineHeight: 19 },
  disclaimer: { fontSize: 12, lineHeight: 17 },
  link: { alignItems: 'center', paddingVertical: 6 },
  linkText: { fontSize: 13, fontWeight: '600' },
});
