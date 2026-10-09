import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard, GlowBackground, GradientButton, GradientFill, ProgressBar } from '@/components/glass';
import { PlantAvatar, PlantPhoto } from '@/components/plant-avatar';
import { ROOM_KEYS, roomDisplayName } from '@/constants/rooms';
import { FloatingTabBarSpace, Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/hooks/use-theme';
import { useWaterPlant } from '@/hooks/use-water-plant';
import { usePlants } from '@/context/plants-context';
import { Plant } from '@/data/plants';
import { Translations } from '@/constants/translations';

function statusLabel(status: string, days: number, t: Translations) {
  if (status === 'overdue') return t.plants.overdueDays(Math.abs(days));
  if (status === 'dueToday') return t.plants.dueToday;
  if (days === 1) return t.plants.tomorrow;
  return t.plants.inDays(days);
}

/** How far through its watering interval a plant is (1 = due now). */
function wateringProgress(plant: Plant) {
  const interval = Math.max(1, plant.customIntervalDays ?? plant.wateringIntervalDays);
  return (interval - plant.daysUntilWatering) / interval;
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
  const isOverdue = plant.status === 'overdue';
  return (
    <Pressable onPress={onPress}>
      <GlassCard style={styles.listRow}>
        <PlantAvatar plant={plant} size={56} radius={12} emojiSize={24} />
        <View style={styles.listInfo}>
          <Text style={[styles.plantName, { color: colors.text }]} numberOfLines={1}>
            {plant.name}
          </Text>
          <Text style={[styles.plantMeta, { color: colors.textSecondary }]} numberOfLines={1}>
            {showRoom ? `${plant.species} · ${roomDisplayName(plant, t)}` : plant.species}
          </Text>
          <Text style={[styles.status, { color: isOverdue ? colors.late : colors.tintBright }]}>
            {statusLabel(plant.status, plant.daysUntilWatering, t)}
          </Text>
          <ProgressBar progress={wateringProgress(plant)} late={isOverdue} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

export default function PlantsScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { plants } = usePlants();
  const handleWater = useWaterPlant();
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

  const dueCount = plants.filter((p) => p.status !== 'upcoming').length;
  const VIEWS = [
    { key: 'grid', icon: 'grid-outline' },
    { key: 'list', icon: 'list-outline' },
    { key: 'rooms', icon: 'home-outline' },
  ] as const;

  return (
    <View style={styles.safe}>
      <GlowBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>{t.plants.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.plants.subtitle(plants.length, dueCount)}</Text>
        </View>
        <Pressable onPress={() => router.push('/add-plant')}>
          <View style={[styles.addButton, { boxShadow: `0px 6px 18px ${colors.tintGlow}` }]}>
            <GradientFill stops={[colors.gradientFrom, colors.gradientTo]} />
            <Ionicons name="add" size={24} color={colors.onTint} />
          </View>
        </Pressable>
      </View>

      <View style={styles.searchRow}>
        <GlassCard style={styles.searchBox}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.plants.search}
            placeholderTextColor={colors.textSecondary}
            style={[styles.searchInput, { color: colors.text }]}
          />
        </GlassCard>
        <GlassCard style={styles.viewToggle}>
          {VIEWS.map(({ key, icon }) => (
            <Pressable key={key} onPress={() => setView(key)} style={styles.toggleBtn}>
              {view === key && <GradientFill stops={[colors.gradientFrom, colors.gradientTo]} />}
              <Ionicons name={icon} size={16} color={view === key ? colors.onTint : colors.textSecondary} />
            </Pressable>
          ))}
        </GlassCard>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {view === 'grid' ? (
          <View style={styles.grid}>
            {filtered.map((plant) => {
              const isOverdue = plant.status === 'overdue';
              return (
                <Pressable key={plant.id} onPress={() => router.push(`/plant/${plant.id}`)} style={styles.gridItem}>
                  <GlassCard style={styles.gridCard}>
                    <PlantPhoto plant={plant} height={104} />
                    {plant.status !== 'upcoming' && (
                      <View style={styles.waterBadgeWrap}>
                        <GradientButton label={t.plants.water} onPress={() => handleWater(plant)} style={styles.waterBadge} />
                      </View>
                    )}
                    <View style={styles.gridInfo}>
                      <Text style={[styles.plantName, { color: colors.text }]} numberOfLines={1}>
                        {plant.name}
                      </Text>
                      <Text style={[styles.plantMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        {plant.species}
                      </Text>
                      <Text style={[styles.status, { color: isOverdue ? colors.late : colors.tintBright }]}>
                        {statusLabel(plant.status, plant.daysUntilWatering, t)}
                      </Text>
                      <ProgressBar progress={wateringProgress(plant)} late={isOverdue} />
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })}
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
                <Text style={[styles.sectionLabel, { color: colors.text }]}>{section.label}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  addButton: { width: 42, height: 42, borderRadius: 21, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  searchRow: { flexDirection: 'row', gap: Spacing.two, paddingHorizontal: Spacing.three, marginTop: Spacing.three },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 14, height: 44 },
  searchInput: { flex: 1, fontSize: 14 },
  viewToggle: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, padding: 4, gap: 3, height: 44 },
  toggleBtn: { width: 34, height: 34, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: 16, fontWeight: '700' },
  scroll: { padding: Spacing.three, paddingBottom: FloatingTabBarSpace },
  // Two columns at any screen width: the cards take 48% each and the leftover
  // 4% becomes the gutter, instead of a fixed gap that can push the second
  // card onto its own row on narrow phones.
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  gridItem: { width: '48%' },
  gridCard: { overflow: 'hidden' },
  gridInfo: { padding: 10, paddingTop: 9 },
  waterBadgeWrap: { position: 'absolute', top: 8, right: 8 },
  waterBadge: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  plantName: { fontSize: 15, fontWeight: '700' },
  plantMeta: { fontSize: 11, marginTop: 1 },
  status: { fontSize: 11, fontWeight: '700', marginTop: 4, marginBottom: 6 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: Spacing.two },
  listInfo: { flex: 1 },
});
