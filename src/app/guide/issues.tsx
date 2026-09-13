import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GuideImage } from '@/components/guide-image';
import { Fonts, Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { issueImageKeys } from '@/data/guide-content';
import { symptomEmoji, symptomKeys } from '@/data/troubleshooting';
import { useTheme } from '@/hooks/use-theme';

export default function GuideIssuesScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { t } = useLanguage();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.topRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.serif }]}>{t.guide.issuesSectionTitle}</Text>
      </View>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.guide.issuesSectionSubtitle}</Text>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {symptomKeys.map((key) => (
          <Pressable
            key={key}
            onPress={() => router.push(`/guide/issue/${key}`)}
            style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <GuideImage imageKey={issueImageKeys[key]} emoji={symptomEmoji[key]} backgroundColor={colors.accentMuted} style={styles.thumb} emojiSize={24} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.rowTitle, { color: colors.text }]}>{t.troubleshooting.symptoms[key].label}</Text>
              <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {t.guide.issues[key].why[0]}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: -Spacing.one },
  title: { fontSize: 24 },
  subtitle: { fontSize: 13, paddingHorizontal: Spacing.four, marginTop: 4 },
  scroll: { padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: 16, borderWidth: 1, padding: Spacing.two },
  thumb: { width: 56, height: 56, borderRadius: 14 },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowSubtitle: { fontSize: 12 },
});
