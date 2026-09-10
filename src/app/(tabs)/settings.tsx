import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/context/theme-context';
import { useLanguage } from '@/context/language-context';

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

function TimePill({ value, colors }: { value: string; colors: ReturnType<typeof useTheme> }) {
  return (
    <Pressable style={[styles.pill, { backgroundColor: colors.backgroundSelected }]}>
      <Text style={[styles.pillText, { color: colors.text }]}>{value}</Text>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const colors = useTheme();
  const { mode, setMode } = useThemeMode();
  const { lang, setLang, t } = useLanguage();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [seasonalAdjustment, setSeasonalAdjustment] = useState(true);
  const [vacationMode, setVacationMode] = useState(false);
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
            right={<TimePill value="08:00" colors={colors} />}
          />
          <Row
            title={t.settings.quietHours}
            subtitle={t.settings.quietHoursSub}
            colors={colors}
            divider={false}
            right={
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TimePill value="22:00" colors={colors} />
                <TimePill value="07:00" colors={colors} />
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
            divider={false}
            right={
              <Switch
                value={vacationMode}
                onValueChange={setVacationMode}
                trackColor={{ false: colors.backgroundSelected, true: colors.tint }}
                thumbColor="#fff"
              />
            }
          />
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
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  pillText: { fontSize: 13, fontWeight: '600' },
  segment: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 3 },
  segmentBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  segmentText: { fontSize: 11, fontWeight: '700' },
});
