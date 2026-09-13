import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GuideImage } from '@/components/guide-image';
import { Fonts, Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { issueImageKeys, UrgencyLevel } from '@/data/guide-content';
import { symptomEmoji, SymptomKey } from '@/data/troubleshooting';
import { useTheme } from '@/hooks/use-theme';

function IssueSection({
  title,
  items,
  colors,
}: {
  title: string;
  items: string[];
  colors: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={{ gap: Spacing.two }}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={{ gap: Spacing.two }}>
        {items.map((item, i) => (
          <View key={i} style={styles.bulletRow}>
            <View style={[styles.bulletDot, { backgroundColor: colors.tint }]} />
            <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function GuideIssueScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const colors = useTheme();
  const { t } = useLanguage();

  const issueKey = key as SymptomKey;
  const symptom = t.troubleshooting.symptoms[issueKey];
  const detail = t.guide.issues[issueKey];

  if (!symptom || !detail) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.text }}>{t.plantDetail.notFound}</Text>
      </View>
    );
  }

  const urgency = detail.urgency as UrgencyLevel;
  const urgencyColor = urgency === 'low' ? colors.tint : colors.accent;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <GuideImage
            imageKey={issueImageKeys[issueKey]}
            emoji={symptomEmoji[issueKey]}
            backgroundColor={colors.accentMuted}
            style={styles.hero}
            emojiSize={56}
          />
          <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.serif }]}>{symptom.label}</Text>

          <View style={[styles.urgencyCard, { backgroundColor: colors.card, borderColor: urgencyColor }]}>
            <Text style={[styles.urgencyLabel, { color: urgencyColor }]}>
              {t.guide.issueDetail.urgencyTitle} · {t.guide.issueDetail.urgencyLabels[urgency]}
            </Text>
            <Text style={[styles.urgencyNote, { color: colors.textSecondary }]}>{detail.urgencyNote}</Text>
          </View>

          <View style={{ gap: Spacing.four, marginTop: Spacing.three }}>
            <IssueSection title={t.guide.issueDetail.whyTitle} items={detail.why} colors={colors} />
            <IssueSection title={t.guide.issueDetail.fixTitle} items={detail.fix} colors={colors} />
            <IssueSection title={t.guide.issueDetail.preventTitle} items={detail.prevent} colors={colors} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  heroWrap: { height: 220 },
  hero: { width: '100%', height: '100%' },
  backButton: {
    position: 'absolute',
    top: 56,
    left: Spacing.three,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: Spacing.four, gap: Spacing.two },
  title: { fontSize: 24, lineHeight: 30, marginBottom: Spacing.one },
  urgencyCard: { borderRadius: 16, borderWidth: 1.5, padding: Spacing.three, gap: 4, marginTop: Spacing.one },
  urgencyLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  urgencyNote: { fontSize: 13, lineHeight: 19 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  bulletRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  bulletDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 21 },
});
