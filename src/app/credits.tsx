import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard, GlowBackground } from '@/components/glass';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { speciesDisplayName, speciesGuide } from '@/data/species-guide';
import { SPECIES_PHOTO_CREDITS, SPECIES_PHOTOS } from '@/data/species-photos';
import { useTheme } from '@/hooks/use-theme';

const FULL_LIST_URL = 'https://github.com/onursonmezz/sprout/blob/main/tanima/fotograf-kaynaklari.csv';

/** Attribution for the photos the identification model learned from (CC BY
 * and CC BY-SA require naming the author) and for the example photos shown
 * next to its suggestions. */
export default function CreditsScreen() {
  const router = useRouter();
  const colors = useTheme();
  const { t, lang } = useLanguage();
  const examples = speciesGuide
    .filter((s) => SPECIES_PHOTO_CREDITS[s.id])
    .sort((a, b) => speciesDisplayName(a, lang).localeCompare(speciesDisplayName(b, lang), lang));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <GlowBackground />
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={[styles.round, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>{t.settings.creditsTitle}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.card}>
          <Text style={[styles.text, { color: colors.text }]}>{t.settings.creditsIntro}</Text>
          <Text style={[styles.text, { color: colors.textSecondary }]}>{t.settings.creditsLicenses}</Text>
          <Pressable onPress={() => WebBrowser.openBrowserAsync(FULL_LIST_URL)} style={styles.link}>
            <Ionicons name="open-outline" size={16} color={colors.tint} />
            <Text style={[styles.linkText, { color: colors.tint }]}>{t.settings.creditsFullList}</Text>
          </Pressable>
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.settings.creditsExamplesTitle}</Text>
        {examples.map((species) => {
          const credit = SPECIES_PHOTO_CREDITS[species.id];
          return (
            <Pressable key={species.id} onPress={() => WebBrowser.openBrowserAsync(credit.url)} style={styles.row}>
              <Image source={SPECIES_PHOTOS[species.id]} style={styles.thumb} contentFit="cover" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]}>{speciesDisplayName(species, lang)}</Text>
                <Text style={[styles.small, { color: colors.textSecondary }]} numberOfLines={2}>
                  {credit.author} · {credit.license} · {credit.source}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  round: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  scroll: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: 10 },
  card: { gap: 10 },
  text: { fontSize: 14, lineHeight: 20 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { fontSize: 14, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  thumb: { width: 44, height: 44, borderRadius: 10 },
  name: { fontSize: 14, fontWeight: '600' },
  small: { fontSize: 12 },
});
