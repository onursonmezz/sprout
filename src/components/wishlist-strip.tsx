import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/glass';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { useWishlist } from '@/context/wishlist-context';
import { speciesDisplayName, speciesGuide } from '@/data/species-guide';
import { SPECIES_PHOTOS } from '@/data/species-photos';
import { useTheme } from '@/hooks/use-theme';

/** "Plants I'd like to have", on the My Plants tab. Hidden while empty (like
 * the propagation strip); entries are added from a scan result. "Got it" opens
 * the add-plant form with the species filled in; saving the plant removes it
 * from the list. */
export function WishlistStrip() {
  const colors = useTheme();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { items, remove } = useWishlist();
  const byId = new Map(speciesGuide.map((s) => [s.id, s]));
  const entries = items.flatMap((item) => {
    const species = byId.get(item.speciesId);
    return species ? [species] : [];
  });

  if (entries.length === 0) return null;

  return (
    <View style={{ gap: Spacing.two, marginBottom: Spacing.three }}>
      <Text style={[styles.title, { color: colors.text }]}>{t.wishlist.title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
        {entries.map((species) => (
          <GlassCard key={species.id} style={styles.tile}>
            <View style={[styles.photo, { backgroundColor: colors.tintMuted }]}>
              {SPECIES_PHOTOS[species.id] ? (
                <Image source={SPECIES_PHOTOS[species.id]} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Ionicons name="leaf-outline" size={26} color={colors.tint} />
              )}
              <Pressable
                onPress={() => remove(species.id)}
                hitSlop={8}
                accessibilityLabel={t.wishlist.remove}
                style={styles.remove}>
                <Ionicons name="close" size={14} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {speciesDisplayName(species, lang)}
              </Text>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/add-plant',
                    params: { prefillSpecies: speciesDisplayName(species, lang), prefillLatin: species.scientificName },
                  })
                }
                style={[styles.bought, { borderColor: colors.tint }]}>
                <Ionicons name="checkmark" size={14} color={colors.tint} />
                <Text style={[styles.boughtText, { color: colors.tint }]}>{t.wishlist.bought}</Text>
              </Pressable>
            </View>
          </GlassCard>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700' },
  tile: { width: 150, overflow: 'hidden' },
  photo: { height: 84, alignItems: 'center', justifyContent: 'center' },
  remove: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { padding: 10, gap: 8 },
  name: { fontSize: 13, fontWeight: '700' },
  bought: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 1, borderRadius: 12, paddingVertical: 5 },
  boughtText: { fontSize: 12, fontWeight: '700' },
});
