import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GuideImage } from '@/components/guide-image';
import { Fonts, Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { GuideArticleKey, guideArticles } from '@/data/guide-content';
import { useTheme } from '@/hooks/use-theme';

export default function GuideArticleScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const colors = useTheme();
  const { t } = useLanguage();

  const articleKey = key as GuideArticleKey;
  const meta = guideArticles[articleKey];
  const content = t.guide.articles[articleKey];

  if (!meta || !content) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.text }}>{t.plantDetail.notFound}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          <GuideImage imageKey={meta.imageKey} emoji={meta.emoji} backgroundColor={colors.tintMuted} style={styles.hero} emojiSize={56} />
          <Pressable onPress={() => router.back()} style={[styles.backButton, { backgroundColor: 'rgba(0,0,0,0.35)' }]}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={[styles.categoryPill, { backgroundColor: colors.tint }]}>
            <Text style={styles.categoryPillText}>{t.guide.categories[meta.category].toUpperCase()}</Text>
          </View>
          <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.serif }]}>{content.title}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.metaText, { color: colors.textSecondary }]}>{t.guide.readMinutes(meta.readMinutes)}</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{content.subtitle}</Text>

          <View style={{ gap: Spacing.three, marginTop: Spacing.three }}>
            {content.body.map((paragraph, i) => (
              <Text key={i} style={[styles.paragraph, { color: colors.text }]}>
                {paragraph}
              </Text>
            ))}
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
  body: { padding: Spacing.four, gap: 4 },
  categoryPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginBottom: Spacing.two },
  categoryPillText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  title: { fontSize: 24, lineHeight: 30 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: Spacing.two },
  metaText: { fontSize: 12, fontWeight: '600' },
  subtitle: { fontSize: 14, lineHeight: 20, marginTop: Spacing.two },
  paragraph: { fontSize: 14, lineHeight: 22 },
});
