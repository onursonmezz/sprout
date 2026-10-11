import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard, GlowBackground } from '@/components/glass';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { howToIcons, HowToKey, howToKeys } from '@/data/howto';
import { useTheme } from '@/hooks/use-theme';

/** A step-by-step walkthrough of one job: when to do it, what is needed, the
 * steps in order, and what to expect afterwards. */
export default function HowToScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const colors = useTheme();
  const { t } = useLanguage();

  if (!howToKeys.includes(key as HowToKey)) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.text }}>{t.plantDetail.notFound}</Text>
      </View>
    );
  }
  const howToKey = key as HowToKey;
  const content = t.howto.items[howToKey];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <GlowBackground />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={[styles.round, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>{t.howto.label}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View style={[styles.icon, { backgroundColor: colors.track }]}>
            <Ionicons name={howToIcons[howToKey]} size={24} color={colors.tintBright} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{content.title}</Text>
        </View>
        <Text style={[styles.intro, { color: colors.textSecondary }]}>{content.intro}</Text>

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.tintBright }]}>{t.howto.whenTitle}</Text>
          <Text style={[styles.text, { color: colors.text }]}>{content.when}</Text>
          <Text style={[styles.cardTitle, { color: colors.tintBright, marginTop: 10 }]}>{t.howto.needTitle}</Text>
          {content.need.map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.dot, { backgroundColor: colors.tint }]} />
              <Text style={[styles.text, styles.rowText, { color: colors.text }]}>{item}</Text>
            </View>
          ))}
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.howto.stepsTitle}</Text>
        {content.steps.map((step, i) => (
          <GlassCard key={i} style={styles.step}>
            <View style={[styles.number, { backgroundColor: colors.tint }]}>
              <Text style={[styles.numberText, { color: colors.onTint }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
              <Text style={[styles.text, { color: colors.textSecondary }]}>{step.text}</Text>
            </View>
          </GlassCard>
        ))}

        <GlassCard style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.tintBright }]}>{t.howto.afterTitle}</Text>
          {content.after.map((item, i) => (
            <View key={i} style={styles.bulletRow}>
              <View style={[styles.dot, { backgroundColor: colors.tint }]} />
              <Text style={[styles.text, styles.rowText, { color: colors.text }]}>{item}</Text>
            </View>
          ))}
        </GlassCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  round: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  scroll: { padding: Spacing.three, paddingBottom: Spacing.five, gap: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 22, fontWeight: '700', lineHeight: 27 },
  intro: { fontSize: 14, lineHeight: 21 },
  card: { padding: Spacing.three, gap: 6 },
  cardTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.4 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  step: { flexDirection: 'row', gap: 12, padding: Spacing.three, alignItems: 'flex-start' },
  number: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  numberText: { fontSize: 13, fontWeight: '700' },
  stepTitle: { fontSize: 14, fontWeight: '700' },
  text: { fontSize: 13, lineHeight: 19 },
  rowText: { flex: 1 },
  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  dot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 7 },
});
