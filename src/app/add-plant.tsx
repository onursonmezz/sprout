import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhotoPicker } from '@/components/photo-picker';
import { Fonts, Spacing } from '@/constants/theme';
import { translations, Translations } from '@/constants/translations';
import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/hooks/use-theme';
import { usePlants } from '@/context/plants-context';
import { CareTask, Plant, WateringStatus } from '@/data/plants';
import { findSpeciesMatches, SpeciesGuideEntry } from '@/data/species-guide';
import { suggestWaterEveryDays } from '@/utils/care';
import { awaitLightMeterResult } from '@/utils/light-meter';

const DEFAULT_REPOT_INTERVAL_DAYS = 365;
const GENERIC_BASE_WATER_DAYS = 7;

const WINDOW_DIRECTIONS = ['N', 'E', 'S', 'W'] as const;
const AVATAR_COLORS = ['#DDE7D2', '#E4E9DA', '#DCE9D9', '#E8F0E2', '#DFE9D6', '#E6E2D2', '#DEE7D8', '#EDE6D6'];
const ALL_LANGUAGES = Object.values(translations) as Translations[];

function todayFormatted() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

/** A plant stores the *displayed* label for these fields, so a plant saved
 * in one language must still resolve to the right option after the app
 * language changes — search every language's label set, not just the
 * current one. */
function findLabelIndex(value: string, pick: (t: Translations) => string[]) {
  for (const lang of ALL_LANGUAGES) {
    const idx = pick(lang).indexOf(value);
    if (idx >= 0) return idx;
  }
  return -1;
}

function matchesAnyLanguage(value: string, pick: (t: Translations) => string) {
  return ALL_LANGUAGES.some((lang) => pick(lang) === value);
}

