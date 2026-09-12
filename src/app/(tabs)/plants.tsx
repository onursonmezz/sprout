import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlantAvatar } from '@/components/plant-avatar';
import { ROOM_KEYS, roomDisplayName } from '@/constants/rooms';
import { Fonts, Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/hooks/use-theme';
import { usePlants } from '@/context/plants-context';
import { Plant } from '@/data/plants';
import { Translations } from '@/constants/translations';

function statusLabel(status: string, days: number, t: Translations) {
  if (status === 'overdue') return t.plants.overdueDays(Math.abs(days));
  if (status === 'dueToday') return t.plants.dueToday;
  if (days === 1) return t.plants.tomorrow;
  return t.plants.inDays(days);
}

function PlantListRow({
  plant,
  colors,
  t,
  onPress,
  showRoom = true,
}: {
  plant: Plant;
  colors: ReturnType<typeof useTheme>;
  t: Translations;
  onPress: () => void;
  showRoom?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.listRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <PlantAvatar plant={plant} size={48} emojiSize={22} />
      <View style={styles.listInfo}>
        <View style={styles.listNameRow}>
          <Text style={[styles.plantName, { color: colors.text }]}>{plant.name}</Text>
          {plant.status === 'overdue' && (
            <View style={[styles.badge, { backgroundColor: colors.accentMuted }]}>
              <Text style={[styles.badgeText, { color: colors.accent }]}>{t.plants.overdue}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.plantMeta, { color: colors.textSecondary }]}>{plant.species}</Text>
        <Text style={[styles.plantMeta, { color: colors.tint }]}>💧 {statusLabel(plant.status, plant.daysUntilWatering, t)}</Text>
      </View>
      {showRoom && <Text style={[styles.plantMeta, { color: colors.textSecondary }]}>{roomDisplayName(plant, t)}</Text>}
    </Pressable>
  );
}

export default function PlantsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { plants } = usePlants();
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list' | 'rooms'>('grid');

  const filtered = useMemo(
    () =>
      plants.filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.species.toLowerCase().includes(query.toLowerCase())
      ),
    [plants, query]
  );

  const roomSections = useMemo(
    () =>
      ROOM_KEYS.map((key) => ({
        key,
        label: t.addPlant.rooms[key],
        plants: filtered.filter((p) => p.roomKey === key),
      })).filter((section) => section.plants.length > 0),
    [filtered, t]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.serif }]}>{t.plants.title}</Text>
        <Pressable
          onPress={() => router.push('/add-plant')}
          style={[styles.addButton, { backgroundColor: colors.tint }]}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.plants.search}
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
      </View>

      <View style={styles.countRow}>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t.plants.plantsCount(filtered.length)}</Text>
        <View style={[styles.viewToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            onPress={() => setView('grid')}
            style={[styles.toggleBtn, view === 'grid' && { backgroundColor: colors.tint }]}>
            <Ionicons name="grid-outline" size={16} color={view === 'grid' ? '#fff' : colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => setView('list')}
            style={[styles.toggleBtn, view === 'list' && { backgroundColor: colors.tint }]}>
            <Ionicons name="list-outline" size={16} color={view === 'list' ? '#fff' : colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => setView('rooms')}
            style={[styles.toggleBtn, view === 'rooms' && { backgroundColor: colors.tint }]}>
            <Ionicons name="home-outline" size={16} color={view === 'rooms' ? '#fff' : colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {view === 'grid' ? (
          <View style={styles.grid}>
            {filtered.map((plant) => (
              <Pressable
                key={plant.id}
                onPress={() => router.push(`/plant/${plant.id}`)}
                style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.gridPhoto, { backgroundColor: plant.avatarColor }]}>
                  {plant.photoUri ? (
                    <Image source={{ uri: plant.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  ) : (
                    <Text style={{ fontSize: 40 }}>{plant.emoji}</Text>
                  )}
                </View>
                <View style={styles.gridInfo}>
                  <Text style={[styles.plantName, { color: colors.text }]}>{plant.name}</Text>
                  <Text style={[styles.plantMeta, { color: colors.textSecondary }]}>{plant.species}</Text>
                  <Text
                    style={[
                      styles.plantMeta,
                      { color: plant.status === 'overdue' ? colors.accent : colors.textSecondary },
                    ]}>
                    {roomDisplayName(plant, t)} · {statusLabel(plant.status, plant.daysUntilWatering, t)}
                  </Text>
                  <View
                    style={[
                      styles.wateredButton,
                      { backgroundColor: plant.status === 'upcoming' ? colors.tint : colors.accent },
                    ]}>
                    <Text style={styles.wateredButtonText}>
                      {plant.status === 'upcoming' ? t.plants.watered : t.plants.water}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        ) : view === 'list' ? (
          <View style={{ gap: Spacing.two }}>
            {filtered.map((plant) => (
              <PlantListRow key={plant.id} plant={plant} colors={colors} t={t} onPress={() => router.push(`/plant/${plant.id}`)} />
            ))}
          </View>
        ) : (
          <View style={{ gap: Spacing.four }}>
            {roomSections.map((section) => (
              <View key={section.key} style={{ gap: Spacing.two }}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{section.label}</Text>
                {section.plants.map((plant) => (
                  <PlantListRow
                    key={plant.id}
                    plant={plant}
                    colors={colors}
                    t={t}
                    onPress={() => router.push(`/plant/${plant.id}`)}
                    showRoom={false}
                  />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  title: { fontSize: 28 },
  addButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  searchRow: { paddingHorizontal: Spacing.four, marginTop: Spacing.three },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 14 },
  countRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginTop: Spacing.three,
  },
  viewToggle: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 3, gap: 3 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  toggleBtn: { width: 30, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing.four, paddingBottom: Spacing.six },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  gridCard: { width: '48%', borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  gridPhoto: { height: 110, alignItems: 'center', justifyContent: 'center' },
  gridInfo: { padding: Spacing.two, gap: 2 },
  plantName: { fontSize: 15, fontWeight: '700' },
  plantMeta: { fontSize: 11 },
  wateredButton: { marginTop: 6, borderRadius: 12, paddingVertical: 7, alignItems: 'center' },
  wateredButtonText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.two,
  },
  listAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  listInfo: { flex: 1, gap: 1 },
  listNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
