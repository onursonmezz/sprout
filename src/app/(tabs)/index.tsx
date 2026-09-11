import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PlantAvatar } from '@/components/plant-avatar';
import { Fonts, Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/hooks/use-theme';
import { usePlants } from '@/context/plants-context';

function greeting(t: ReturnType<typeof useLanguage>['t']) {
  const hour = new Date().getHours();
  if (hour < 12) return t.today.greetingMorning;
  if (hour < 18) return t.today.greetingAfternoon;
  return t.today.greetingEvening;
}

export default function TodayScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { plants, waterPlant, snoozePlant } = usePlants();

  const todayLabel = new Date().toLocaleDateString(t.today.dateLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const needsAttention = useMemo(
    () =>
      plants
        .filter((p) => p.status === 'overdue' || p.status === 'dueToday')
        .sort((a, b) => a.daysUntilWatering - b.daysUntilWatering),
    [plants]
  );
  const comingUp = useMemo(
    () => plants.filter((p) => p.status === 'upcoming').sort((a, b) => a.daysUntilWatering - b.daysUntilWatering),
    [plants]
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.date, { color: colors.textSecondary }]}>{todayLabel}</Text>
        <Text style={[styles.greeting, { color: colors.text, fontFamily: Fonts.serif }]}>
          {greeting(t)},{'\n'}
          <Text style={{ color: colors.tint }}>{t.today.howArePlants}</Text>
        </Text>

        <View style={[styles.statsRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Stat value={String(plants.length)} label={t.today.plantsAlive} colors={colors} />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <Stat value="12" label={t.today.dayStreak} colors={colors} />
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <Stat value="4" label={t.today.thisMonth} colors={colors} />
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.today.needsAttention}</Text>
        <View style={{ gap: Spacing.two }}>
          {needsAttention.map((plant) => {
            const isOverdue = plant.status === 'overdue';
            return (
              <Pressable
                key={plant.id}
                onPress={() => router.push(`/plant/${plant.id}`)}
                style={[
                  styles.attentionCard,
                  {
                    backgroundColor: isOverdue ? colors.accentMuted : colors.card,
                    borderColor: isOverdue ? colors.accent : colors.border,
                  },
                ]}>
                <PlantAvatar plant={plant} size={52} />
                <View style={styles.attentionInfo}>
                  <View style={styles.attentionNameRow}>
                    <Text style={[styles.plantName, { color: colors.text }]}>{plant.name}</Text>
                    {isOverdue && (
                      <View style={[styles.badge, { backgroundColor: colors.accent }]}>
                        <Text style={styles.badgeText}>{t.today.daysLate(Math.abs(plant.daysUntilWatering))}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.plantMeta, { color: colors.textSecondary }]}>{plant.species}</Text>
                  <Text style={[styles.plantMeta, { color: colors.textSecondary }]}>
                    {plant.room} · {plant.wateringAmountMl}ml
                  </Text>
                </View>
                <View style={styles.attentionActions}>
                  <Pressable
                    onPress={() => waterPlant(plant.id)}
                    style={[styles.wateredButton, { backgroundColor: colors.accent }]}>
                    <Text style={styles.wateredButtonText}>{t.today.water}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => snoozePlant(plant.id)}
                    style={[styles.snoozeButton, { backgroundColor: colors.backgroundSelected }]}>
                    <Text style={[styles.snoozeText, { color: colors.textSecondary }]}>{t.today.snooze}</Text>
                  </Pressable>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: Spacing.four }]}>
          {t.today.comingUp}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
          {comingUp.map((plant) => (
            <Pressable
              key={plant.id}
              onPress={() => router.push(`/plant/${plant.id}`)}
              style={[styles.upcomingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <PlantAvatar plant={plant} size={48} />
              <Text style={[styles.plantName, { color: colors.text }]}>{plant.name}</Text>
              <Text style={[styles.upcomingDays, { color: colors.tint }]}>
                {plant.daysUntilWatering === 1 ? t.today.tomorrow : t.today.inDays(plant.daysUntilWatering)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, colors }: { value: string; label: string; colors: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.text, fontFamily: Fonts.serif }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.three },
  date: { fontSize: 13, fontWeight: '600' },
  greeting: { fontSize: 30, lineHeight: 36, marginBottom: Spacing.two },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    marginBottom: Spacing.two,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1 },
  statValue: { fontSize: 22, fontWeight: '700' },
  statLabel: { fontSize: 11, textAlign: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: Spacing.one },
  attentionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: Spacing.two,
    gap: Spacing.two,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarEmoji: { fontSize: 22 },
  attentionInfo: { flex: 1, gap: 1 },
  attentionNameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  plantName: { fontSize: 15, fontWeight: '700' },
  plantMeta: { fontSize: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  attentionActions: { gap: 6, alignItems: 'flex-end' },
  wateredButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 },
  wateredButtonText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  snoozeButton: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
  snoozeText: { fontSize: 11, fontWeight: '600' },
  upcomingCard: {
    width: 92,
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.two,
    alignItems: 'center',
    gap: 4,
  },
  upcomingAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  upcomingDays: { fontSize: 11, fontWeight: '700' },
});
