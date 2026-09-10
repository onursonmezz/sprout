import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usePlants } from '@/context/plants-context';
import { useLanguage } from '@/context/language-context';

const TAB_KEYS = ['overview', 'care', 'journal', 'history'] as const;

function watchingText(status: string, days: number, t: ReturnType<typeof useLanguage>['t']) {
  if (status === 'overdue') return t.plantDetail.daysOverdue(Math.abs(days));
  if (status === 'dueToday') return t.plantDetail.dueToday;
  return t.plantDetail.inDays(days);
}

export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();
  const { t } = useLanguage();
  const { getPlant } = usePlants();
  const plant = getPlant(String(id));
  const [tab, setTab] = useState<(typeof TAB_KEYS)[number]>('overview');

  const tabLabels: Record<(typeof TAB_KEYS)[number], string> = {
    overview: t.plantDetail.tabOverview,
    care: t.plantDetail.tabCare,
    journal: t.plantDetail.tabJournal,
    history: t.plantDetail.tabHistory,
  };

  if (!plant) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.text }}>{t.plantDetail.notFound}</Text>
      </View>
    );
  }

  const isOverdue = plant.status === 'overdue';
  const isDueToday = plant.status === 'dueToday';
  const statusColor = isOverdue || isDueToday ? colors.accent : colors.tint;

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: plant.avatarColor }]}>
          <View style={styles.heroTopRow}>
            <Pressable onPress={() => router.back()} style={styles.heroButton}>
              <Ionicons name="arrow-back" size={20} color="#1E2A22" />
            </Pressable>
            <Pressable style={styles.heroButton}>
              <Text style={styles.heroButtonText}>{t.plantDetail.edit}</Text>
            </Pressable>
          </View>
          <Text style={styles.heroEmoji}>{plant.emoji}</Text>
          <View style={styles.heroTextWrap}>
            <Text style={[styles.heroName, { fontFamily: Fonts.serif }]}>{plant.name}</Text>
            <Text style={styles.heroSpecies}>{plant.species}</Text>
            <Text style={styles.heroLatin}>{plant.latinName}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View
            style={[
              styles.nextWateringCard,
              { backgroundColor: isOverdue || isDueToday ? colors.accentMuted : colors.tintMuted, borderColor: statusColor },
            ]}>
            <View style={[styles.ring, { borderColor: statusColor }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.nextWateringLabel, { color: colors.textSecondary }]}>{t.plantDetail.nextWatering}</Text>
              <Text style={[styles.nextWateringValue, { color: statusColor }]}>
                {watchingText(plant.status, plant.daysUntilWatering, t)}
              </Text>
              <Text style={[styles.nextWateringMeta, { color: colors.textSecondary }]}>
                {t.plantDetail.lastWatered(plant.lastWateredDaysAgo, plant.wateringAmountMl)}
              </Text>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <Pressable style={[styles.waterButton, { backgroundColor: colors.accent }]}>
              <Text style={styles.waterButtonText}>{t.plantDetail.waterNow}</Text>
            </Pressable>
            <Pressable style={[styles.snoozeButton, { backgroundColor: colors.backgroundSelected }]}>
              <Text style={[styles.snoozeText, { color: colors.textSecondary }]}>{t.plantDetail.snooze}</Text>
            </Pressable>
          </View>

          <View style={[styles.tabRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {TAB_KEYS.map((key) => (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.tabButton, tab === key && { backgroundColor: colors.tint }]}>
                <Text style={[styles.tabText, { color: tab === key ? '#fff' : colors.textSecondary }]}>
                  {tabLabels[key]}
                </Text>
              </Pressable>
            ))}
          </View>

          {tab === 'overview' ? (
            <>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.plantDetail.environment}</Text>
              <View style={styles.chipGrid}>
                <InfoChip label={t.plantDetail.room} value={plant.room} colors={colors} />
                <InfoChip label={t.plantDetail.light} value={plant.environment.light} colors={colors} />
                <InfoChip label={t.plantDetail.window} value={plant.environment.window} colors={colors} />
                <InfoChip label={t.plantDetail.hours} value={plant.environment.hoursLight} colors={colors} />
                <InfoChip label={t.plantDetail.humidity} value={plant.environment.humidity} colors={colors} />
                <InfoChip label={t.plantDetail.temp} value={plant.environment.tempC} colors={colors} />
              </View>

              <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Spacing.three }]}>
                {t.plantDetail.potSoil}
              </Text>
              <View style={styles.chipGrid}>
                <InfoChip label={t.plantDetail.potSize} value={plant.pot.size} colors={colors} />
                <InfoChip label={t.plantDetail.material} value={plant.pot.material} colors={colors} />
                <InfoChip label={t.plantDetail.drainage} value={plant.pot.drainage} colors={colors} />
                <InfoChip label={t.plantDetail.soil} value={plant.pot.soil} colors={colors} wide />
                <InfoChip label={t.plantDetail.acquired} value={plant.acquiredDate} colors={colors} wide />
              </View>
            </>
          ) : (
            <View style={styles.placeholder}>
              <Text style={{ color: colors.textSecondary }}>{t.plantDetail.comingSoon(tabLabels[tab])}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoChip({
  label,
  value,
  colors,
  wide,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>;
  wide?: boolean;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: colors.tintMuted }, wide && styles.chipWide]}>
      <Text style={[styles.chipLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.chipValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  hero: { height: 260, paddingTop: 56, paddingHorizontal: Spacing.four, justifyContent: 'flex-end' },
  heroTopRow: {
    position: 'absolute',
    top: 56,
    left: Spacing.three,
    right: Spacing.three,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroButton: { backgroundColor: 'rgba(255,255,255,0.7)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16 },
  heroButtonText: { fontWeight: '700', color: '#1E2A22' },
  heroEmoji: { position: 'absolute', right: 24, top: 90, fontSize: 64, opacity: 0.7 },
  heroTextWrap: { paddingBottom: Spacing.three },
  heroName: { fontSize: 30, color: '#1E2A22' },
  heroSpecies: { fontSize: 15, color: '#3A4A3E', fontWeight: '600' },
  heroLatin: { fontSize: 12, color: '#4C5C50', fontStyle: 'italic' },
  body: { padding: Spacing.four, gap: Spacing.three },
  nextWateringCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: Spacing.three,
  },
  ring: { width: 44, height: 44, borderRadius: 22, borderWidth: 4 },
  nextWateringLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  nextWateringValue: { fontSize: 18, fontWeight: '700' },
  nextWateringMeta: { fontSize: 12, marginTop: 2 },
  actionsRow: { flexDirection: 'row', gap: Spacing.two },
  waterButton: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  waterButtonText: { color: '#fff', fontWeight: '700' },
  snoozeButton: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center' },
  snoozeText: { fontWeight: '600' },
  tabRow: { flexDirection: 'row', borderRadius: 16, borderWidth: 1, padding: 4, gap: 4 },
  tabButton: { flex: 1, paddingVertical: 8, borderRadius: 12, alignItems: 'center' },
  tabText: { fontSize: 12, fontWeight: '700' },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { width: '31%', borderRadius: 14, padding: Spacing.two, gap: 2 },
  chipWide: { width: '48%' },
  chipLabel: { fontSize: 10, fontWeight: '600' },
  chipValue: { fontSize: 13, fontWeight: '700' },
  placeholder: { alignItems: 'center', paddingVertical: Spacing.six },
});
