import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, Spacing } from '@/constants/theme';
import { Translations } from '@/constants/translations';
import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/hooks/use-theme';
import { usePlants } from '@/context/plants-context';
import { CareTask, CareTaskType, Plant } from '@/data/plants';
import { daysUntilNext } from '@/utils/care';

const CARE_EMOJI: Record<CareTaskType, string> = { fertilize: '🌱', rotate: '🔄', mist: '💦', prune: '✂️', repot: '🪴' };

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

function dayLabel(offset: number, date: Date, t: Translations) {
  if (offset === 0) return t.calendar.today;
  if (offset === 1) return t.calendar.tomorrow;
  return `${t.calendar.weekdays[(date.getDay() + 6) % 7]} ${date.getDate()}`;
}

/** Whole days between today and a given year/month/day, positive for future,
 * negative for past — works for any month in view, not just the current one. */
function dayOffsetFromToday(today: Date, year: number, month: number, day: number) {
  const target = new Date(year, month, day).getTime();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((target - todayMidnight) / 86400000);
}

export default function CalendarScreen() {
  const colors = useTheme();
  const { t } = useLanguage();
  const { plants } = usePlants();
  const today = useMemo(() => new Date(), []);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const weeks = useMemo(() => buildGrid(year, month), [year, month]);
  const isCurrentMonth = monthOffset === 0;

  const changeMonth = (delta: number) => {
    setMonthOffset((m) => m + delta);
    setSelectedDay(null);
  };

  const dotsForDay = (day: number) => {
    const offset = dayOffsetFromToday(today, year, month, day);
    const future = plants.filter((p) => p.daysUntilWatering === offset).length;
    const past = offset <= 0 ? plants.filter((p) => -p.lastWateredDaysAgo === offset).length : 0;
    return Math.min(future + past, 3);
  };

  const selectedOffset = selectedDay != null ? dayOffsetFromToday(today, year, month, selectedDay) : null;

  const selectedWatering = useMemo(() => {
    if (selectedOffset == null) return [];
    return plants.filter((p) => p.daysUntilWatering === selectedOffset || -p.lastWateredDaysAgo === selectedOffset);
  }, [plants, selectedOffset]);

  const selectedTasks = useMemo(() => {
    if (selectedOffset == null) return [];
    const result: { plant: Plant; task: CareTask }[] = [];
    for (const p of plants) {
      for (const task of p.care) {
        const dueOffset = daysUntilNext(task.intervalDays, task.lastDoneDaysAgo);
        if (dueOffset === selectedOffset || -task.lastDoneDaysAgo === selectedOffset) {
          result.push({ plant: p, task });
        }
      }
    }
    return result;
  }, [plants, selectedOffset]);

  const weekAhead = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const scheduled = plants.filter((p) => p.daysUntilWatering === i);
    return { offset: i, date, scheduled };
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.serif }]}>{t.calendar.title}</Text>

        <View style={styles.monthHeader}>
          <Pressable
            onPress={() => changeMonth(-1)}
            style={[styles.navButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="chevron-back" size={18} color={colors.text} />
          </Pressable>
          <Text style={[styles.monthLabel, { color: colors.text }]}>
            {t.calendar.months[month]} {year}
          </Text>
          <Pressable
            onPress={() => changeMonth(1)}
            style={[styles.navButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
              const isToday = isCurrentMonth && day === today.getDate();
              const isSelected = day != null && selectedDay === day;
              const dots = day ? dotsForDay(day) : 0;
              return (
                <View key={di} style={styles.dayCell}>
                  {day && (
                    <Pressable onPress={() => setSelectedDay((d) => (d === day ? null : day))}>
                      <View
                        style={[
                          styles.dayCircle,
                          isToday && { backgroundColor: colors.tintMuted },
                          isSelected && { borderWidth: 2, borderColor: colors.tint },
                        ]}>
                        <Text style={[styles.dayText, { color: isToday ? colors.tint : colors.text }]}>{day}</Text>
                        <View style={styles.dotsRow}>
                          {Array.from({ length: dots }).map((_, i) => (
                            <View key={i} style={[styles.dot, { backgroundColor: colors.tint }]} />
                          ))}
                        </View>
                      </View>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colors.tint }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t.calendar.legendWatering}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendRing, { borderColor: colors.tint }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]}>{t.calendar.legendToday}</Text>
          </View>
        </View>

        {selectedDay != null && selectedOffset != null && (
          <View style={[styles.selectedCard, { backgroundColor: colors.card, borderColor: colors.tint }]}>
            <View style={styles.selectedHeader}>
              <Text style={[styles.weekDayLabel, { color: colors.text }]}>
                {dayLabel(selectedOffset, new Date(year, month, selectedDay), t)}
              </Text>
              <Pressable onPress={() => setSelectedDay(null)}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </Pressable>
            </View>
            {selectedWatering.length === 0 && selectedTasks.length === 0 ? (
              <Text style={[styles.nothingText, { color: colors.textSecondary }]}>{t.calendar.nothingScheduled}</Text>
            ) : (
              <View style={styles.chipRow}>
                {selectedWatering.map((p) => (
                  <View key={`w-${p.id}`} style={[styles.chip, { backgroundColor: colors.tintMuted }]}>
                    <Text style={[styles.chipText, { color: colors.tint }]}>💧 {p.name}</Text>
                  </View>
                ))}
                {selectedTasks.map(({ plant, task }, i) => (
                  <View key={`t-${plant.id}-${i}`} style={[styles.chip, { backgroundColor: colors.tintMuted }]}>
                    <Text style={[styles.chipText, { color: colors.tint }]}>
                      {CARE_EMOJI[task.type]} {t.plantDetail.care.taskNames[task.type]} · {plant.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.calendar.thisWeek}</Text>
        <View style={{ gap: Spacing.two }}>
          {weekAhead.map(({ offset, date, scheduled }) => (
            <View key={offset} style={[styles.weekRowCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.weekDayLabel, { color: colors.text }]}>{dayLabel(offset, date, t)}</Text>
              {scheduled.length > 0 ? (
                <View style={styles.chipRow}>
                  {scheduled.map((p) => (
                    <View key={p.id} style={[styles.chip, { backgroundColor: colors.tintMuted }]}>
                      <Text style={[styles.chipText, { color: colors.tint }]}>💧 {p.name}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.nothingText, { color: colors.textSecondary }]}>{t.calendar.nothingScheduled}</Text>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.two },
  title: { fontSize: 28, marginBottom: Spacing.two },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  monthLabel: { fontSize: 16, fontWeight: '700' },
  weekdayRow: { flexDirection: 'row', marginTop: Spacing.three },
  weekdayText: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600' },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dayCircle: { width: 38, height: 44, borderRadius: 19, alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: 4 },
  dayText: { fontSize: 13, fontWeight: '600' },
  dotsRow: { flexDirection: 'row', gap: 2, height: 5 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  legendRow: { flexDirection: 'row', gap: Spacing.three, marginTop: Spacing.two, marginBottom: Spacing.two },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendRing: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  legendText: { fontSize: 12 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: Spacing.two, marginBottom: Spacing.one },
  weekRowCard: { borderRadius: 14, borderWidth: 1, padding: Spacing.two, gap: 6 },
  selectedCard: { borderRadius: 14, borderWidth: 1.5, padding: Spacing.two, gap: 6, marginTop: Spacing.two },
  selectedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekDayLabel: { fontSize: 14, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  chipText: { fontSize: 11, fontWeight: '600' },
  nothingText: { fontSize: 12 },
});
