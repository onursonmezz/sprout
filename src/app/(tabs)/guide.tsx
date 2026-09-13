import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GuideImage } from '@/components/guide-image';
import { Fonts, Spacing } from '@/constants/theme';
import { Translations } from '@/constants/translations';
import { useLanguage } from '@/context/language-context';
import {
  GuideCategoryKey,
  guideArticleKeys,
  guideArticles,
  guideCategoryIcons,
  guideCategoryKeys,
  issueCategory,
  issueImageKeys,
} from '@/data/guide-content';
import { symptomEmoji, symptomKeys } from '@/data/troubleshooting';
import { wateringAlgorithm } from '@/data/species-guide';
import { useTheme } from '@/hooks/use-theme';

function seasonalCardCopy(t: Translations) {
  const month = new Date().getMonth() + 1;
  if (month === 9) return t.guide.seasonalCard.heatingApproaching;
  if (wateringAlgorithm.heatingMonths.includes(month)) return t.guide.seasonalCard.heatingActive;
  return t.guide.seasonalCard.growingSeason;
}

export default function GuideScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<GuideCategoryKey | null>(null);

  const seasonal = useMemo(() => seasonalCardCopy(t), [t]);
  const searching = query.trim().length > 0;
  const q = query.trim().toLowerCase();

  const gridArticleKeys = guideArticleKeys.filter((key) => !guideArticles[key].featured);
  const featuredKey = guideArticleKeys.find((key) => guideArticles[key].featured)!;

  const visibleGridArticles = gridArticleKeys.filter((key) => !activeCategory || guideArticles[key].category === activeCategory);
  const visibleIssues = symptomKeys.filter((key) => !activeCategory || issueCategory[key] === activeCategory);

  const searchArticleResults = guideArticleKeys.filter((key) => t.guide.articles[key].title.toLowerCase().includes(q));
  const searchIssueResults = symptomKeys.filter((key) => t.troubleshooting.symptoms[key].label.toLowerCase().includes(q));
  const totalSearchResults = searchArticleResults.length + searchIssueResults.length;

  const toggleCategory = (key: GuideCategoryKey) => setActiveCategory((prev) => (prev === key ? null : key));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.serif }]}>{t.guide.tabTitle}</Text>

        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.guide.searchPlaceholder}
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>

        {searching ? (
          <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              {t.guide.searchResultsCount(totalSearchResults)}
            </Text>
            {totalSearchResults === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.guide.noResults}</Text>
            ) : (
              <>
                {searchArticleResults.map((key) => (
                  <ArticleListRow key={key} articleKey={key} colors={colors} t={t} onPress={() => router.push(`/guide/article/${key}`)} />
                ))}
                {searchIssueResults.map((key) => (
                  <IssueListRow key={key} issueKey={key} colors={colors} t={t} onPress={() => router.push(`/guide/issue/${key}`)} />
                ))}
              </>
            )}
          </View>
        ) : (
          <>
            <Pressable
              onPress={() => router.push('/guide/article/seasonalCare')}
              style={[styles.seasonalCard, { backgroundColor: colors.tintMuted }]}>
              <View style={styles.seasonalHeader}>
                <View style={[styles.seasonalIcon, { backgroundColor: colors.background }]}>
                  <Ionicons name="leaf" size={16} color={colors.tint} />
                </View>
                <Text style={[styles.seasonalTitle, { color: colors.text }]}>{seasonal.title}</Text>
              </View>
              <Text style={[styles.seasonalBody, { color: colors.textSecondary }]}>{seasonal.body}</Text>
              <Text style={[styles.seasonalCta, { color: colors.tint }]}>{t.guide.seasonalCard.cta}</Text>
            </Pressable>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Spacing.four }]}>
              {t.guide.topicsSectionTitle}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
              {guideCategoryKeys.map((key) => {
                const active = activeCategory === key;
                return (
                  <Pressable key={key} onPress={() => toggleCategory(key)} style={styles.categoryItem}>
                    <View
                      style={[
                        styles.categoryCircle,
                        { backgroundColor: active ? colors.tint : colors.card, borderColor: colors.border },
                      ]}>
                      <Ionicons name={guideCategoryIcons[key]} size={26} color={active ? '#fff' : colors.text} />
                    </View>
                    <Text style={[styles.categoryLabel, { color: active ? colors.tint : colors.textSecondary }]}>
                      {t.guide.categories[key]}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Spacing.four }]}>
              {t.guide.featuredSectionTitle}
            </Text>
            <Pressable
              onPress={() => router.push(`/guide/article/${featuredKey}`)}
              style={[styles.featuredCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <GuideImage
                imageKey={guideArticles[featuredKey].imageKey}
                emoji={guideArticles[featuredKey].emoji}
                backgroundColor={colors.tintMuted}
                style={styles.featuredImage}
                emojiSize={44}
              />
              <View style={styles.featuredBody}>
                <View style={[styles.categoryPill, { backgroundColor: colors.tint, alignSelf: 'flex-start' }]}>
                  <Text style={styles.categoryPillText}>{t.guide.categories[guideArticles[featuredKey].category].toUpperCase()}</Text>
                </View>
                <Text style={[styles.featuredTitle, { color: colors.text }]}>{t.guide.articles[featuredKey].title}</Text>
                <Text style={[styles.featuredSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>
                  {t.guide.articles[featuredKey].subtitle}
                </Text>
                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
                  <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                    {t.guide.readMinutes(guideArticles[featuredKey].readMinutes)}
                  </Text>
                </View>
              </View>
            </Pressable>

            <View style={[styles.sectionHeaderRow, { marginTop: Spacing.four }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.guide.issuesSectionTitle}</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{t.guide.issuesSectionSubtitle}</Text>
              </View>
              <Pressable onPress={() => router.push('/guide/issues')}>
                <Text style={[styles.seeAllLink, { color: colors.tint }]}>{t.guide.seeAll}</Text>
              </Pressable>
            </View>
            <View style={{ gap: Spacing.two, marginTop: Spacing.two }}>
              {visibleIssues.slice(0, 3).map((key) => (
                <IssueListRow key={key} issueKey={key} colors={colors} t={t} onPress={() => router.push(`/guide/issue/${key}`)} />
              ))}
            </View>

            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Spacing.four }]}>
              {t.guide.guideSectionTitle}
            </Text>
            <View style={styles.grid}>
              {visibleGridArticles.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => router.push(`/guide/article/${key}`)}
                  style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <GuideImage
                    imageKey={guideArticles[key].imageKey}
                    emoji={guideArticles[key].emoji}
                    backgroundColor={colors.tintMuted}
                    style={styles.gridImage}
                  />
                  <View style={styles.gridInfo}>
                    <Text style={[styles.gridTitle, { color: colors.text }]} numberOfLines={2}>
                      {t.guide.articles[key].title}
                    </Text>
                    <Text style={[styles.gridCategory, { color: colors.textSecondary }]}>
                      {t.guide.categories[guideArticles[key].category]}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ArticleListRow({
  articleKey,
  colors,
  t,
  onPress,
}: {
  articleKey: keyof Translations['guide']['articles'];
  colors: ReturnType<typeof useTheme>;
  t: Translations;
  onPress: () => void;
}) {
  const meta = guideArticles[articleKey];
  return (
    <Pressable onPress={onPress} style={[styles.listRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <GuideImage imageKey={meta.imageKey} emoji={meta.emoji} backgroundColor={colors.tintMuted} style={styles.listThumb} emojiSize={22} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={2}>
          {t.guide.articles[articleKey].title}
        </Text>
        <Text style={[styles.listSubtitle, { color: colors.textSecondary }]}>{t.guide.categories[meta.category]}</Text>
      </View>
    </Pressable>
  );
}

function IssueListRow({
  issueKey,
  colors,
  t,
  onPress,
}: {
  issueKey: keyof Translations['troubleshooting']['symptoms'];
  colors: ReturnType<typeof useTheme>;
  t: Translations;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.listRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <GuideImage
        imageKey={issueImageKeys[issueKey]}
        emoji={symptomEmoji[issueKey]}
        backgroundColor={colors.accentMuted}
        style={styles.listThumb}
        emojiSize={22}
      />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={2}>
          {t.troubleshooting.symptoms[issueKey].label}
        </Text>
        <Text style={[styles.listSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {t.guide.issues[issueKey].why[0]}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.four, paddingBottom: Spacing.six },
  title: { fontSize: 28 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
    marginTop: Spacing.three,
  },
  searchInput: { flex: 1, fontSize: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  sectionSubtitle: { fontSize: 12, marginTop: 2 },
  emptyText: { fontSize: 13 },

  seasonalCard: { borderRadius: 20, padding: Spacing.three, gap: 6, marginTop: Spacing.three },
  seasonalHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seasonalIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  seasonalTitle: { fontSize: 15, fontWeight: '700', flex: 1 },
  seasonalBody: { fontSize: 13, lineHeight: 19 },
  seasonalCta: { fontSize: 13, fontWeight: '700', alignSelf: 'flex-end' },

  // Extra-generous trailing padding so the last circle+label clears the
  // screen edge with real breathing room once fully scrolled, rather than
  // sitting flush against it.
  categoryRow: { gap: Spacing.three, paddingTop: Spacing.one, paddingRight: Spacing.six },
  categoryItem: { alignItems: 'center', gap: 6, width: 72 },
  categoryCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  featuredCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginTop: Spacing.one },
  featuredImage: { height: 160 },
  featuredBody: { padding: Spacing.three, gap: 6 },
  featuredTitle: { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  featuredSubtitle: { fontSize: 13, lineHeight: 18 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontWeight: '600' },

  categoryPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  categoryPillText: { color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
  seeAllLink: { fontSize: 12, fontWeight: '700' },

  listRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: 16, borderWidth: 1, padding: Spacing.two },
  listThumb: { width: 56, height: 56, borderRadius: 14 },
  listTitle: { fontSize: 13, fontWeight: '700' },
  listSubtitle: { fontSize: 11 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.one },
  gridCard: { width: '48%', borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  gridImage: { aspectRatio: 1 },
  gridInfo: { padding: Spacing.two, gap: 2 },
  gridTitle: { fontSize: 13, fontWeight: '700', lineHeight: 17 },
  gridCategory: { fontSize: 11 },
});