function parseFormattedDate(value: string): Date | null {
  const match = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const d = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whole calendar days between a formatted "DD.MM.YYYY" date and today. */
function daysAgoFrom(value: string): number {
  const parsed = parseFormattedDate(value);
  if (!parsed) return 0;
  const today = new Date();
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const utcParsed = Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  return Math.max(0, Math.round((utcToday - utcParsed) / 86400000));
}

type FormState = {
  photoUri: string | null;
  nickname: string;
  species: string;
  latinName: string;
  dateAcquired: string;
  room: string;
  windowDirection: (typeof WINDOW_DIRECTIONS)[number];
  lightLevelIndex: number;
  hoursLight: string;
  tempC: string;
  potDiameter: string;
  potDepth: string;
  potMaterialIndex: number;
  drainage: 'yes' | 'no';
  soilMix: string;
  lastRepotted: string;
  waterEveryDays: number;
  waterAmountMl: string;
  lastWatered: string;
};

const initialForm: FormState = {
  photoUri: null,
  nickname: '',
  species: '',
  latinName: '',
  dateAcquired: todayFormatted(),
  room: '',
  windowDirection: 'E',
  lightLevelIndex: 1,
  hoursLight: '',
  tempC: '',
  potDiameter: '',
  potDepth: '',
  potMaterialIndex: 2,
  drainage: 'yes',
  soilMix: '',
  lastRepotted: '',
  waterEveryDays: 7,
  waterAmountMl: '',
  lastWatered: todayFormatted(),
};

function plantToForm(plant: Plant): FormState {
  const lightIdx = findLabelIndex(
    plant.environment.light,
    (tt) => tt.addPlant.lightLevels.map((l) => l.label)
  );
  const materialIdx = findLabelIndex(plant.pot.material, (tt) => tt.addPlant.potMaterials);
  const windowRaw = plant.environment.window.split('-')[0];
  const windowDirection = (WINDOW_DIRECTIONS as readonly string[]).includes(windowRaw)
    ? (windowRaw as (typeof WINDOW_DIRECTIONS)[number])
    : 'E';
  const hasPotSize = plant.pot.size !== '—';
  const [potDiameter, potDepthRaw] = hasPotSize ? plant.pot.size.split('x') : ['', ''];

  return {
    photoUri: plant.photoUri,
    nickname: plant.name,
    species: plant.species === '—' ? '' : plant.species,
    latinName: plant.latinName,
    dateAcquired: plant.acquiredDate,
    room: plant.room === '—' ? '' : plant.room,
    windowDirection,
    lightLevelIndex: lightIdx >= 0 ? lightIdx : 1,
    hoursLight: plant.environment.hoursLight === '—' ? '' : plant.environment.hoursLight.replace('h Light', ''),
    tempC: plant.environment.tempC === '—' ? '' : plant.environment.tempC.replace('°C', ''),
    potDiameter,
    potDepth: hasPotSize ? potDepthRaw.replace('cm', '') : '',
    potMaterialIndex: materialIdx >= 0 ? materialIdx : 2,
    drainage: matchesAnyLanguage(plant.pot.drainage, (tt) => tt.addPlant.no) ? 'no' : 'yes',
    soilMix: plant.pot.soil,
    lastRepotted: '',
    waterEveryDays: plant.wateringIntervalDays,
    waterAmountMl: String(plant.wateringAmountMl),
    lastWatered: '',
  };
}

export default function AddPlantScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { plants, addPlant, updatePlant, deletePlant, getPlant } = usePlants();
  const editingPlant = id ? getPlant(String(id)) : undefined;
  const isEditing = Boolean(id);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(() => (editingPlant ? plantToForm(editingPlant) : initialForm));
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [speciesPickApplied, setSpeciesPickApplied] = useState(false);
  const [speciesDropdownDismissed, setSpeciesDropdownDismissed] = useState(false);
  const [speciesBaseWaterDays, setSpeciesBaseWaterDays] = useState(GENERIC_BASE_WATER_DAYS);
  // Editing an existing plant never auto-touches its already-established schedule.
  const [waterIntervalTouched, setWaterIntervalTouched] = useState(isEditing);

  if (isEditing && !editingPlant) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.text }}>{t.plantDetail.notFound}</Text>
      </View>
    );
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const speciesSuggestions =
    !isEditing && !speciesPickApplied && !speciesDropdownDismissed ? findSpeciesMatches(form.species) : [];

  /** Recomputes the suggested watering interval from a base cadence plus the
   * current (or about-to-change) pot/light/drainage answers — unless the user
   * has already manually adjusted the stepper themselves, whose choice wins. */
  const applyWaterSuggestion = (base: number, overrides: Partial<FormState> = {}) => {
    if (waterIntervalTouched) return;
    const next = { ...form, ...overrides };
    set('waterEveryDays', suggestWaterEveryDays(base, next));
  };

  const applySpeciesGuide = (entry: SpeciesGuideEntry) => {
    setSpeciesPickApplied(true);
    setSpeciesBaseWaterDays(entry.waterEveryDays);
    setForm((prev) => ({
      ...prev,
      species: entry.name,
      latinName: entry.latinName,
      lightLevelIndex: entry.lightLevelIndex,
      waterEveryDays: waterIntervalTouched
        ? prev.waterEveryDays
        : suggestWaterEveryDays(entry.waterEveryDays, { ...prev, lightLevelIndex: entry.lightLevelIndex }),
      waterAmountMl: String(entry.waterAmountMl),
    }));
  };

  const canContinue = step === 1 ? form.nickname.trim().length > 0 : true;

  const handleBack = () => {
    if (step === 1) router.back();
    else setStep((s) => s - 1);
  };

  const handleDelete = () => {
    if (!editingPlant) return;
    deletePlant(editingPlant.id);
    router.replace('/plants');
  };

  const handleContinue = () => {
    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }
    const lightLabel = t.addPlant.lightLevels[form.lightLevelIndex].label;
    const materialLabel = t.addPlant.potMaterials[form.potMaterialIndex];
    const drainageLabel = form.drainage === 'yes' ? t.addPlant.yes : t.addPlant.no;

    const sharedFields = {
      photoUri: form.photoUri,
      name: form.nickname.trim(),
      species: form.species.trim() || '—',
      latinName: form.latinName.trim(),
      room: form.room.trim() || '—',
      wateringAmountMl: Number(form.waterAmountMl) || 200,
      environment: {
        light: lightLabel,
        window: `${form.windowDirection}-Facing`,
        hoursLight: form.hoursLight ? `${form.hoursLight}h Light` : '—',
        humidity: editingPlant?.environment.humidity ?? 'Medium',
        tempC: form.tempC ? `${form.tempC}°C` : '—',
      },
      pot: {
        size: form.potDiameter && form.potDepth ? `${form.potDiameter}x${form.potDepth}cm` : '—',
        material: materialLabel,
        drainage: drainageLabel,
        soil: form.soilMix.trim() || t.addPlant.soilMixPlaceholder,
      },
      acquiredDate: form.dateAcquired,
    };

    const repotDaysAgo = form.lastRepotted ? daysAgoFrom(form.lastRepotted) : null;

    if (editingPlant) {
      const daysUntilWatering = form.waterEveryDays - editingPlant.lastWateredDaysAgo;
      const status: WateringStatus = daysUntilWatering < 0 ? 'overdue' : daysUntilWatering === 0 ? 'dueToday' : 'upcoming';
      let care = editingPlant.care;
      if (repotDaysAgo !== null) {
        const existing = care.find((c) => c.type === 'repot');
        care = existing
          ? care.map((c) => (c.type === 'repot' ? { ...c, lastDoneDaysAgo: repotDaysAgo } : c))
          : [...care, { type: 'repot', intervalDays: DEFAULT_REPOT_INTERVAL_DAYS, lastDoneDaysAgo: repotDaysAgo }];
      }
      updatePlant(editingPlant.id, {
        ...sharedFields,
        wateringIntervalDays: form.waterEveryDays,
        daysUntilWatering,
        status,
        care,
      });
      router.replace(`/plant/${editingPlant.id}`);
      return;
    }

    const id = `${form.nickname.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const lastWateredDaysAgo = daysAgoFrom(form.lastWatered);
    const daysUntilWatering = form.waterEveryDays - lastWateredDaysAgo;
    const care: CareTask[] =
      repotDaysAgo !== null ? [{ type: 'repot', intervalDays: DEFAULT_REPOT_INTERVAL_DAYS, lastDoneDaysAgo: repotDaysAgo }] : [];
    const newPlant: Plant = {
      id,
      ...sharedFields,
      emoji: '🌱',
      avatarColor: AVATAR_COLORS[plants.length % AVATAR_COLORS.length],
      status: daysUntilWatering <= 0 ? (daysUntilWatering < 0 ? 'overdue' : 'dueToday') : 'upcoming',
      wateringIntervalDays: form.waterEveryDays,
      daysUntilWatering,
      lastWateredDaysAgo,
      care,
      journalNotes: [],
      createdDaysAgo: 0,
    };
    addPlant(newPlant);
    router.replace(`/plant/${id}`);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Pressable onPress={handleBack}>
            <Text style={[styles.backText, { color: colors.textSecondary }]}>
              {step === 1 ? t.addPlant.close : t.addPlant.back}
            </Text>
          </Pressable>
          <Text style={[styles.stepCount, { color: colors.textSecondary }]}>{t.addPlant.stepOf(step)}</Text>
        </View>

        <Text style={[styles.title, { color: colors.text, fontFamily: Fonts.serif }]}>
          {isEditing ? t.addPlant.editTitle : t.addPlant.title}
        </Text>
        <Text style={[styles.stepTitle, { color: colors.tint }]}>{t.addPlant.stepTitles[step - 1]}</Text>

        <View style={styles.progressRow}>
          {t.addPlant.stepTitles.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressSegment,
                { backgroundColor: i < step ? colors.tint : colors.backgroundSelected },
              ]}
            />
          ))}
        </View>

        {step === 1 && (
          <View style={styles.fieldGroup}>
            <Field label={t.addPlant.photo} colors={colors}>
              <PhotoPicker uri={form.photoUri} onChange={(uri) => set('photoUri', uri)} colors={colors} t={t} />
            </Field>
            <Field label={t.addPlant.nickname} colors={colors}>
              <TextInput
                value={form.nickname}
                onChangeText={(v) => set('nickname', v)}
                placeholder={t.addPlant.nicknamePlaceholder}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              />
            </Field>
            <Field label={t.addPlant.species} colors={colors}>
              <TextInput
                value={form.species}
                onChangeText={(v) => {
                  setSpeciesPickApplied(false);
                  setSpeciesDropdownDismissed(false);
                  set('species', v);
                }}
                placeholder={t.addPlant.speciesPlaceholder}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              />
            </Field>
            <Field label={t.addPlant.latinName} colors={colors}>
              <TextInput
                value={form.latinName}
                onChangeText={(v) => set('latinName', v)}
                placeholder={t.addPlant.latinNamePlaceholder}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              />
            </Field>
            <Field label={t.addPlant.dateAcquired} colors={colors}>
              <TextInput
                value={form.dateAcquired}
                onChangeText={(v) => set('dateAcquired', v)}
                placeholder={t.addPlant.datePlaceholder}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              />
            </Field>
          </View>
        )}

        {step === 2 && (
          <View style={styles.fieldGroup}>
            <Field label={t.addPlant.room} colors={colors}>
              <TextInput
                value={form.room}
                onChangeText={(v) => set('room', v)}
                placeholder={t.addPlant.roomPlaceholder}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              />
            </Field>
            <Field label={t.addPlant.windowDirection} colors={colors}>
              <View style={styles.rowWrap}>
                {WINDOW_DIRECTIONS.map((dir) => (
                  <Pill
                    key={dir}
                    label={dir}
                    selected={form.windowDirection === dir}
                    onPress={() => set('windowDirection', dir)}
                    colors={colors}
                  />
                ))}
              </View>
            </Field>
            <Field label={t.addPlant.lightLevel} colors={colors}>
              <View style={{ gap: Spacing.one }}>
                {t.addPlant.lightLevels.map((level, i) => (
                  <OptionRow
                    key={level.label}
                    title={level.label}
                    subtitle={level.hint}
                    selected={form.lightLevelIndex === i}
                    onPress={() => {
                      set('lightLevelIndex', i);
                      applyWaterSuggestion(speciesBaseWaterDays, { lightLevelIndex: i });
                    }}
                    colors={colors}
                  />
                ))}
                <Pressable
                  onPress={() => {
                    awaitLightMeterResult((i) => {
                      set('lightLevelIndex', i);
                      applyWaterSuggestion(speciesBaseWaterDays, { lightLevelIndex: i });
                    });
                    router.push('/light-meter');
                  }}
                  style={[styles.measureButton, { borderColor: colors.border }]}>
                  <Text style={[styles.measureButtonText, { color: colors.tint }]}>{t.lightMeter.measureLight}</Text>
                </Pressable>
              </View>
            </Field>
            <View style={styles.twoCol}>
              <View style={styles.flex1}>
                <Field label={t.addPlant.hoursOfLight} colors={colors}>
                  <TextInput
                    value={form.hoursLight}
                    onChangeText={(v) => set('hoursLight', v)}
                    keyboardType="numeric"
                    placeholder="5"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                  />
                </Field>
              </View>
              <View style={styles.flex1}>
                <Field label={t.addPlant.temperature} colors={colors}>
                  <TextInput
                    value={form.tempC}
                    onChangeText={(v) => set('tempC', v)}
                    keyboardType="numeric"
                    placeholder="20"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                  />
                </Field>
              </View>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.fieldGroup}>
            <View style={styles.twoCol}>
              <View style={styles.flex1}>
                <Field label={t.addPlant.potDiameter} colors={colors}>
                  <TextInput
                    value={form.potDiameter}
                    onChangeText={(v) => set('potDiameter', v)}
                    keyboardType="numeric"
                    placeholder="14"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                  />
                </Field>
              </View>
              <View style={styles.flex1}>
                <Field label={t.addPlant.potDepth} colors={colors}>
                  <TextInput
                    value={form.potDepth}
                    onChangeText={(v) => set('potDepth', v)}
                    keyboardType="numeric"
                    placeholder="14"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                  />
                </Field>
              </View>
            </View>
            <Field label={t.addPlant.potMaterial} colors={colors}>
              <View style={styles.grid2}>
                {t.addPlant.potMaterials.map((m, i) => (
                  <Pill
                    key={m}
                    label={m}
                    selected={form.potMaterialIndex === i}
                    onPress={() => {
                      set('potMaterialIndex', i);
                      applyWaterSuggestion(speciesBaseWaterDays, { potMaterialIndex: i });
                    }}
                    colors={colors}
                    wide
                  />
                ))}
              </View>
            </Field>
            <Field label={t.addPlant.drainageHoles} colors={colors}>
              <View style={styles.grid2}>
                <Pill
                  label={t.addPlant.yes}
                  selected={form.drainage === 'yes'}
                  onPress={() => {
                    set('drainage', 'yes');
                    applyWaterSuggestion(speciesBaseWaterDays, { drainage: 'yes' });
                  }}
                  colors={colors}
                  wide
                />
                <Pill
                  label={t.addPlant.no}
                  selected={form.drainage === 'no'}
                  onPress={() => {
                    set('drainage', 'no');
                    applyWaterSuggestion(speciesBaseWaterDays, { drainage: 'no' });
                  }}
                  colors={colors}
                  wide
                />
              </View>
            </Field>
            <Field label={t.addPlant.soilMix} colors={colors}>
              <TextInput
                value={form.soilMix}
                onChangeText={(v) => set('soilMix', v)}
                placeholder={t.addPlant.soilMixPlaceholder}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              />
            </Field>
            <Field label={t.addPlant.lastRepotted} colors={colors}>
              <TextInput
                value={form.lastRepotted}
                onChangeText={(v) => set('lastRepotted', v)}
                placeholder={t.addPlant.datePlaceholder}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              />
            </Field>
          </View>
        )}

        {step === 4 && (
          <View style={styles.fieldGroup}>
            {!isEditing && (
              <View style={[styles.suggestionBanner, { backgroundColor: colors.tintMuted }]}>
                <Text style={[styles.suggestionTitle, { color: colors.text }]}>{t.addPlant.suggestionTitle}</Text>
                <Text style={[styles.suggestionHint, { color: colors.textSecondary }]}>{t.addPlant.suggestionHint}</Text>
              </View>
            )}

            <Field label={t.addPlant.waterEveryDays} colors={colors}>
              <View style={styles.stepperRow}>
                <Pressable
                  onPress={() => {
                    setWaterIntervalTouched(true);
                    set('waterEveryDays', Math.max(1, form.waterEveryDays - 1));
                  }}
                  style={[styles.stepperButton, { backgroundColor: colors.backgroundSelected }]}>
                  <Text style={[styles.stepperSymbol, { color: colors.text }]}>–</Text>
                </Pressable>
                <Text style={[styles.stepperValue, { color: colors.text }]}>{form.waterEveryDays}</Text>
                <Pressable
                  onPress={() => {
                    setWaterIntervalTouched(true);
                    set('waterEveryDays', form.waterEveryDays + 1);
                  }}
                  style={[styles.stepperButton, { backgroundColor: colors.backgroundSelected }]}>
                  <Text style={[styles.stepperSymbol, { color: colors.text }]}>+</Text>
                </Pressable>
              </View>
            </Field>

            <Field label={t.addPlant.waterAmount} colors={colors}>
              <TextInput
                value={form.waterAmountMl}
                onChangeText={(v) => set('waterAmountMl', v)}
                keyboardType="numeric"
                placeholder="250"
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              />
            </Field>

            {!isEditing && (
              <Field label={t.addPlant.lastWatered} colors={colors}>
                <TextInput
                  value={form.lastWatered}
                  onChangeText={(v) => set('lastWatered', v)}
                  placeholder={t.addPlant.datePlaceholder}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                />
              </Field>
            )}

            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryHeading, { color: colors.text }]}>{t.addPlant.summary}</Text>
              <View style={styles.summaryGrid}>
                <SummaryItem label={t.addPlant.summaryName} value={form.nickname || '—'} colors={colors} />
                <SummaryItem label={t.addPlant.summarySpecies} value={form.species || '—'} colors={colors} />
                <SummaryItem label={t.addPlant.summaryRoom} value={form.room || '—'} colors={colors} />
                <SummaryItem label={t.addPlant.summaryLight} value={t.addPlant.lightLevels[form.lightLevelIndex].label} colors={colors} />
                <SummaryItem label={t.addPlant.summaryWaterEvery} value={t.addPlant.summaryDays(form.waterEveryDays)} colors={colors} />
                <SummaryItem label={t.addPlant.summaryAmount} value={`${form.waterAmountMl || '—'}ml`} colors={colors} />
                <SummaryItem
                  label={t.addPlant.summaryPot}
                  value={form.potDiameter ? `${form.potDiameter}cm ${t.addPlant.potMaterials[form.potMaterialIndex].toLowerCase()}` : t.addPlant.potMaterials[form.potMaterialIndex]}
                  colors={colors}
                />
                <SummaryItem label={t.addPlant.summarySoil} value={form.soilMix || t.addPlant.soilMixPlaceholder} colors={colors} />
              </View>
            </View>

            {isEditing && (
              <View style={styles.deleteSection}>
                {!deleteConfirm ? (
                  <Pressable onPress={() => setDeleteConfirm(true)} style={styles.deleteLink}>
                    <Text style={[styles.deleteLinkText, { color: colors.accent }]}>{t.addPlant.deletePlant}</Text>
                  </Pressable>
                ) : (
                  <View style={[styles.deleteConfirmBox, { backgroundColor: colors.accentMuted, borderColor: colors.accent }]}>
                    <Text style={[styles.deleteConfirmText, { color: colors.text }]}>{t.addPlant.deleteConfirm}</Text>
                    <View style={styles.deleteConfirmActions}>
                      <Pressable
                        onPress={() => setDeleteConfirm(false)}
                        style={[styles.deleteCancelButton, { backgroundColor: colors.backgroundSelected }]}>
                        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 13 }}>{t.addPlant.deleteCancel}</Text>
                      </Pressable>
                      <Pressable onPress={handleDelete} style={[styles.deleteConfirmButton, { backgroundColor: colors.accent }]}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{t.addPlant.deleteConfirmYes}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable onPress={handleBack} style={[styles.footerBack, { backgroundColor: colors.backgroundSelected }]}>
          <Text style={[styles.footerBackText, { color: colors.text }]}>{t.addPlant.backButton}</Text>
        </Pressable>
        <Pressable
          onPress={handleContinue}
          disabled={!canContinue}
          style={[styles.footerContinue, { backgroundColor: colors.tint, opacity: canContinue ? 1 : 0.5 }]}>
          <Text style={styles.footerContinueText}>
            {step === 4 ? (isEditing ? t.addPlant.saveChanges : t.addPlant.addPlant) : t.addPlant.continue}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={speciesSuggestions.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setSpeciesDropdownDismissed(true)}>
        <Pressable style={styles.speciesModalBackdrop} onPress={() => setSpeciesDropdownDismissed(true)}>
          <View style={[styles.speciesModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              {speciesSuggestions.map((entry) => (
                <Pressable
                  key={entry.name}
                  onPress={() => applySpeciesGuide(entry)}
                  style={styles.speciesSuggestionRow}>
                  <Text style={[styles.speciesSuggestionName, { color: colors.text }]}>{entry.name}</Text>
                  <Text style={[styles.speciesSuggestionHint, { color: colors.textSecondary }]}>
                    {t.addPlant.speciesGuideHint(entry.waterEveryDays)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, colors, children }: { label: string; colors: ReturnType<typeof useTheme>; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      {children}
    </View>
  );
}

function Pill({
  label,
  selected,
  onPress,
  colors,
  wide,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>;
  wide?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pillOption,
        wide && styles.pillWide,
        { backgroundColor: selected ? colors.tint : colors.card, borderColor: selected ? colors.tint : colors.border },
      ]}>
      <Text style={[styles.pillOptionText, { color: selected ? '#fff' : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function OptionRow({
  title,
  subtitle,
  selected,
  onPress,
  colors,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.optionRow,
        { backgroundColor: selected ? colors.tintMuted : colors.card, borderColor: selected ? colors.tint : colors.border },
      ]}>
      <View>
        <Text style={[styles.optionTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.optionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>
      {selected && <Text style={{ color: colors.tint, fontWeight: '700' }}>✓</Text>}
    </Pressable>
  );
}

function SummaryItem({ label, value, colors }: { label: string; value: string; colors: ReturnType<typeof useTheme> }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.four, paddingBottom: Spacing.six, gap: Spacing.one },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backText: { fontSize: 14, fontWeight: '600' },
  stepCount: { fontSize: 13 },
  title: { fontSize: 26, marginTop: Spacing.two },
  stepTitle: { fontSize: 13, fontWeight: '700', marginBottom: Spacing.two },
  progressRow: { flexDirection: 'row', gap: 4, marginBottom: Spacing.three },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  fieldGroup: { gap: Spacing.three },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '700' },
  input: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 46, fontSize: 14 },
  measureButton: { borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', paddingVertical: 12, alignItems: 'center' },
  measureButtonText: { fontSize: 13, fontWeight: '700' },
  speciesModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingTop: 90,
    paddingHorizontal: Spacing.four,
  },
  speciesModalCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', maxHeight: 340 },
  speciesSuggestionRow: { paddingHorizontal: 14, paddingVertical: 12, gap: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.2)' },
  speciesSuggestionName: { fontSize: 13, fontWeight: '700' },
  speciesSuggestionHint: { fontSize: 11 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pillOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  pillWide: { flexBasis: '48%' },
  pillOptionText: { fontSize: 13, fontWeight: '700' },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: Spacing.two,
  },
  optionTitle: { fontSize: 14, fontWeight: '700' },
  optionSubtitle: { fontSize: 12 },
  twoCol: { flexDirection: 'row', gap: Spacing.two },
  flex1: { flex: 1 },
  suggestionBanner: { borderRadius: 14, padding: Spacing.two, gap: 2 },
  suggestionTitle: { fontSize: 13, fontWeight: '700' },
  suggestionHint: { fontSize: 12 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.four, alignSelf: 'flex-start' },
  stepperButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepperSymbol: { fontSize: 18, fontWeight: '700' },
  stepperValue: { fontSize: 20, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  summaryCard: { borderRadius: 16, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  summaryHeading: { fontSize: 14, fontWeight: '700' },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  summaryItem: { width: '47%', gap: 2 },
  summaryLabel: { fontSize: 11 },
  summaryValue: { fontSize: 13, fontWeight: '700' },
  deleteSection: { alignItems: 'center', marginTop: Spacing.two },
  deleteLink: { paddingVertical: 8 },
  deleteLinkText: { fontSize: 13, fontWeight: '700' },
  deleteConfirmBox: { borderRadius: 14, borderWidth: 1, padding: Spacing.three, gap: Spacing.two, width: '100%' },
  deleteConfirmText: { fontSize: 13, lineHeight: 19 },
  deleteConfirmActions: { flexDirection: 'row', gap: Spacing.two },
  deleteCancelButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  deleteConfirmButton: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  footer: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.four,
    borderTopWidth: 1,
  },
  footerBack: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  footerBackText: { fontWeight: '700' },
  footerContinue: { flex: 2, borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  footerContinueText: { color: '#fff', fontWeight: '700' },
});
