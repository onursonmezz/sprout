import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { GlassCard } from '@/components/glass';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { usePlants } from '@/context/plants-context';
import { Plant } from '@/data/plants';
import { useTheme } from '@/hooks/use-theme';
import { formatDateFromDaysOffset, relativeTime } from '@/utils/care';
import { hapticSuccess } from '@/utils/haptics';
import { pickFromCamera, pickFromLibrary } from '@/utils/photos';
import { photoDue } from '@/utils/seasonal-tasks';

/** Adds a dated growth photo to a plant's journal. Shared with the weekly tour. */
export function useAddGrowthPhoto() {
  const { addJournalEntry } = usePlants();
  const { t } = useLanguage();
  return async (plant: Plant, source: 'camera' | 'library'): Promise<boolean> => {
    try {
      const uri = await (source === 'camera' ? pickFromCamera() : pickFromLibrary());
      if (!uri) return false;
      addJournalEntry(plant.id, {
        id: `photo-${Date.now()}`,
        type: 'photo',
        title: t.plantDetail.journal.typeNames.photo,
        description: '',
        daysAgo: 0,
        photoUri: uri,
      });
      hapticSuccess();
      return true;
    } catch {
      return false;
    }
  };
}

/**
 * A plant's photos over time: add one about once a month, scroll back
 * through them, and compare the first with the latest. Photos come from the
 * journal, so pictures attached to ordinary journal entries appear here too.
 */
export function GrowthAlbum({ plant }: { plant: Plant }) {
  const colors = useTheme();
  const { t } = useLanguage();
  const addGrowthPhoto = useAddGrowthPhoto();
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);

  // Oldest first.
  const photos = useMemo(
    () =>
      plant.journalNotes
        .filter((e) => !!e.photoUri)
        .map((e) => ({ uri: e.photoUri as string, daysAgo: e.daysAgo }))
        .sort((a, b) => b.daysAgo - a.daysAgo),
    [plant.journalNotes]
  );
  const first = photos[0];
  const latest = photos[photos.length - 1];
  const due = photoDue(plant);

  const add = async (source: 'camera' | 'library') => {
    setAdding(false);
    await addGrowthPhoto(plant, source);
  };

  return (
    <View style={{ gap: Spacing.two }}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t.album.title}</Text>
          <Text style={[styles.subtitle, { color: due ? colors.late : colors.textSecondary }]}>
            {photos.length === 0 ? t.album.empty : due ? t.album.due(relativeTime(latest.daysAgo, t)) : t.album.last(relativeTime(latest.daysAgo, t))}
          </Text>
        </View>
        {photos.length >= 2 && (
          <Pressable onPress={() => setComparing(true)} style={[styles.compareButton, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
            <Ionicons name="git-compare-outline" size={15} color={colors.tintBright} />
            <Text style={[styles.compareText, { color: colors.text }]}>{t.album.compare}</Text>
          </Pressable>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
        <Pressable onPress={() => setAdding((a) => !a)}>
          <GlassCard style={[styles.thumb, styles.addTile, due && { borderColor: colors.late }]}>
            <Ionicons name="camera-outline" size={24} color={colors.tintBright} />
            <Text style={[styles.addText, { color: colors.text }]}>{t.album.add}</Text>
          </GlassCard>
        </Pressable>
        {[...photos].reverse().map((p, i) => (
          <Pressable key={`${p.uri}-${i}`} onPress={() => setViewing(p.uri)} style={{ gap: 4 }}>
            <Image source={{ uri: p.uri }} style={[styles.thumb, { borderColor: colors.glassBorder }]} contentFit="cover" />
            <Text style={[styles.thumbLabel, { color: colors.textSecondary }]}>{formatDateFromDaysOffset(-p.daysAgo, t)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {adding && (
        <View style={styles.sourceRow}>
          <Pressable onPress={() => add('camera')} style={[styles.sourceButton, { backgroundColor: colors.backgroundSelected }]}>
            <Ionicons name="camera-outline" size={17} color={colors.text} />
            <Text style={[styles.sourceText, { color: colors.text }]}>{t.album.camera}</Text>
          </Pressable>
          <Pressable onPress={() => add('library')} style={[styles.sourceButton, { backgroundColor: colors.backgroundSelected }]}>
            <Ionicons name="images-outline" size={17} color={colors.text} />
            <Text style={[styles.sourceText, { color: colors.text }]}>{t.album.library}</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable style={styles.backdrop} onPress={() => setViewing(null)}>
          {!!viewing && <Image source={{ uri: viewing }} style={styles.fullImage} contentFit="contain" />}
        </Pressable>
      </Modal>

      <Modal visible={comparing} transparent animationType="fade" onRequestClose={() => setComparing(false)}>
        <Pressable style={styles.backdrop} onPress={() => setComparing(false)}>
          {first && latest && (
            <View style={styles.compareWrap}>
              <Text style={styles.compareTitle}>{plant.name}</Text>
              <View style={styles.compareRow}>
                {[first, latest].map((p, i) => (
                  <View key={i} style={styles.compareItem}>
                    <Image source={{ uri: p.uri }} style={styles.compareImage} contentFit="cover" />
                    <Text style={styles.compareLabel}>{i === 0 ? t.album.before : t.album.after}</Text>
                    <Text style={styles.compareDate}>{formatDateFromDaysOffset(-p.daysAgo, t)}</Text>
                  </View>
                ))}
              </View>
              <Text style={styles.compareSpan}>{t.album.span(first.daysAgo - latest.daysAgo)}</Text>
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 1 },
  compareButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  compareText: { fontSize: 12, fontWeight: '700' },
  thumb: { width: 96, height: 120, borderRadius: 14, borderWidth: 1 },
  addTile: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  addText: { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  thumbLabel: { fontSize: 10, textAlign: 'center' },
  sourceRow: { flexDirection: 'row', gap: Spacing.two },
  sourceButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 11 },
  sourceText: { fontSize: 13, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center', padding: Spacing.three },
  fullImage: { width: '100%', height: '80%' },
  compareWrap: { width: '100%', gap: Spacing.three },
  compareTitle: { color: '#fff', fontSize: 22, fontWeight: '700', textAlign: 'center' },
  compareRow: { flexDirection: 'row', gap: Spacing.two },
  compareItem: { flex: 1, gap: 4 },
  compareImage: { width: '100%', aspectRatio: 3 / 4, borderRadius: 16 },
  compareLabel: { color: '#8FE3A1', fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 4 },
  compareDate: { color: '#fff', fontSize: 12, textAlign: 'center' },
  compareSpan: { color: '#A9BDB0', fontSize: 13, textAlign: 'center' },
});
