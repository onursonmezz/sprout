import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateField } from '@/components/date-field';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/context/theme-context';
import { useLanguage } from '@/context/language-context';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatTime(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(date: Date) {
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`;
}

function SectionCard({ children, colors }: { children: React.ReactNode; colors: ReturnType<typeof useTheme> }) {
  return <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>;
}

function Row({
  title,
  subtitle,
  colors,
  right,
  divider = true,
}: {
  title: string;
  subtitle?: string;
  colors: ReturnType<typeof useTheme>;
  right: React.ReactNode;
  divider?: boolean;
}) {
  return (
    <View style={[styles.row, divider && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={{ flex: 1, gap: 2, paddingRight: Spacing.two }}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        {subtitle && <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

function timeAt(hours: number, minutes: number) {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export default function SettingsScreen() {
  const colors = useTheme();
  const { mode, setMode } = useThemeMode();
  const { lang, setLang, t } = useLanguage();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState(() => timeAt(8, 0));
  const [quietStart, setQuietStart] = useState(() => timeAt(22, 0));
  const [quietEnd, setQuietEnd] = useState(() => timeAt(7, 0));
  const [seasonalAdjustment, setSeasonalAdjustment] = useState(true);
  const [vacationMode, setVacationMode] = useState(false);
  const [vacationStart, setVacationStart] = useState<Date | null>(null);
  const [vacationEnd, setVacationEnd] = useState<Date | null>(null);
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.serif }]}>{t.settings.title}</Text>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.settings.notifications}</Text>
        <SectionCard colors={colors}>
          <Row
            title={t.settings.enableNotifications}
            subtitle={t.settings.enableNotificationsSub}
            colors={colors}
            right={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: colors.backgroundSelected, true: colors.tint }}
                thumbColor="#fff"
              />
            }
          />
          <Row
            title={t.settings.reminderTime}
            subtitle={t.settings.reminderTimeSub}
            colors={colors}
            right={
              <DateField
                value={reminderTime}
                mode="time"
                onChange={setReminderTime}
                displayText={formatTime(reminderTime)}
                textColor={colors.text}
                backgroundColor={colors.backgroundSelected}
              />
            }
          />
          <Row
            title={t.settings.quietHours}
            subtitle={t.settings.quietHoursSub}
            colors={colors}
            divider={false}
            right={
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <DateField
                  value={quietStart}
                  mode="time"
                  onChange={setQuietStart}
                  displayText={formatTime(quietStart)}
                  textColor={colors.text}
                  backgroundColor={colors.backgroundSelected}
                />
                <DateField
                  value={quietEnd}
                  mode="time"
                  onChange={setQuietEnd}
                  displayText={formatTime(quietEnd)}
                  textColor={colors.text}
                  backgroundColor={colors.backgroundSelected}
                />
              </View>
            }
          />
        </SectionCard>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.settings.careSchedule}</Text>
        <SectionCard colors={colors}>
          <Row
            title={t.settings.seasonalAdjustment}
            subtitle={t.settings.seasonalAdjustmentSub}
            colors={colors}
            right={
              <Switch
                value={seasonalAdjustment}
                onValueChange={setSeasonalAdjustment}
                trackColor={{ false: colors.backgroundSelected, true: colors.tint }}
                thumbColor="#fff"
              />
            }
          />
          <Row
            title={t.settings.vacationMode}
            subtitle={t.settings.vacationModeSub}
            colors={colors}
            divider={vacationMode}
            right={
              <Switch
                value={vacationMode}
                onValueChange={setVacationMode}
                trackColor={{ false: colors.backgroundSelected, true: colors.tint }}
                thumbColor="#fff"
              />
            }
          />
          {vacationMode && (
            <View style={styles.vacationBlock}>
              <Text style={[styles.vacationNote, { color: colors.textSecondary }]}>{t.settings.vacationNote}</Text>
              <View style={styles.vacationDatesRow}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.vacationLabel, { color: colors.text }]}>{t.settings.vacationDepart}</Text>
                  <DateField
                    value={vacationStart}
                    mode="date"
                    onChange={setVacationStart}
                    displayText={vacationStart ? formatDate(vacationStart) : 'dd.mm.yyyy'}
                    textColor={colors.text}
                    backgroundColor={colors.background}
                  />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.vacationLabel, { color: colors.text }]}>{t.settings.vacationReturn}</Text>
                  <DateField
                    value={vacationEnd}
                    mode="date"
                    onChange={setVacationEnd}
                    displayText={vacationEnd ? formatDate(vacationEnd) : 'dd.mm.yyyy'}
                    textColor={colors.text}
                    backgroundColor={colors.background}
                  />
                </View>
              </View>
            </View>
          )}
        </SectionCard>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.settings.appearance}</Text>
        <SectionCard colors={colors}>
          <Row
            title={t.settings.darkMode}
            subtitle={t.settings.darkModeSub}
            colors={colors}
            right={
              <Switch
                value={mode === 'dark'}
                onValueChange={(v) => setMode(v ? 'dark' : 'light')}
                trackColor={{ false: colors.backgroundSelected, true: colors.tint }}
                thumbColor="#fff"
              />
            }
          />
          <Row
            title={t.settings.language}
            subtitle={t.settings.languageSub}
            colors={colors}
            right={
              <View style={[styles.segment, { backgroundColor: colors.backgroundSelected }]}>
                <Pressable
                  onPress={() => setLang('en')}
                  style={[styles.segmentBtn, lang === 'en' && { backgroundColor: colors.tint }]}>
                  <Text style={[styles.segmentText, { color: lang === 'en' ? '#fff' : colors.text }]}>
                    {t.settings.english}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setLang('tr')}
                  style={[styles.segmentBtn, lang === 'tr' && { backgroundColor: colors.tint }]}>
                  <Text style={[styles.segmentText, { color: lang === 'tr' ? '#fff' : colors.text }]}>
                    {t.settings.turkish}
                  </Text>
                </Pressable>
              </View>
            }
          />
          <Row
            title={t.settings.units}
            subtitle={t.settings.unitsSub}
            colors={colors}
            divider={false}
            right={
              <View style={[styles.segment, { backgroundColor: colors.backgroundSelected }]}>
                <Pressable
                  onPress={() => setUnits('metric')}
                  style={[styles.segmentBtn, units === 'metric' && { backgroundColor: colors.tint }]}>
                  <Text style={[styles.segmentText, { color: units === 'metric' ? '#fff' : colors.text }]}>
                    {t.settings.metric}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setUnits('imperial')}
                  style={[styles.segmentBtn, units === 'imperial' && { backgroundColor: colors.tint }]}>
                  <Text style={[styles.segmentText, { color: units === 'imperial' ? '#fff' : colors.text }]}>
                    {t.settings.imperial}
                  </Text>
                </Pressable>
              </View>
            }
          />
        </SectionCard>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.settings.data}</Text>
        <SectionCard colors={colors}>
          <Row
            title={t.settings.exportData}
            subtitle={t.settings.exportDataSub}
            colors={colors}
            right={<Text style={{ color: colors.textSecondary }}>›</Text>}
          />
          <Row
            title={t.settings.resetData}
            subtitle={t.settings.resetDataSub}
            colors={colors}
            divider={false}
            right={<Text style={{ color: colors.accent }}>›</Text>}
          />
        </SectionCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.one },
  title: { fontSize: 28, marginBottom: Spacing.two },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginTop: Spacing.three, marginBottom: Spacing.one },
  card: { borderRadius: 18, borderWidth: 1, paddingHorizontal: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.three },
  rowTitle: { fontSize: 14, fontWeight: '700' },
  rowSubtitle: { fontSize: 12 },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 3 },
  segmentBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  segmentText: { fontSize: 11, fontWeight: '700' },
  vacationBlock: { paddingBottom: Spacing.three, gap: Spacing.two },
  vacationNote: { fontSize: 12, lineHeight: 17 },
  vacationDatesRow: { flexDirection: 'row', gap: Spacing.two },
  vacationLabel: { fontSize: 12, fontWeight: '700' },
});
