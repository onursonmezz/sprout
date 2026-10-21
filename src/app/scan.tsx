import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard, GlowBackground, GradientFill } from '@/components/glass';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { useWishlist } from '@/context/wishlist-context';
import { speciesDisplayName } from '@/data/species-guide';
import { SPECIES_PHOTOS } from '@/data/species-photos';
import { useGoBack } from '@/hooks/use-go-back';
import { useTheme } from '@/hooks/use-theme';
import { deletePhoto } from '@/utils/photos';
import { identifyPlant, PLANT_ID_CONFIDENT, PlantIdGuess } from '@/utils/plant-id';

type State = { status: 'working' } | { status: 'failed'; detail?: string } | { status: 'done'; guesses: PlantIdGuess[] };

/** What the middle tab-bar button leads to: the photo, the most likely species
 * with its basic care, and ways to keep it — add it as a plant or save it to
 * the wishlist. The other two guesses can be tapped to switch. */
export default function ScanScreen() {
  const { uri } = useLocalSearchParams<{ uri: string }>();
  const router = useRouter();
  const goBack = useGoBack();
  const colors = useTheme();
  const { t, lang } = useLanguage();
  const wishlist = useWishlist();
  const [state, setState] = useState<State>({ status: 'working' });
  const [chosen, setChosen] = useState(0);
  // The photo was copied into the app's own folder when it was taken; unless it
  // goes on to become a plant's photo, it is removed when this screen closes.
  const keepPhoto = useRef(false);

  useEffect(() => {
    let current = true;
    identifyPlant(String(uri))
      .then((guesses) => current && setState(guesses.length ? { status: 'done', guesses } : { status: 'failed' }))
      .catch((e: unknown) => current && setState({ status: 'failed', detail: e instanceof Error ? e.message : String(e) }));
    return () => {
      current = false;
      if (!keepPhoto.current) deletePhoto(String(uri));
    };
  }, [uri]);

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={goBack}
        hitSlop={10}
        style={[styles.round, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
        <Ionicons name="close" size={20} color={colors.text} />
      </Pressable>
      <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>{t.scan.title}</Text>
    </View>
  );

  if (state.status !== 'done') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <GlowBackground />
        {header}
        <View style={styles.centre}>
          <Image source={{ uri: String(uri) }} style={styles.preview} contentFit="cover" />
          {state.status === 'working' ? (
            <View style={styles.row}>
              <ActivityIndicator color={colors.tint} />
              <Text style={[styles.text, { color: colors.textSecondary }]}>{t.scan.working}</Text>
            </View>
          ) : (
            <>
              <Text style={[styles.text, { color: colors.textSecondary, textAlign: 'center' }]}>{t.scan.failed}</Text>
              {state.detail && (
                <Text selectable style={[styles.detail, { color: colors.textSecondary }]}>
                  {state.detail}
                </Text>
              )}
              <Pressable onPress={goBack} style={[styles.button, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                <Text style={[styles.buttonText, { color: colors.text }]}>{t.scan.tryAgain}</Text>
              </Pressable>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const { guesses } = state;
  const { species, probability } = guesses[chosen];
  const confident = guesses[0].probability >= PLANT_ID_CONFIDENT;
  const toxic = species.toxicity.toxicToCats || species.toxicity.toxicToDogs;
  const toxicityUnknown = species.toxicity.severity === 'unknown';
  const inWishlist = wishlist.has(species.id);

  const addToPlants = () => {
    keepPhoto.current = true;
    router.replace({
      pathname: '/add-plant',
      params: { prefillSpecies: speciesDisplayName(species, lang), prefillLatin: species.scientificName, prefillPhoto: String(uri) },
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <GlowBackground />
      {header}
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={{ uri: String(uri) }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <View style={styles.badge}>
            <Text style={[styles.badgeText, { color: colors.tintBright }]}>{t.scan.match(Math.round(probability * 100))}</Text>
          </View>
        </View>

        {!confident && (
          <GlassCard style={styles.note}>
            <Ionicons name="help-circle-outline" size={18} color={colors.late} />
            <Text style={[styles.small, { color: colors.text, flex: 1 }]}>{t.scan.notSure}</Text>
          </GlassCard>
        )}

        <View>
          <Text style={[styles.name, { color: colors.text }]}>{speciesDisplayName(species, lang)}</Text>
          <Text style={[styles.latin, { color: colors.textSecondary }]}>{species.scientificName}</Text>
        </View>

        <View style={styles.facts}>
          <Fact icon="water-outline" text={t.scan.everyDays(species.water.baseIntervalDays)} />
          <Fact icon="sunny-outline" text={t.addPlant.lightLevels[species.light.preferred].label} />
          <Fact
            icon={toxic || toxicityUnknown ? 'warning-outline' : 'paw-outline'}
            text={
              toxic
                ? t.plantDetail.toxicToPets
                : toxicityUnknown
                  ? t.plantDetail.toxicityUnknown
                  : t.plantDetail.nonToxicToPets.replace('✓ ', '')
            }
            warn={toxic || toxicityUnknown}
          />
        </View>

        <Pressable onPress={addToPlants} style={styles.primary}>
          <GradientFill stops={[colors.gradientFrom, colors.gradientTo]} />
          <Ionicons name="add" size={20} color={colors.onTint} />
          <Text style={[styles.buttonText, { color: colors.onTint }]}>{t.scan.addToPlants}</Text>
        </Pressable>
        <Pressable
          onPress={() => (inWishlist ? wishlist.remove(species.id) : wishlist.add(species.id))}
          style={[styles.button, { backgroundColor: colors.glass, borderColor: inWishlist ? colors.tint : colors.glassBorder }]}>
          <Ionicons name={inWishlist ? 'heart' : 'heart-outline'} size={19} color={inWishlist ? colors.tint : colors.text} />
          <Text style={[styles.buttonText, { color: colors.text }]}>{inWishlist ? t.scan.inWishlist : t.scan.addToWishlist}</Text>
        </Pressable>

        {guesses.length > 1 && (
          <>
            <Text style={[styles.small, { color: colors.textSecondary, marginTop: 4 }]}>{t.scan.otherOptions}</Text>
            <View style={styles.alternatives}>
              {guesses.map((g, i) =>
                i === chosen ? null : (
                  <Pressable
                    key={g.species.id}
                    onPress={() => setChosen(i)}
                    style={[styles.alternative, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                    {SPECIES_PHOTOS[g.species.id] && (
                      <Image source={SPECIES_PHOTOS[g.species.id]} style={styles.altThumb} contentFit="cover" />
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.altName, { color: colors.text }]} numberOfLines={2}>
                        {speciesDisplayName(g.species, lang)}
                      </Text>
                      <Text style={[styles.small, { color: colors.textSecondary }]}>
                        {lang === 'tr' ? `%${Math.round(g.probability * 100)}` : `${Math.round(g.probability * 100)}%`}
                      </Text>
                    </View>
                  </Pressable>
                )
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Fact({ icon, text, warn }: { icon: keyof typeof Ionicons.glyphMap; text: string; warn?: boolean }) {
  const colors = useTheme();
  return (
    <View style={[styles.fact, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
      <Ionicons name={icon} size={14} color={warn ? colors.late : colors.tint} />
      <Text style={[styles.factText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  round: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { fontSize: 13, fontWeight: '700', letterSpacing: 0.6 },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: Spacing.four },
  preview: { width: 220, height: 220, borderRadius: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scroll: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.five, gap: 12 },
  hero: { height: 230, borderRadius: 20, overflow: 'hidden', justifyContent: 'flex-end', padding: 12 },
  badge: { alignSelf: 'flex-start', backgroundColor: 'rgba(6,18,10,0.7)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  name: { fontSize: 26, fontWeight: '700' },
  latin: { fontSize: 14, fontStyle: 'italic', marginTop: 2 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6 },
  factText: { fontSize: 12.5, fontWeight: '500' },
  primary: { height: 50, borderRadius: 25, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  button: { height: 50, borderRadius: 25, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  buttonText: { fontSize: 15, fontWeight: '700' },
  alternatives: { flexDirection: 'row', gap: 8 },
  alternative: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, borderWidth: 1, padding: 8 },
  altThumb: { width: 38, height: 38, borderRadius: 10 },
  altName: { fontSize: 13, fontWeight: '700' },
  text: { fontSize: 14, lineHeight: 20 },
  small: { fontSize: 12.5 },
  detail: { fontSize: 11, opacity: 0.7, textAlign: 'center' },
});
