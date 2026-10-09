import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard, GlowBackground, GradientButton, GradientFill, ProgressBar } from '@/components/glass';
import { PlantAvatar, PlantPhoto } from '@/components/plant-avatar';
import { roomDisplayName } from '@/constants/rooms';
import { FloatingTabBarSpace, Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/hooks/use-theme';
import { useWaterPlant } from '@/hooks/use-water-plant';
import { usePlants } from '@/context/plants-context';
import { useSettings } from '@/context/settings-context';
import { CareTaskType, Plant } from '@/data/plants';
import { daysUntilNext } from '@/utils/care';
import { hapticSuccess, hapticTap } from '@/utils/haptics';
import { computeCareStats } from '@/utils/stats';

const CARE_ICON: Record<CareTaskType, keyof typeof Ionicons.glyphMap> = {
  fertilize: 'flask-outline',
  rotate: 'sync-outline',
  mist: 'water-outline',
  prune: 'cut-outline',
  repot: 'flower-outline',
};

function greeting(t: ReturnType<typeof useLanguage>['t']) {
  const hour = new Date().getHours();
  if (hour < 12) return t.today.greetingMorning;
  if (hour < 18) return t.today.greetingAfternoon;
  return t.today.greetingEvening;
}

function formatDayLength(hours: number, t: ReturnType<typeof useLanguage>['t']) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return t.today.dayLength(h, m);
}

/** How far through its watering interval a plant is (1 = due now). */
function wateringProgress(plant: Plant) {
  const interval = Math.max(1, plant.customIntervalDays ?? plant.wateringIntervalDays);
  return (interval - plant.daysUntilWatering) / interval;
}

