import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/glass';
import { GuideImage } from '@/components/guide-image';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { issueImageKeys } from '@/data/guide-content';
import { symptomKeys } from '@/data/troubleshooting';
import { useTheme } from '@/hooks/use-theme';

/**
 * "Is something wrong?" on a plant's page: one row of photo cards, one per
 * symptom, scrolled sideways. A card opens that symptom's full guide page
 * (why it happens, how to fix it, whether to worry), so the plant page itself
 * stays short instead of repeating the guide as a long list.
 */
export function IssueStrip() {
  const colors = useTheme();
  const router = useRouter();
  const { t } = useLanguage();

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t.troubleshooting.stripTitle}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.troubleshooting.stripHint}</Text>
        </View>
        <Pressable onPress={() => router.push('/guide/issues')} hitSlop={8}>
          <Text style={[styles.seeAll, { color: colors.tintBright }]}>{t.troubleshooting.seeAll}</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {symptomKeys.map((key) => (
          <Pressable key={key} onPress={() => router.push(`/guide/issue/${key}`)}>
            <GlassCard style={styles.card}>
              <GuideImage imageKey={issueImageKeys[key]} emoji="" backgroundColor={colors.track} style={{ width: 132, height: 112 }} />
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                  {t.troubleshooting.symptoms[key].label}
                </Text>
                <Text style={[styles.cardHint, { color: colors.textSecondary }]} numberOfLines={2}>
                  {t.troubleshooting.hints[key]}
                </Text>
              </View>
            </GlassCard>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two, marginTop: Spacing.three },
  headerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.two },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 1 },
  seeAll: { fontSize: 12, fontWeight: '700' },
  // The cards run to the screen edge on the right, hinting that the row scrolls.
  row: { gap: Spacing.two, paddingRight: Spacing.three },
  card: { width: 132, overflow: 'hidden' },
  cardText: { padding: 10, gap: 3, minHeight: 78 },
  cardTitle: { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  cardHint: { fontSize: 11, lineHeight: 15 },
});
