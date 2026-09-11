import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateField } from '@/components/date-field';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useThemeMode } from '@/context/theme-context';
import { useLanguage } from '@/context/language-context';
import { usePlants } from '@/context/plants-context';
import { useSettings } from '@/context/settings-context';
import { downloadBackup, firebaseConfigured, generateBackupCode, uploadBackup } from '@/utils/backup';
import { exportPlantsData } from '@/utils/export';
import { requestNotificationPermission } from '@/utils/notifications';
import { fetchCurrentTemperatureC, requestLocationPermission, seasonalFactorFromTemp } from '@/utils/weather';

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

export default function SettingsScreen() {
  const colors = useTheme();
  const { mode, setMode } = useThemeMode();
  const { lang, setLang, t } = useLanguage();
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    reminderTime,
    setReminderTime,
    quietStart,
    setQuietStart,
    quietEnd,
    setQuietEnd,
    seasonalAdjustment,
    setSeasonalAdjustment,
    seasonalFactor,
    seasonalTempC,
    setSeasonalWeather,
    vacationMode,
    setVacationMode,
    vacationStart,
    setVacationStart,
    vacationEnd,
    setVacationEnd,
    units,
    setUnits,
    backupCode,
    setBackupCode,
    lastBackupAt,
    setLastBackupAt,
    resetSettings,
  } = useSettings();
  const { plants, resetPlants, restorePlants } = usePlants();
  const router = useRouter();
  const [resetConfirm, setResetConfirm] = useState(false);

  const [exportError, setExportError] = useState(false);

  const [backupBusy, setBackupBusy] = useState(false);
  const [backupError, setBackupError] = useState(false);
  const [restorePanelOpen, setRestorePanelOpen] = useState(false);
  const [restoreCode, setRestoreCode] = useState('');
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreError, setRestoreError] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(false);

  const handleExport = () => {
    if (plants.length === 0) return;
    setExportError(false);
    exportPlantsData(plants).catch(() => setExportError(true));
  };

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) return;
    }
    setNotificationsEnabled(value);
  };

  const handleToggleSeasonal = async (value: boolean) => {
    setSeasonalAdjustment(value);
    if (!value) return;
    const granted = await requestLocationPermission();
    if (!granted) return;
    const tempC = await fetchCurrentTemperatureC();
    if (tempC !== null) setSeasonalWeather(tempC, seasonalFactorFromTemp(tempC));
  };

  const handleBackupNow = async () => {
    setBackupBusy(true);
    setBackupError(false);
    const code = backupCode ?? generateBackupCode();
    const ok = await uploadBackup(code, plants);
    setBackupBusy(false);
    if (!ok) {
      setBackupError(true);
      return;
    }
    if (!backupCode) setBackupCode(code);
    setLastBackupAt(new Date());
  };

  const handleRestoreConfirmed = async () => {
    setRestoreBusy(true);
    setRestoreError(false);
    const result = await downloadBackup(restoreCode);
    setRestoreBusy(false);
    if (!result) {
      setRestoreError(true);
      return;
    }
    restorePlants(result.plants, result.savedAt);
    setRestoreConfirm(false);
    setRestorePanelOpen(false);
    setRestoreCode('');
  };

  const handleVacationStartChange = (date: Date) => {
    setVacationStart(date);
    if (vacationEnd && date > vacationEnd) setVacationEnd(date);
  };

  const handleVacationEndChange = (date: Date) => {
    setVacationEnd(vacationStart && date < vacationStart ? vacationStart : date);
  };

  const handleResetConfirmed = () => {
    resetPlants();
    resetSettings();
    setResetConfirm(false);
    router.replace('/onboarding');
  };

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
                onValueChange={handleToggleNotifications}
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
            subtitle={
              seasonalAdjustment && seasonalTempC !== null
                ? t.settings.seasonalEffect(Math.round(seasonalTempC), Math.round((seasonalFactor - 1) * 100))
                : t.settings.seasonalAdjustmentSub
            }
            colors={colors}
            right={
              <Switch
                value={seasonalAdjustment}
                onValueChange={handleToggleSeasonal}
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
                    onChange={handleVacationStartChange}
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
                    onChange={handleVacationEndChange}
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
            subtitle={exportError ? t.settings.exportError : t.settings.exportDataSub}
            colors={colors}
            right={
              <Pressable
                onPress={handleExport}
                disabled={plants.length === 0}
                style={[styles.exportButton, { backgroundColor: colors.backgroundSelected, opacity: plants.length === 0 ? 0.5 : 1 }]}>
                <Text style={[styles.exportButtonText, { color: colors.text }]}>{t.settings.exportButton}</Text>
              </Pressable>
            }
          />
          <Row
            title={t.settings.resetData}
            subtitle={t.settings.resetDataSub}
            colors={colors}
            divider={resetConfirm}
            right={
              <Pressable onPress={() => setResetConfirm((v) => !v)}>
                <Text style={{ color: colors.accent, fontSize: 18 }}>›</Text>
              </Pressable>
            }
          />
          {resetConfirm && (
            <View style={styles.resetConfirmBlock}>
              <Text style={[styles.resetConfirmText, { color: colors.textSecondary }]}>{t.settings.resetConfirm}</Text>
              <View style={styles.resetConfirmActions}>
                <Pressable
                  onPress={() => setResetConfirm(false)}
                  style={[styles.resetCancelButton, { backgroundColor: colors.backgroundSelected }]}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{t.settings.resetCancel}</Text>
                </Pressable>
                <Pressable
                  onPress={handleResetConfirmed}
                  style={[styles.resetConfirmButton, { backgroundColor: colors.accent }]}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t.settings.resetConfirmYes}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </SectionCard>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.settings.cloudBackup}</Text>
        <SectionCard colors={colors}>
          {!firebaseConfigured ? (
            <Row title={t.settings.cloudBackupNotConfigured} colors={colors} divider={false} right={<View />} />
          ) : (
            <>
              <Row
                title={t.settings.backupNow}
                subtitle={
                  backupError
                    ? t.settings.backupError
                    : lastBackupAt
                      ? t.settings.lastBackedUp(`${formatDate(lastBackupAt)} ${formatTime(lastBackupAt)}`)
                      : t.settings.neverBackedUp
                }
                colors={colors}
                divider={!!backupCode}
                right={
                  <Pressable
                    onPress={handleBackupNow}
                    disabled={backupBusy}
                    style={[styles.exportButton, { backgroundColor: colors.backgroundSelected, opacity: backupBusy ? 0.5 : 1 }]}>
                    <Text style={[styles.exportButtonText, { color: colors.text }]}>
                      {backupBusy ? t.settings.backupNowBusy : t.settings.backupNow}
                    </Text>
                  </Pressable>
                }
              />
              {backupCode && (
                <View style={styles.resetConfirmBlock}>
                  <Text style={[styles.rowSubtitle, { color: colors.textSecondary }]}>{t.settings.backupCodeLabel}</Text>
                  <Text selectable style={[styles.backupCodeText, { color: colors.text }]}>
                    {backupCode}
                  </Text>
                  <Text style={[styles.resetConfirmText, { color: colors.textSecondary }]}>{t.settings.backupCodeHint}</Text>
                </View>
              )}

              <Row
                title={t.settings.restoreTitle}
                subtitle={t.settings.restoreSub}
                colors={colors}
                divider={restorePanelOpen}
                right={
                  <Pressable onPress={() => setRestorePanelOpen((v) => !v)}>
                    <Text style={{ color: colors.accent, fontSize: 18 }}>›</Text>
                  </Pressable>
                }
              />
              {restorePanelOpen && (
                <View style={styles.resetConfirmBlock}>
                  <TextInput
                    value={restoreCode}
                    onChangeText={setRestoreCode}
                    placeholder={t.settings.restoreCodePlaceholder}
                    placeholderTextColor={colors.textSecondary}
                    autoCapitalize="characters"
                    style={[styles.restoreInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
                  />
                  {restoreError && (
                    <Text style={[styles.resetConfirmText, { color: colors.accent }]}>{t.settings.restoreError}</Text>
                  )}
                  {!restoreConfirm ? (
                    <Pressable
                      onPress={() => setRestoreConfirm(true)}
                      disabled={!restoreCode.trim()}
                      style={[
                        styles.restoreButtonSolo,
                        { backgroundColor: colors.accent, opacity: restoreCode.trim() ? 1 : 0.5, alignSelf: 'flex-start' },
                      ]}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t.settings.restoreButton}</Text>
                    </Pressable>
                  ) : (
                    <>
                      <Text style={[styles.resetConfirmText, { color: colors.textSecondary }]}>
                        {t.settings.restoreConfirmText}
                      </Text>
                      <View style={styles.resetConfirmActions}>
                        <Pressable
                          onPress={() => setRestoreConfirm(false)}
                          style={[styles.resetCancelButton, { backgroundColor: colors.backgroundSelected }]}>
                          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>
                            {t.settings.restoreConfirmCancel}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={handleRestoreConfirmed}
                          disabled={restoreBusy}
                          style={[styles.resetConfirmButton, { backgroundColor: colors.accent, opacity: restoreBusy ? 0.5 : 1 }]}>
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                            {restoreBusy ? t.settings.restoreButtonBusy : t.settings.restoreConfirmYes}
                          </Text>
                        </Pressable>
                      </View>
                    </>
                  )}
                </View>
              )}
            </>
          )}
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
  exportButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  exportButtonText: { fontSize: 13, fontWeight: '700' },
  resetConfirmBlock: { paddingBottom: Spacing.three, gap: Spacing.two },
  resetConfirmText: { fontSize: 12, lineHeight: 17 },
  resetConfirmActions: { flexDirection: 'row', gap: Spacing.two },
  resetCancelButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  resetConfirmButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  backupCodeText: { fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  restoreInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 44, fontSize: 14 },
  restoreButtonSolo: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
});