export default function TodayScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { plants, snoozePlant, completeCareTask } = usePlants();
  const handleWater = useWaterPlant();
  const { dayLengthHours, vacationMode, vacationStart, vacationEnd } = useSettings();

  const todayLabel = new Date().toLocaleDateString(t.today.dateLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Vacation days, as days-ago, so they neither break the streak nor go unexplained.
  const dayDiff = (d: Date) => {
    const now = new Date();
    return Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
  };
  const awayFrom = vacationStart ? dayDiff(vacationStart) : null;
  const awayTo = vacationEnd ? dayDiff(vacationEnd) : null;
  const onVacation = vacationMode && awayFrom != null && awayTo != null && awayFrom >= 0 && awayTo <= 0;
  const justBack = !vacationMode && awayTo != null && awayTo > 0 && awayTo <= 3;
  const { streak, thisMonth } = useMemo(
    // One extra day after the return date: time to catch up before the streak can break.
    () => computeCareStats(plants, awayFrom != null && awayTo != null ? { fromDaysAgo: awayFrom, toDaysAgo: awayTo - 1 } : null),
    [plants, awayFrom, awayTo]
  );

  const handleSnooze = (plantId: string) => {
    snoozePlant(plantId);
    hapticTap();
  };

  const needsAttention = useMemo(
    () =>
      plants
        .filter((p) => p.status === 'overdue' || p.status === 'dueToday')
        .sort((a, b) => a.daysUntilWatering - b.daysUntilWatering),
    [plants]
  );
  const comingUp = useMemo(
    () =>
      plants
        .filter((p) => p.status === 'upcoming' && p.daysUntilWatering <= 7)
        .sort((a, b) => a.daysUntilWatering - b.daysUntilWatering),
    [plants]
  );
  const careDue = useMemo(
    () =>
      plants.flatMap((plant) =>
        plant.care
          .map((task, index) => ({ plant, task, index }))
          .filter(({ task }) => daysUntilNext(task.intervalDays, task.lastDoneDaysAgo) <= 0)
      ),
    [plants]
  );

  const needsAttentionCount = needsAttention.length;
  const heroPlant = needsAttention[0] ?? comingUp[0] ?? plants[0];

  return (
    <View style={styles.safe}>
      <GlowBackground />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.topRow}>
            <View style={styles.logo}>
              <GradientFill stops={[colors.gradientFrom, colors.gradientTo]} />
              <Ionicons name="leaf" size={20} color={colors.onTint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: colors.text }]}>
                {greeting(t)}, <Text style={{ color: colors.tintBright }}>{t.today.howArePlants}</Text>
              </Text>
              <Text style={[styles.date, { color: colors.textSecondary }]}>{todayLabel}</Text>
            </View>
            <Pressable onPress={() => router.push('/light-meter')} accessibilityLabel={t.today.lightMeterCardTitle}>
              <GlassCard style={styles.roundButton}>
                <Ionicons name="sunny-outline" size={19} color={colors.text} />
              </GlassCard>
            </Pressable>
          </View>

          {dayLengthHours != null && (
            <GlassCard style={styles.dayLengthChip}>
              <Ionicons name="sunny" size={13} color={colors.late} />
              <Text style={[styles.dayLength, { color: colors.textSecondary }]}>{formatDayLength(dayLengthHours, t)}</Text>
            </GlassCard>
          )}

          {(onVacation || (justBack && needsAttentionCount > 0)) && (
            <GlassCard style={styles.vacationCard}>
              <Ionicons name={onVacation ? 'airplane-outline' : 'home-outline'} size={20} color={colors.tintBright} />
              <Text style={[styles.vacationText, { color: colors.text }]}>
                {onVacation && vacationEnd
                  ? t.today.vacationOn(vacationEnd.toLocaleDateString(t.today.dateLocale, { day: 'numeric', month: 'long' }))
                  : t.today.vacationBack(needsAttentionCount)}
              </Text>
            </GlassCard>
          )}

          <View style={[styles.hero, { boxShadow: `0px 14px 30px ${colors.shadow}` }]}>
            <GradientFill stops={[colors.heroFrom, colors.heroMid, colors.heroTo]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroTitle, { color: colors.onHero }]}>
                {needsAttention.length > 0 ? t.today.heroWaiting(needsAttention.length) : t.today.heroAllGood}
              </Text>
              <Text style={[styles.heroSub, { color: colors.onHero }]}>{t.today.heroSub(plants.length, streak)}</Text>
            </View>
            {heroPlant && (
              <View style={styles.heroPhoto}>
                <PlantAvatar plant={heroPlant} size={92} radius={16} />
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <Stat value={String(plants.length)} label={t.today.plantsAlive} />
            <Stat value={String(streak)} label={t.today.dayStreak} />
            <Stat value={String(thisMonth)} label={t.today.thisMonth} />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.today.needsAttention}</Text>
          <View style={{ gap: Spacing.two }}>
            {needsAttention.length === 0 && (
              <GlassCard style={styles.emptyCard}>
                <Ionicons name="checkmark-circle-outline" size={22} color={colors.tintBright} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.today.noAttentionNeeded}</Text>
              </GlassCard>
            )}
            {needsAttention.map((plant) => {
              const isOverdue = plant.status === 'overdue';
              return (
                <Pressable key={plant.id} onPress={() => router.push(`/plant/${plant.id}`)}>
                  <GlassCard style={styles.attentionCard}>
                    <PlantAvatar plant={plant} size={72} radius={13} />
                    <View style={styles.attentionInfo}>
                      <Text style={[styles.plantName, { color: colors.text }]} numberOfLines={1}>
                        {plant.name}
                      </Text>
                      <Text style={[styles.plantMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                        {roomDisplayName(plant, t)} · {t.water.approx(plant.wateringAmountMl)}
                      </Text>
                      <Text style={[styles.status, { color: isOverdue ? colors.late : colors.tintBright }]}>
                        {isOverdue ? t.today.daysLate(Math.abs(plant.daysUntilWatering)) : t.today.dueToday}
                      </Text>
                      <ProgressBar progress={1} late={isOverdue} />
                    </View>
                    <View style={styles.attentionActions}>
                      <GradientButton label={t.today.water} onPress={() => handleWater(plant)} />
                      <Pressable onPress={() => handleSnooze(plant.id)} style={[styles.snoozeButton, { borderColor: colors.glassBorder }]}>
                        <Text style={[styles.snoozeText, { color: colors.textSecondary }]}>{t.today.snooze}</Text>
                      </Pressable>
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>

          {careDue.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.today.careDue}</Text>
              <View style={{ gap: Spacing.two }}>
                {careDue.map(({ plant, task, index }) => (
                  <Pressable key={`${plant.id}-${index}`} onPress={() => router.push(`/plant/${plant.id}`)}>
                    <GlassCard style={styles.careRow}>
                      <View style={[styles.careIcon, { backgroundColor: colors.track }]}>
                        <Ionicons name={CARE_ICON[task.type]} size={18} color={colors.tintBright} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.plantName, { color: colors.text }]}>{t.plantDetail.care.taskNames[task.type]}</Text>
                        <Text style={[styles.plantMeta, { color: colors.textSecondary }]}>{plant.name}</Text>
                      </View>
                      <GradientButton
                        label={t.today.careDone}
                        onPress={() => {
                          completeCareTask(plant.id, index, t.plantDetail.care.taskNames[task.type]);
                          hapticSuccess();
                        }}
                      />
                    </GlassCard>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.today.comingUp}</Text>
          {comingUp.length === 0 && (
            <Text style={[styles.plantMeta, { color: colors.textSecondary }]}>{t.today.nothingThisWeek}</Text>
          )}
          <View style={styles.grid}>
            {comingUp.map((plant) => (
              <Pressable key={plant.id} onPress={() => router.push(`/plant/${plant.id}`)} style={styles.gridItem}>
                <GlassCard style={styles.tile}>
                  <PlantPhoto plant={plant} height={92} emojiSize={38} />
                  <View style={styles.tileInfo}>
                    <Text style={[styles.plantName, { color: colors.text }]} numberOfLines={1}>
                      {plant.name}
                    </Text>
                    <Text style={[styles.status, { color: colors.tintBright }]}>
                      {plant.daysUntilWatering === 1 ? t.today.tomorrow : t.today.inDays(plant.daysUntilWatering)}
                    </Text>
                    <ProgressBar progress={wateringProgress(plant)} />
                  </View>
                </GlassCard>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  const colors = useTheme();
  return (
    <GlassCard style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.three, paddingBottom: FloatingTabBarSpace, gap: Spacing.three },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: 16, fontWeight: '700' },
  date: { fontSize: 12, marginTop: 1 },
  roundButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  dayLengthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  dayLength: { fontSize: 12, fontWeight: '500' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, padding: Spacing.three, overflow: 'hidden' },
  heroTitle: { fontSize: 25, lineHeight: 28, fontWeight: '700' },
  heroSub: { fontSize: 12, marginTop: 6, opacity: 0.85 },
  heroPhoto: { borderRadius: 16, boxShadow: '0px 8px 20px rgba(0,0,0,0.3)' },
  statsRow: { flexDirection: 'row', gap: Spacing.two },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 2, borderRadius: 16 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: Spacing.one },
  vacationCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16 },
  vacationText: { flex: 1, fontSize: 13, lineHeight: 18 },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three },
  emptyText: { fontSize: 13, flex: 1 },
  attentionCard: { flexDirection: 'row', alignItems: 'center', padding: Spacing.two, gap: 12 },
  attentionInfo: { flex: 1, gap: 2 },
  attentionActions: { gap: 6, alignItems: 'stretch' },
  plantName: { fontSize: 15, fontWeight: '700' },
  plantMeta: { fontSize: 12 },
  status: { fontSize: 11, fontWeight: '700', marginBottom: 5 },
  snoozeButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  snoozeText: { fontSize: 11, fontWeight: '600' },
  careRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.two, borderRadius: 16 },
  careIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  // Two columns at any screen width: the cards take 48% each and the leftover
  // 4% becomes the gutter, instead of a fixed gap that can push the second
  // card onto its own row on narrow phones.
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  gridItem: { width: '48%' },
  tile: { overflow: 'hidden' },
  tileInfo: { padding: 10, paddingTop: 9 },
});
