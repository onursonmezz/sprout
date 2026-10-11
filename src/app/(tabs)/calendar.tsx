import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassCard, GlowBackground, GradientButton, GradientFill } from '@/components/glass';
import { PlantAvatar } from '@/components/plant-avatar';
import { FloatingTabBarSpace, Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { usePlants } from '@/context/plants-context';
import { careJournalType, CareTask, CareTaskType, Plant } from '@/data/plants';
import { useTheme } from '@/hooks/use-theme';
import { useWaterPlant } from '@/hooks/use-water-plant';
import { careTaskInSeason, daysUntilNext, fallsOn } from '@/utils/care';
import { hapticSuccess, hapticTap } from '@/utils/haptics';

const CARE_ICON: Record<CareTaskType, keyof typeof Ionicons.glyphMap> = {
  fertilize: 'flask-outline',
  rotate: 'sync-outline',
  mist: 'water-outline',
  prune: 'cut-outline',
  repot: 'flower-outline',
};

/** How far ahead "coming up" looks, and how many days with something it lists. */
const UPCOMING_HORIZON_DAYS = 28;
const UPCOMING_MAX_DAYS = 6;

type AgendaItem = { kind: 'water'; plant: Plant } | { kind: 'care'; plant: Plant; task: CareTask; index: number };

function buildGrid(year: number, month: number) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Whole days between today and a given year/month/day, positive for future,
 * negative for past — works for any month in view, not just the current one. */
function dayOffsetFromToday(today: Date, year: number, month: number, day: number) {
  const target = new Date(year, month, day).getTime();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((target - todayMidnight) / 86400000);
}

/** Whether a plant is (or was) watered on the day `offset` days from today:
 * future days are projected from its interval, past days come only from what
 * actually happened. */
function wateringOn(p: Plant, offset: number) {
  if (offset > 0) return fallsOn(offset, p.daysUntilWatering, p.wateringIntervalDays);
  if (offset === 0 && p.daysUntilWatering <= 0) return true;
  return p.lastWateredDaysAgo === -offset || p.journalNotes.some((e) => e.type === 'watered' && e.daysAgo === -offset);
}

function taskOn(p: Plant, task: CareTask, offset: number) {
  if (offset >= 0) {
    // Out-of-season fertilizing is not projected onto the calendar.
    const day = new Date();
    day.setDate(day.getDate() + offset);
    if (!careTaskInSeason(task, p, day)) return false;
  }
  const dueIn = daysUntilNext(task.intervalDays, task.lastDoneDaysAgo);
  if (offset > 0) return fallsOn(offset, dueIn, task.intervalDays);
  if (offset === 0 && dueIn <= 0) return true;
  return (
    task.lastDoneDaysAgo === -offset || p.journalNotes.some((e) => e.type === careJournalType[task.type] && e.daysAgo === -offset)
  );
}

/** Everything on one day: waterings first, then care tasks. */
function agendaFor(plants: Plant[], offset: number): AgendaItem[] {
  const items: AgendaItem[] = [];
  for (const plant of plants) if (wateringOn(plant, offset)) items.push({ kind: 'water', plant });
  for (const plant of plants) plant.care.forEach((task, index) => taskOn(plant, task, offset) && items.push({ kind: 'care', plant, task, index }));
  return items;
}

export default function CalendarScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { plants, completeCareTask } = usePlants();
  const waterPlant = useWaterPlant();
  const today = new Date();
  const [monthOffset, setMonthOffset] = useState(0);
  // The selected day, as days from today. Starts on today.
  const [selectedOffset, setSelectedOffset] = useState(0);

  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const weeks = useMemo(() => buildGrid(year, month), [year, month]);

  const selectedDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + selectedOffset);
  const agenda = agendaFor(plants, selectedOffset);

  // Only days that actually have something, so the list is never rows of "nothing planned".
  const upcoming = useMemo(() => {
    const days: { offset: number; date: Date; items: AgendaItem[] }[] = [];
    for (let offset = 1; offset <= UPCOMING_HORIZON_DAYS && days.length < UPCOMING_MAX_DAYS; offset++) {
      const items = agendaFor(plants, offset);
      if (items.length > 0) days.push({ offset, date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset), items });
    }
    return days;
    // `today` is a fresh Date every render; the plants are what changes the result.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plants]);

  const selectDay = (offset: number) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    setSelectedOffset(offset);
    setMonthOffset((date.getFullYear() - today.getFullYear()) * 12 + date.getMonth() - today.getMonth());
    hapticTap();
  };

  const longDate = (date: Date) => date.toLocaleDateString(t.today.dateLocale, { weekday: 'long', day: 'numeric', month: 'long' });
  const shortDate = (date: Date) => date.toLocaleDateString(t.today.dateLocale, { weekday: 'short', day: 'numeric', month: 'short' });
  const relativeLabel = (offset: number) => (offset === 0 ? t.calendar.today : offset === 1 ? t.calendar.tomorrow : null);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <GlowBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>{t.calendar.title}</Text>
          {(selectedOffset !== 0 || monthOffset !== 0) && (
            <Pressable onPress={() => selectDay(0)} style={[styles.todayButton, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
              <Ionicons name="today-outline" size={15} color={colors.tintBright} />
              <Text style={[styles.todayButtonText, { color: colors.text }]}>{t.calendar.today}</Text>
            </Pressable>
          )}
        </View>

        <GlassCard style={styles.monthCard}>
          <View style={styles.monthHeader}>
            <Pressable onPress={() => setMonthOffset((m) => m - 1)} hitSlop={8} style={[styles.navButton, { backgroundColor: colors.track }]}>
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </Pressable>
            <Text style={[styles.monthLabel, { color: colors.text }]}>
              {t.calendar.months[month]} {year}
            </Text>
            <Pressable onPress={() => setMonthOffset((m) => m + 1)} hitSlop={8} style={[styles.navButton, { backgroundColor: colors.track }]}>
              <Ionicons name="chevron-forward" size={18} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {t.calendar.weekdays.map((w) => (
              <Text key={w} style={[styles.weekdayText, { color: colors.textSecondary }]}>
                {w}
              </Text>
            ))}
          </View>

          {weeks.map((week, wi) => (
            <View key={wi} style={styles.weekRow}>
              {week.map((day, di) => {
                if (!day) return <View key={di} style={styles.dayCell} />;
                const offset = dayOffsetFromToday(today, year, month, day);
                const isToday = offset === 0;
                const isSelected = offset === selectedOffset;
                const items = agendaFor(plants, offset);
                const hasWater = items.some((i) => i.kind === 'water');
                const hasCare = items.some((i) => i.kind === 'care');
                return (
                  <Pressable key={di} onPress={() => selectDay(offset)} style={styles.dayCell}>
                    <View style={[styles.dayCircle, isToday && !isSelected && { borderWidth: 1.5, borderColor: colors.tintBright }]}>
                      {isSelected && <GradientFill stops={[colors.gradientFrom, colors.gradientTo]} />}
                      <Text
                        style={[
                          styles.dayText,
                          { color: isSelected ? colors.onTint : offset < 0 ? colors.textSecondary : colors.text },
                          (isToday || isSelected) && { fontWeight: '700' },
                        ]}>
                        {day}
                      </Text>
                    </View>
                    <View style={styles.dotsRow}>
                      {hasWater && <View style={[styles.dot, { backgroundColor: colors.tintBright }]} />}
                      {hasCare && <View style={[styles.dot, { backgroundColor: colors.accent }]} />}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.tintBright }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t.calendar.watering}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t.calendar.care}</Text>
            </View>
          </View>
        </GlassCard>

        <View style={styles.dayHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{longDate(selectedDate)}</Text>
          {relativeLabel(selectedOffset) && (
            <View style={[styles.badge, { backgroundColor: colors.track }]}>
              <Text style={[styles.badgeText, { color: colors.tintBright }]}>{relativeLabel(selectedOffset)}</Text>
            </View>
          )}
        </View>

        {agenda.length === 0 ? (
          <GlassCard style={styles.emptyCard}>
            <Ionicons name="leaf-outline" size={20} color={colors.tintBright} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.calendar.nothingDay}</Text>
          </GlassCard>
        ) : (
          <View style={{ gap: Spacing.two }}>
            {agenda.map((item) => {
              const { plant } = item;
              const isWater = item.kind === 'water';
              return (
                <Pressable key={`${item.kind}-${plant.id}-${isWater ? '' : item.index}`} onPress={() => router.push(`/plant/${plant.id}`)}>
                  <GlassCard style={styles.agendaRow}>
                    <PlantAvatar plant={plant} size={52} radius={12} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.plantName, { color: colors.text }]} numberOfLines={1}>
                        {plant.name}
                      </Text>
                      <View style={styles.taskLine}>
                        <Ionicons
                          name={isWater ? 'water-outline' : CARE_ICON[item.task.type]}
                          size={14}
                          color={isWater ? colors.tintBright : colors.accent}
                        />
                        <Text style={[styles.taskText, { color: colors.textSecondary }]} numberOfLines={1}>
                          {isWater
                            ? `${t.calendar.watering} · ${t.water.approx(plant.wateringAmountMl)}`
                            : t.plantDetail.care.taskNames[item.task.type]}
                        </Text>
                      </View>
                    </View>
                    {/* Past days show what was done; today offers the action; future days are just a plan. */}
                    {selectedOffset < 0 && <Ionicons name="checkmark-circle" size={22} color={colors.tintBright} />}
                    {selectedOffset === 0 &&
                      (isWater ? (
                        <GradientButton label={t.today.water} onPress={() => waterPlant(plant)} />
                      ) : (
                        <GradientButton
                          label={t.today.careDone}
                          onPress={() => {
                            completeCareTask(plant.id, item.index, t.plantDetail.care.taskNames[item.task.type]);
                            hapticSuccess();
                          }}
                        />
                      ))}
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>
        )}

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: Spacing.two }]}>{t.calendar.upcoming}</Text>
        {upcoming.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{t.calendar.nothingUpcoming}</Text>
        ) : (
          <View style={{ gap: Spacing.two }}>
            {upcoming.map(({ offset, date, items }) => {
              // One photo per plant, even if it has several tasks that day.
              const dayPlants = items.map((i) => i.plant).filter((p, i, all) => all.findIndex((q) => q.id === p.id) === i);
              const waterCount = items.filter((i) => i.kind === 'water').length;
              const careCount = items.length - waterCount;
              return (
                <Pressable key={offset} onPress={() => selectDay(offset)}>
                  <GlassCard style={[styles.upcomingRow, offset === selectedOffset && { borderColor: colors.tintBright }]}>
                    <View style={styles.upcomingDate}>
                      <Text style={[styles.upcomingDay, { color: colors.text }]}>{relativeLabel(offset) ?? shortDate(date)}</Text>
                      <Text style={[styles.upcomingSummary, { color: colors.textSecondary }]}>{t.calendar.summary(waterCount, careCount)}</Text>
                    </View>
                    <View style={styles.avatars}>
                      {dayPlants.slice(0, 4).map((p, i) => (
                        <View key={p.id} style={[styles.avatarWrap, { borderColor: colors.card, marginLeft: i === 0 ? 0 : -10 }]}>
                          <PlantAvatar plant={p} size={34} />
                        </View>
                      ))}
                      {dayPlants.length > 4 && (
                        <View style={[styles.avatarWrap, styles.moreAvatar, { borderColor: colors.card, backgroundColor: colors.backgroundSelected }]}>
                          <Text style={[styles.moreText, { color: colors.text }]}>+{dayPlants.length - 4}</Text>
                        </View>
                      )}
                    </View>
                  </GlassCard>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.three, paddingBottom: FloatingTabBarSpace, gap: Spacing.three },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '700' },
  todayButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7 },
  todayButtonText: { fontSize: 12, fontWeight: '700' },
  monthCard: { padding: 12, paddingBottom: 10 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.two },
  navButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 16, fontWeight: '700' },
  weekdayRow: { flexDirection: 'row', marginBottom: 2 },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 3, minHeight: 46 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dayText: { fontSize: 13, fontWeight: '500' },
  dotsRow: { flexDirection: 'row', gap: 3, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.three, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendText: { fontSize: 11 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.one },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  emptyCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: Spacing.three },
  emptyText: { flex: 1, fontSize: 13 },
  agendaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: Spacing.two },
  plantName: { fontSize: 15, fontWeight: '700' },
  taskLine: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  taskText: { fontSize: 12, flexShrink: 1 },
  upcomingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16 },
  upcomingDate: { flex: 1 },
  upcomingDay: { fontSize: 14, fontWeight: '700' },
  upcomingSummary: { fontSize: 12, marginTop: 2 },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  avatarWrap: { borderWidth: 2, borderRadius: 19 },
  moreAvatar: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', marginLeft: -10 },
  moreText: { fontSize: 11, fontWeight: '700' },
});
