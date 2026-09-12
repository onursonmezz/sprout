import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Sharing from 'expo-sharing';
import { useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';

import { CircularProgress } from '@/components/circular-progress';
import { PhotoPicker } from '@/components/photo-picker';
import { PlantAvatar } from '@/components/plant-avatar';
import { Fonts, Spacing } from '@/constants/theme';
import { Translations } from '@/constants/translations';
import { useTheme } from '@/hooks/use-theme';
import { usePlants } from '@/context/plants-context';
import { useLanguage } from '@/context/language-context';
import { CareTask, CareTaskType, JournalEntry, JournalEntryType, Plant } from '@/data/plants';
import { findSpeciesLoose } from '@/data/species-guide';
import { symptomEmoji, symptomKeys, SymptomKey } from '@/data/troubleshooting';
import { daysUntilNext, formatDateFromDaysOffset, generateEventDaysAgoList, relativeTime } from '@/utils/care';
import { hapticSuccess, hapticTap } from '@/utils/haptics';

const TAB_KEYS = ['overview', 'care', 'journal', 'history'] as const;

const CARE_TYPES: CareTaskType[] = ['fertilize', 'rotate', 'mist', 'prune', 'repot'];
const CARE_EMOJI: Record<CareTaskType, string> = { fertilize: '🌱', rotate: '🔄', mist: '💦', prune: '✂️', repot: '🪴' };
const CARE_DEFAULT_INTERVAL: Record<CareTaskType, number> = { fertilize: 21, rotate: 14, mist: 3, prune: 30, repot: 365 };

const JOURNAL_TYPES: JournalEntryType[] = ['watered', 'newLeaf', 'fertilized', 'repotted', 'note'];
const JOURNAL_EMOJI: Record<JournalEntryType, string> = {
  watered: '💧',
  newLeaf: '🌿',
  fertilized: '🌱',
  repotted: '🪴',
  note: '📝',
};

function watchingText(status: string, days: number, t: Translations) {
  if (status === 'overdue') return t.plantDetail.daysOverdue(Math.abs(days));
  if (status === 'dueToday') return t.plantDetail.dueToday;
  return t.plantDetail.inDays(days);
}

export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useTheme();
  const { t, lang } = useLanguage();
  const { getPlant, addCareTask, completeCareTask, addJournalEntry, waterPlant, snoozePlant } = usePlants();
  const plant = getPlant(String(id));
  const [tab, setTab] = useState<(typeof TAB_KEYS)[number]>('overview');
  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareCardRef = useRef<ViewShotRef>(null);

  const handleShare = async () => {
    if (!shareCardRef.current) return;
    setSharing(true);
    try {
      const uri = await shareCardRef.current.capture();
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: t.shareCard.dialogTitle });
      }
    } catch {
      // Sharing is a nice-to-have; a failed capture or a cancelled share sheet isn't an error to surface.
    } finally {
      setSharing(false);
    }
  };

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

  const speciesInfo = findSpeciesLoose(plant.species) ?? findSpeciesLoose(plant.latinName);
  const isOverdue = plant.status === 'overdue';
  const isDueToday = plant.status === 'dueToday';
  const statusColor = isOverdue || isDueToday ? colors.accent : colors.tint;
  const wateringInterval = plant.wateringIntervalDays;
  const wateringProgress = plant.lastWateredDaysAgo / wateringInterval;

  const handleWaterNow = () => {
    waterPlant(plant.id);
    addJournalEntry(plant.id, {
      id: `watered-${Date.now()}`,
      type: 'watered',
      title: t.plantDetail.journal.wateredTitle,
      description: t.plantDetail.journal.wateredDesc(plant.wateringAmountMl),
      daysAgo: 0,
    });
    hapticSuccess();
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastVisible(true);
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => setToastVisible(false));
    }, 2000);
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: plant.avatarColor }]}>
          {plant.photoUri && <Image source={{ uri: plant.photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" />}
          <View style={styles.heroTopRow}>
            <Pressable onPress={() => router.back()} style={styles.heroButton}>
              <Ionicons name="arrow-back" size={20} color="#1E2A22" />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => setShareModalVisible(true)} style={styles.heroButton}>
                <Ionicons name="share-outline" size={18} color="#1E2A22" />
              </Pressable>
              <Pressable onPress={() => router.push(`/add-plant?id=${plant.id}`)} style={styles.heroButton}>
                <Text style={styles.heroButtonText}>{t.plantDetail.edit}</Text>
              </Pressable>
            </View>
          </View>
          {!plant.photoUri && <Text style={styles.heroEmoji}>{plant.emoji}</Text>}
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
            <CircularProgress
              size={44}
              strokeWidth={4}
              progress={wateringProgress}
              color={statusColor}
              trackColor={colors.backgroundSelected}
            />
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
            <Pressable onPress={handleWaterNow} style={[styles.waterButton, { backgroundColor: statusColor }]}>
              <Text style={styles.waterButtonText}>{t.plantDetail.waterNow}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                snoozePlant(plant.id);
                hapticTap();
              }}
              style={[styles.snoozeButton, { backgroundColor: colors.backgroundSelected }]}>
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

          {tab === 'overview' && (
            <>
              {speciesInfo && (
                <View style={[styles.speciesCard, { backgroundColor: colors.tintMuted }]}>
                  <Text style={[styles.speciesCardTitle, { color: colors.text }]}>{t.plantDetail.speciesGuideTitle}</Text>
                  <Text style={[styles.speciesCardText, { color: colors.textSecondary }]}>
                    {t.plantDetail.speciesGuideCare(speciesInfo.water.baseIntervalDays)}
                  </Text>
                  <Text
                    style={[
                      styles.speciesCardText,
                      {
                        color: speciesInfo.toxicity.toxicToCats || speciesInfo.toxicity.toxicToDogs ? colors.accent : colors.textSecondary,
                        fontWeight: '700',
                      },
                    ]}>
                    {speciesInfo.toxicity.toxicToCats || speciesInfo.toxicity.toxicToDogs
                      ? t.plantDetail.toxicToPets
                      : t.plantDetail.nonToxicToPets}
                  </Text>
                  {(speciesInfo.toxicity.toxicToCats || speciesInfo.toxicity.toxicToDogs) && (
                    <Text style={[styles.speciesCardText, { color: colors.textSecondary }]}>
                      {t.plantDetail.toxicitySeverity[speciesInfo.toxicity.severity]}
                    </Text>
                  )}
                  <Text style={[styles.speciesCardText, { color: colors.textSecondary }]}>
                    {t.plantDetail.humidityLevel[speciesInfo.humidity.level]}
                  </Text>
                  <Text style={[styles.speciesCardText, { color: colors.textSecondary }]}>
                    {t.plantDetail.speciesIdealTemp(speciesInfo.temperature.idealMinC, speciesInfo.temperature.idealMaxC)}
                  </Text>
                  <Text style={[styles.speciesCardText, { color: colors.textSecondary }]}>
                    {t.plantDetail.speciesRecommendedSoil(t.plantDetail.soilRecommendation[speciesInfo.soil.types[0]])}
                  </Text>
                  {lang === 'tr' && (
                    <Text style={[styles.speciesCardText, { color: colors.textSecondary, fontStyle: 'italic' }]}>
                      {speciesInfo.turkeyNote}
                    </Text>
                  )}
                </View>
              )}

              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.plantDetail.environment}</Text>
              <View style={styles.chipGrid}>
                <InfoChip label={t.plantDetail.room} value={plant.room} colors={colors} />
                <InfoChip label={t.plantDetail.light} value={t.addPlant.lightLevels[plant.environment.lightKey].label} colors={colors} />
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
                <InfoChip label={t.plantDetail.material} value={t.addPlant.potMaterials[plant.pot.materialKey]} colors={colors} />
                <InfoChip label={t.plantDetail.drainage} value={plant.pot.drainage} colors={colors} />
                <InfoChip label={t.plantDetail.soil} value={plant.pot.soil} colors={colors} wide />
                <InfoChip label={t.plantDetail.acquired} value={plant.acquiredDate} colors={colors} wide />
              </View>

              <TroubleshootingSection colors={colors} t={t} />
            </>
          )}

          {tab === 'care' && (
            <CareTab
              plant={plant}
              colors={colors}
              t={t}
              onAddTask={(task) => addCareTask(plant.id, task)}
              onCompleteTask={(index) => {
                completeCareTask(plant.id, index);
                hapticSuccess();
              }}
            />
          )}

          {tab === 'journal' && (
            <JournalTab plant={plant} colors={colors} t={t} onAddEntry={(entry) => addJournalEntry(plant.id, entry)} />
          )}

          {tab === 'history' && <HistoryTab plant={plant} colors={colors} t={t} />}
        </View>
      </ScrollView>

      {toastVisible && (
        <Animated.View pointerEvents="none" style={[styles.toast, { backgroundColor: colors.tint, opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{t.plantDetail.wateredToast(plant.name)}</Text>
        </Animated.View>
      )}

      <Modal visible={shareModalVisible} transparent animationType="fade" onRequestClose={() => setShareModalVisible(false)}>
        <View style={styles.shareBackdrop}>
          <ViewShot ref={shareCardRef} options={{ format: 'png', quality: 1 }}>
            <View style={[styles.shareCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <PlantAvatar plant={plant} size={110} />
              <Text style={[styles.shareCardName, { color: colors.text, fontFamily: Fonts.serif }]}>{plant.name}</Text>
              {plant.species !== '—' && (
                <Text style={[styles.shareCardSpecies, { color: colors.textSecondary }]}>{plant.species}</Text>
              )}
              <View style={styles.shareCardStatsRow}>
                <View style={[styles.shareCardStat, { backgroundColor: colors.tintMuted }]}>
                  <Text style={[styles.shareCardStatText, { color: colors.tint }]}>
                    💧 {t.shareCard.wateringEvery(plant.wateringIntervalDays)}
                  </Text>
                </View>
                <View style={[styles.shareCardStat, { backgroundColor: colors.tintMuted }]}>
                  <Text style={[styles.shareCardStatText, { color: colors.tint }]}>
                    {plant.wateringAmountMl}ml {t.shareCard.perWatering}
                  </Text>
                </View>
              </View>
              <Text style={[styles.shareCardFooter, { color: colors.textSecondary }]}>{t.shareCard.footer}</Text>
            </View>
          </ViewShot>

          <View style={styles.shareActionsRow}>
            <Pressable
              onPress={() => setShareModalVisible(false)}
              style={[styles.shareCancelButton, { backgroundColor: colors.backgroundSelected }]}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{t.shareCard.cancel}</Text>
            </Pressable>
            <Pressable
              onPress={handleShare}
              disabled={sharing}
              style={[styles.shareButton, { backgroundColor: colors.tint, opacity: sharing ? 0.6 : 1 }]}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>
                {sharing ? t.shareCard.sharing : t.shareCard.shareButton}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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

function TroubleshootingSection({ colors, t }: { colors: ReturnType<typeof useTheme>; t: Translations }) {
  const [expanded, setExpanded] = useState<SymptomKey | null>(null);

  return (
    <View style={{ gap: Spacing.two, marginTop: Spacing.three }}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.troubleshooting.sectionTitle}</Text>
      <Text style={[styles.symptomIntro, { color: colors.textSecondary }]}>{t.troubleshooting.intro}</Text>
      <View style={{ gap: 6 }}>
        {symptomKeys.map((key) => {
          const symptom = t.troubleshooting.symptoms[key];
          const isOpen = expanded === key;
          return (
            <View key={key} style={[styles.symptomCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Pressable onPress={() => setExpanded(isOpen ? null : key)} style={styles.symptomRow}>
                <Text style={{ fontSize: 16 }}>{symptomEmoji[key]}</Text>
                <Text style={[styles.symptomLabel, { color: colors.text }]}>{symptom.label}</Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textSecondary} />
              </Pressable>
              {isOpen && (
                <View style={styles.symptomCauses}>
                  {symptom.causes.map((cause, i) => (
                    <Text key={i} style={[styles.symptomCauseText, { color: colors.textSecondary }]}>
                      • {cause}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function CareTab({
  plant,
  colors,
  t,
  onAddTask,
  onCompleteTask,
}: {
  plant: Plant;
  colors: ReturnType<typeof useTheme>;
  t: Translations;
  onAddTask: (task: CareTask) => void;
  onCompleteTask: (index: number) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const existingTypes = plant.care.map((c) => c.type);
  const availableTypes = CARE_TYPES.filter((ty) => !existingTypes.includes(ty));
  const wateringInterval = plant.wateringIntervalDays;

  return (
    <View style={{ gap: Spacing.two }}>
      <Pressable
        onPress={() => setPickerOpen((o) => !o)}
        style={[styles.addButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.addButtonText, { color: colors.tint }]}>{t.plantDetail.care.addTask}</Text>
      </Pressable>

      {pickerOpen && (
        <View style={[styles.pickerPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {availableTypes.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t.plantDetail.care.allAdded}</Text>
          ) : (
            availableTypes.map((ty) => (
              <Pressable
                key={ty}
                onPress={() => {
                  onAddTask({ type: ty, intervalDays: CARE_DEFAULT_INTERVAL[ty], lastDoneDaysAgo: 0 });
                  setPickerOpen(false);
                }}
                style={styles.pickerOption}>
                <Text style={{ fontSize: 16 }}>{CARE_EMOJI[ty]}</Text>
                <Text style={[styles.pickerOptionText, { color: colors.text }]}>{t.plantDetail.care.taskNames[ty]}</Text>
              </Pressable>
            ))
          )}
        </View>
      )}

      <CareRow
        emoji="💧"
        title={t.plantDetail.care.watering}
        subtitle={`${t.plantDetail.care.everyDays(wateringInterval)} · ${plant.wateringAmountMl}ml`}
        nextText={
          plant.daysUntilWatering <= 0
            ? t.plantDetail.care.nextDueNow
            : t.plantDetail.care.nextOn(formatDateFromDaysOffset(plant.daysUntilWatering, t))
        }
        overdue={plant.status === 'overdue'}
        colors={colors}
        t={t}
      />

      {plant.care.map((task, i) => {
        const daysLeft = daysUntilNext(task.intervalDays, task.lastDoneDaysAgo);
        return (
          <CareRow
            key={i}
            emoji={CARE_EMOJI[task.type]}
            title={t.plantDetail.care.taskNames[task.type]}
            subtitle={t.plantDetail.care.everyDays(task.intervalDays)}
            nextText={
              daysLeft <= 0 ? t.plantDetail.care.nextDueNow : t.plantDetail.care.nextOn(formatDateFromDaysOffset(daysLeft, t))
            }
            overdue={daysLeft <= 0}
            colors={colors}
            t={t}
            onComplete={() => onCompleteTask(i)}
          />
        );
      })}
    </View>
  );
}

function CareRow({
  emoji,
  title,
  subtitle,
  nextText,
  overdue,
  colors,
  t,
  onComplete,
}: {
  emoji: string;
  title: string;
  subtitle: string;
  nextText: string;
  overdue: boolean;
  colors: ReturnType<typeof useTheme>;
  t: Translations;
  onComplete?: () => void;
}) {
  return (
    <View style={[styles.careRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.careIcon, { backgroundColor: colors.tintMuted }]}>
        <Text style={{ fontSize: 18 }}>{emoji}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.careTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.careSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
        <Text style={[styles.careSubtitle, { color: colors.textSecondary }]}>{nextText}</Text>
      </View>
      {onComplete ? (
        <Pressable
          onPress={onComplete}
          style={[styles.completeButton, { backgroundColor: overdue ? colors.accent : colors.tint }]}>
          <Ionicons name="add" size={18} color="#fff" />
        </Pressable>
      ) : (
        overdue && (
          <View style={[styles.overdueBadge, { backgroundColor: colors.accentMuted }]}>
            <Text style={[styles.overdueBadgeText, { color: colors.accent }]}>{t.plantDetail.care.overdue}</Text>
          </View>
        )
      )}
    </View>
  );
}

function JournalTab({
  plant,
  colors,
  t,
  onAddEntry,
}: {
  plant: Plant;
  colors: ReturnType<typeof useTheme>;
  t: Translations;
  onAddEntry: (entry: JournalEntry) => void;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [type, setType] = useState<JournalEntryType>('note');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const fertilizeTask = plant.care.find((c) => c.type === 'fertilize');
  const hasLoggedWatering = plant.journalNotes.some((e) => e.type === 'watered');
  const autoEntries: JournalEntry[] = [
    // Real "watered" entries are logged from handleWaterNow going forward; this
    // synthetic fallback only covers plants watered before that logging existed.
    ...(hasLoggedWatering
      ? []
      : [
          {
            id: 'auto-watered',
            type: 'watered' as JournalEntryType,
            title: t.plantDetail.journal.wateredTitle,
            description: t.plantDetail.journal.wateredDesc(plant.wateringAmountMl),
            daysAgo: plant.lastWateredDaysAgo,
          },
        ]),
    ...(fertilizeTask
      ? [
          {
            id: 'auto-fertilized',
            type: 'fertilized' as JournalEntryType,
            title: t.plantDetail.journal.fertilizedTitle,
            description: t.plantDetail.journal.fertilizedDesc,
            daysAgo: fertilizeTask.lastDoneDaysAgo,
          },
        ]
      : []),
  ];

  const entries = [...plant.journalNotes, ...autoEntries].sort((a, b) => a.daysAgo - b.daysAgo);

  const handleSave = () => {
    if (!title.trim()) return;
    onAddEntry({
      id: `entry-${Date.now()}`,
      type,
      title: title.trim(),
      description: description.trim(),
      daysAgo: 0,
      photoUri,
    });
    setTitle('');
    setDescription('');
    setType('note');
    setPhotoUri(null);
    setFormOpen(false);
  };

  return (
    <View style={{ gap: Spacing.two }}>
      <Pressable
        onPress={() => setFormOpen((o) => !o)}
        style={[styles.addButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.addButtonText, { color: colors.tint }]}>{t.plantDetail.journal.addEntry}</Text>
      </Pressable>

      {formOpen && (
        <View style={[styles.pickerPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.journalTypeRow}>
            {JOURNAL_TYPES.map((ty) => (
              <Pressable
                key={ty}
                onPress={() => setType(ty)}
                style={[
                  styles.journalTypeChip,
                  { borderColor: colors.border, backgroundColor: type === ty ? colors.tintMuted : colors.background },
                ]}>
                <Text style={{ fontSize: 14 }}>{JOURNAL_EMOJI[ty]}</Text>
                <Text style={[styles.journalTypeText, { color: colors.text }]}>{t.plantDetail.journal.typeNames[ty]}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t.plantDetail.journal.titlePlaceholder}
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
          />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={t.plantDetail.journal.descriptionPlaceholder}
            placeholderTextColor={colors.textSecondary}
            multiline
            style={[
              styles.input,
              styles.inputMultiline,
              { color: colors.text, backgroundColor: colors.background, borderColor: colors.border },
            ]}
          />
          <PhotoPicker uri={photoUri} onChange={setPhotoUri} colors={colors} t={t} height={120} />
          <View style={styles.formActions}>
            <Pressable onPress={() => setFormOpen(false)} style={[styles.formCancelButton, { backgroundColor: colors.backgroundSelected }]}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{t.plantDetail.journal.cancel}</Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              disabled={!title.trim()}
              style={[styles.formSaveButton, { backgroundColor: colors.tint, opacity: title.trim() ? 1 : 0.5 }]}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t.plantDetail.journal.save}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {entries.length === 0 ? (
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t.plantDetail.journal.empty}</Text>
      ) : (
        entries.map((entry, i) => (
          <View key={entry.id} style={styles.timelineRow}>
            <View style={styles.timelineIconColumn}>
              <View style={[styles.timelineIcon, { backgroundColor: colors.tintMuted }]}>
                <Text style={{ fontSize: 14 }}>{JOURNAL_EMOJI[entry.type]}</Text>
              </View>
              {i < entries.length - 1 && <View style={[styles.timelineLine, { backgroundColor: colors.border }]} />}
            </View>
            <View style={[styles.timelineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.timelineHeader}>
                <Text style={[styles.timelineTitle, { color: colors.text }]}>{entry.title}</Text>
                <Text style={[styles.timelineTime, { color: colors.textSecondary }]}>{relativeTime(entry.daysAgo, t)}</Text>
              </View>
              {!!entry.description && (
                <Text style={[styles.timelineDescription, { color: colors.textSecondary }]}>{entry.description}</Text>
              )}
              {!!entry.photoUri && (
                <Image source={{ uri: entry.photoUri }} style={styles.timelinePhoto} contentFit="cover" />
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function PhotoTimeline({ plant, colors, t }: { plant: Plant; colors: ReturnType<typeof useTheme>; t: Translations }) {
  const [selected, setSelected] = useState<string | null>(null);

  const photos = useMemo(
    () =>
      plant.journalNotes
        .filter((e): e is JournalEntry & { photoUri: string } => !!e.photoUri)
        .map((e) => ({ uri: e.photoUri, daysAgo: e.daysAgo }))
        .sort((a, b) => b.daysAgo - a.daysAgo),
    [plant.journalNotes]
  );

  if (photos.length === 0) return null;

  return (
    <View style={{ gap: Spacing.two }}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{t.plantDetail.history.photoTimeline}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Spacing.two }}>
        {photos.map((p, i) => (
          <Pressable key={i} onPress={() => setSelected(p.uri)} style={{ alignItems: 'center', gap: 4 }}>
            <Image source={{ uri: p.uri }} style={[styles.timelineThumb, { borderColor: colors.border }]} contentFit="cover" />
            <Text style={[styles.timelineThumbLabel, { color: colors.textSecondary }]}>{relativeTime(p.daysAgo, t)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <Pressable style={styles.photoModalBackdrop} onPress={() => setSelected(null)}>
          {!!selected && <Image source={{ uri: selected }} style={styles.photoModalImage} contentFit="contain" />}
        </Pressable>
      </Modal>
    </View>
  );
}

function HistoryTab({ plant, colors, t }: { plant: Plant; colors: ReturnType<typeof useTheme>; t: Translations }) {
  const wateringInterval = plant.wateringIntervalDays;
  // Never project synthetic history further back than the plant has actually
  // existed in Sprout — a plant added 5 days ago shouldn't show fabricated
  // waterings from a month before it was added.
  const maxDaysBack = Math.min(84, plant.createdDaysAgo);

  return (
    <View style={{ gap: Spacing.four }}>
      <PhotoTimeline plant={plant} colors={colors} t={t} />
      <HistorySection
        title={t.plantDetail.history.wateringHistory}
        recentLabel={t.plantDetail.history.recentWaterings}
        intervalDays={wateringInterval}
        lastDoneDaysAgo={plant.lastWateredDaysAgo}
        maxDaysBack={maxDaysBack}
        colors={colors}
        t={t}
      />
      {plant.care.map((task, i) => (
        <HistorySection
          key={i}
          title={t.plantDetail.history.taskHistoryTitle[task.type]}
          recentLabel={t.plantDetail.history.taskRecentLabel[task.type]}
          intervalDays={task.intervalDays}
          lastDoneDaysAgo={task.lastDoneDaysAgo}
          maxDaysBack={maxDaysBack}
          colors={colors}
          t={t}
        />
      ))}
    </View>
  );
}

function HistorySection({
  title,
  recentLabel,
  intervalDays,
  lastDoneDaysAgo,
  maxDaysBack,
  colors,
  t,
}: {
  title: string;
  recentLabel: string;
  intervalDays: number;
  lastDoneDaysAgo: number;
  maxDaysBack: number;
  colors: ReturnType<typeof useTheme>;
  t: Translations;
}) {
  const eventDays = generateEventDaysAgoList(intervalDays, lastDoneDaysAgo, maxDaysBack);
  const eventSet = new Set(eventDays);
  const recent = eventDays.slice(0, 6);

  return (
    <View style={{ gap: Spacing.two }}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{title}</Text>

      <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.historyCaption, { color: colors.textSecondary }]}>{t.plantDetail.history.last12Weeks}</Text>
        <View style={styles.dotGrid}>
          {Array.from({ length: 84 }).map((_, i) => {
            const daysAgo = 83 - i;
            const filled = eventSet.has(daysAgo);
            return (
              <View key={i} style={styles.dotCell}>
                <View style={[styles.dot, { backgroundColor: filled ? colors.tint : colors.backgroundSelected }]} />
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.historyCaption, { color: colors.text, fontWeight: '700' }]}>{recentLabel}</Text>
        {recent.length === 0 ? (
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{t.plantDetail.history.noHistory}</Text>
        ) : (
          recent.map((d, i) => (
            <View
              key={i}
              style={[styles.historyRow, i < recent.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <Text style={[styles.historyDate, { color: colors.text }]}>{formatDateFromDaysOffset(-d, t)}</Text>
              <Text style={[styles.historyRelative, { color: colors.textSecondary }]}>{relativeTime(d, t)}</Text>
            </View>
          ))
        )}
      </View>
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
  speciesCard: { borderRadius: 16, padding: Spacing.three, gap: 3, marginBottom: Spacing.three },
  speciesCardTitle: { fontSize: 12, fontWeight: '700' },
  speciesCardText: { fontSize: 12 },

  symptomIntro: { fontSize: 12 },
  symptomCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  symptomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  symptomLabel: { flex: 1, fontSize: 13, fontWeight: '700' },
  symptomCauses: { paddingHorizontal: 14, paddingBottom: 12, gap: 4 },
  symptomCauseText: { fontSize: 12, lineHeight: 17 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { width: '31%', borderRadius: 14, padding: Spacing.two, gap: 2 },
  chipWide: { width: '48%' },
  chipLabel: { fontSize: 10, fontWeight: '600' },
  chipValue: { fontSize: 13, fontWeight: '700' },

  toast: {
    position: 'absolute',
    bottom: Spacing.five,
    left: Spacing.four,
    right: Spacing.four,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  toastText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  addButton: { borderRadius: 14, borderWidth: 1, paddingVertical: 12, alignItems: 'center' },
  addButtonText: { fontWeight: '700', fontSize: 13 },
  pickerPanel: { borderRadius: 14, borderWidth: 1, padding: Spacing.two, gap: Spacing.one },
  pickerOption: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  pickerOptionText: { fontSize: 13, fontWeight: '600' },

  careRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderRadius: 16, borderWidth: 1, padding: Spacing.two },
  careIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  careTitle: { fontSize: 14, fontWeight: '700' },
  careSubtitle: { fontSize: 11 },
  overdueBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  overdueBadgeText: { fontSize: 10, fontWeight: '700' },
  completeButton: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  journalTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  journalTypeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  journalTypeText: { fontSize: 11, fontWeight: '600' },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  formActions: { flexDirection: 'row', gap: Spacing.two, justifyContent: 'flex-end' },
  formCancelButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  formSaveButton: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },

  timelineRow: { flexDirection: 'row' },
  timelineIconColumn: { width: 36, alignItems: 'center' },
  timelineIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { width: 2, flex: 1, marginTop: 4, marginBottom: 4 },
  timelineCard: { flex: 1, marginLeft: Spacing.two, marginBottom: Spacing.three, borderRadius: 14, borderWidth: 1, padding: Spacing.two, gap: 4 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineTitle: { fontSize: 13, fontWeight: '700' },
  timelineTime: { fontSize: 11 },
  timelineDescription: { fontSize: 12, lineHeight: 17 },
  timelinePhoto: { width: '100%', height: 140, borderRadius: 10, marginTop: 4 },

  timelineThumb: { width: 84, height: 84, borderRadius: 12, borderWidth: 1 },
  timelineThumbLabel: { fontSize: 10, fontWeight: '600' },
  photoModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoModalImage: { width: '100%', height: '80%' },

  shareBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  shareCard: {
    width: 280,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.four,
    alignItems: 'center',
    gap: 6,
  },
  shareCardName: { fontSize: 24, marginTop: Spacing.two },
  shareCardSpecies: { fontSize: 14 },
  shareCardStatsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: Spacing.two },
  shareCardStat: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14 },
  shareCardStatText: { fontSize: 12, fontWeight: '700' },
  shareCardFooter: { fontSize: 11, fontWeight: '600', marginTop: Spacing.three, letterSpacing: 0.5 },
  shareActionsRow: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.four, width: 280 },
  shareCancelButton: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  shareButton: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },

  historyCard: { borderRadius: 16, borderWidth: 1, padding: Spacing.two, gap: Spacing.one },
  historyCaption: { fontSize: 12 },
  dotGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dotCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  historyDate: { fontSize: 13, fontWeight: '600' },
  historyRelative: { fontSize: 12 },
});
