import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PhotoPicker } from '@/components/photo-picker';
import { ROOM_KEYS, RoomKey } from '@/constants/rooms';
import { Fonts, Spacing } from '@/constants/theme';
import { translations, Translations } from '@/constants/translations';
import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/hooks/use-theme';
import { usePlants } from '@/context/plants-context';
import { useSettings } from '@/context/settings-context';
import { CareTask, Plant, WateringStatus } from '@/data/plants';
import {
  findSpeciesMatches,
  HeatingSensitivity,
  LightKey,
  LIGHT_KEYS,
  POT_MATERIAL_KEYS,
  PotMaterialKey,
  SpeciesRecord,
  speciesDisplayName,
} from '@/data/species-guide';
import { recomputeWateringInterval } from '@/utils/watering-algorithm';
import { awaitLightMeterResult } from '@/utils/light-meter';

const DEFAULT_REPOT_INTERVAL_DAYS = 365;
const GENERIC_BASE_INTERVAL_DAYS = 7;

const WINDOW_DIRECTIONS = ['N', 'E', 'S', 'W'] as const;
const AVATAR_COLORS = ['#DDE7D2', '#E4E9DA', '#DCE9D9', '#E8F0E2', '#DFE9D6', '#E6E2D2', '#DEE7D8', '#EDE6D6'];
const ALL_LANGUAGES = Object.values(translations) as Translations[];

function todayFormatted() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

/** Drainage is still stored as a translated display label (not a canonical
 * key like light/pot-material), so a plant saved in one language must still
 * resolve correctly after the app language changes. */
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
  roomKey: RoomKey;
  customRoom: string;
  windowDirection: (typeof WINDOW_DIRECTIONS)[number];
  lightKey: LightKey;
  hoursLight: string;
  tempC: string;
  potDiameter: string;
  potDepth: string;
  potMaterialKey: PotMaterialKey;
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
  roomKey: 'living_room',
  customRoom: '',
  windowDirection: 'E',
  lightKey: 'part_sun',
  hoursLight: '',
  tempC: '',
  potDiameter: '',
  potDepth: '',
  potMaterialKey: 'plastic',
  drainage: 'yes',
  soilMix: '',
  lastRepotted: '',
  waterEveryDays: 7,
  waterAmountMl: '',
  lastWatered: todayFormatted(),
};

function plantToForm(plant: Plant): FormState {
  const windowRaw = plant.environment.window.split('-')[0];
  const windowDirection = (WINDOW_DIRECTIONS as readonly string[]).includes(windowRaw)
    ? (windowRaw as (typeof WINDOW_DIRECTIONS)[number])
    : 'E';
  const hasPotSize = plant.pot.size !== '—';
  const [, potDepthRaw] = hasPotSize ? plant.pot.size.split('x') : ['', ''];

  return {
    photoUri: plant.photoUri,
    nickname: plant.name,
    species: plant.species === '—' ? '' : plant.species,
    latinName: plant.latinName,
    dateAcquired: plant.acquiredDate,
    roomKey: plant.roomKey,
    customRoom: plant.customRoom ?? '',
    windowDirection,
    lightKey: plant.environment.lightKey,
    hoursLight: plant.environment.hoursLight === '—' ? '' : plant.environment.hoursLight.replace('h Light', ''),
    tempC: plant.environment.tempC === '—' ? '' : plant.environment.tempC.replace('°C', ''),
    potDiameter: plant.pot.diameterCm != null ? String(plant.pot.diameterCm) : '',
    potDepth: hasPotSize ? potDepthRaw.replace('cm', '') : '',
    potMaterialKey: plant.pot.materialKey,
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
  const { t, lang } = useLanguage();
  const { seasonalAdjustment } = useSettings();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { plants, addPlant, updatePlant, deletePlant, getPlant } = usePlants();
  const editingPlant = id ? getPlant(String(id)) : undefined;
  const isEditing = Boolean(id);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(() => (editingPlant ? plantToForm(editingPlant) : initialForm));
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [speciesPickApplied, setSpeciesPickApplied] = useState(false);
  const [speciesDropdownDismissed, setSpeciesDropdownDismissed] = useState(false);
  // Species-derived fields the watering algorithm needs but that aren't part
  // of the visible form — seeded from the matched species on pick, or from
  // the plant being edited so its live recalculation stays consistent.
  const [speciesBaseInterval, setSpeciesBaseInterval] = useState(() => editingPlant?.baseIntervalDays ?? GENERIC_BASE_INTERVAL_DAYS);
  const [speciesHeatingSensitivity, setSpeciesHeatingSensitivity] = useState<HeatingSensitivity>(
    () => editingPlant?.heatingSensitivity ?? 'med'
  );
  const [speciesIndoor, setSpeciesIndoor] = useState(() => editingPlant?.indoor ?? true);
  const [speciesRepotIntervalDays, setSpeciesRepotIntervalDays] = useState(
    () => editingPlant?.care.find((c) => c.type === 'repot')?.intervalDays ?? DEFAULT_REPOT_INTERVAL_DAYS
  );
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

  /** Recomputes the suggested watering interval from the current species
   * base + pot/light answers and today's calendar month — unless the user
   * has already manually adjusted the stepper themselves, whose choice wins. */
  const computeSuggestion = (overrides: Partial<FormState> = {}) => {
    const next = { ...form, ...overrides };
    return recomputeWateringInterval(
      {
        baseIntervalDays: speciesBaseInterval,
        heatingSensitivity: speciesHeatingSensitivity,
        pot: { materialKey: next.potMaterialKey, diameterCm: next.potDiameter ? Number(next.potDiameter) : null },
        environment: { lightKey: next.lightKey },
        indoor: speciesIndoor,
      },
      new Date(),
      seasonalAdjustment
    );
  };

  const applyWaterSuggestion = (overrides: Partial<FormState> = {}) => {
    if (waterIntervalTouched) return;
    set('waterEveryDays', computeSuggestion(overrides));
  };

  const applySpeciesGuide = (entry: SpeciesRecord) => {
    setSpeciesPickApplied(true);
    setSpeciesBaseInterval(entry.water.baseIntervalDays);
    setSpeciesHeatingSensitivity(entry.heatingSensitivity);
    setSpeciesIndoor(entry.category !== 'outdoor');
    setSpeciesRepotIntervalDays(entry.repotEveryMonths * 30);
    setForm((prev) => {
      const next: FormState = { ...prev, species: speciesDisplayName(entry, lang), latinName: entry.scientificName, lightKey: entry.light.preferred };
      if (waterIntervalTouched) return next;
      return {
        ...next,
        waterEveryDays: recomputeWateringInterval(
          {
            baseIntervalDays: entry.water.baseIntervalDays,
            heatingSensitivity: entry.heatingSensitivity,
            pot: { materialKey: next.potMaterialKey, diameterCm: next.potDiameter ? Number(next.potDiameter) : null },
            environment: { lightKey: next.lightKey },
            indoor: entry.category !== 'outdoor',
          },
          new Date(),
          seasonalAdjustment
        ),
      };
    });
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
    const drainageLabel = form.drainage === 'yes' ? t.addPlant.yes : t.addPlant.no;

    const sharedFields = {
      photoUri: form.photoUri,
      name: form.nickname.trim(),
      species: form.species.trim() || '—',
      latinName: form.latinName.trim(),
      roomKey: form.roomKey,
      customRoom: form.roomKey === 'other' ? form.customRoom.trim() || null : null,
      wateringAmountMl: Number(form.waterAmountMl) || 200,
      environment: {
        lightKey: form.lightKey,
        window: `${form.windowDirection}-Facing`,
        hoursLight: form.hoursLight ? `${form.hoursLight}h Light` : '—',
        humidity: editingPlant?.environment.humidity ?? 'Medium',
        tempC: form.tempC ? `${form.tempC}°C` : '—',
      },
      pot: {
        size: form.potDiameter && form.potDepth ? `${form.potDiameter}x${form.potDepth}cm` : '—',
        materialKey: form.potMaterialKey,
        diameterCm: form.potDiameter ? Number(form.potDiameter) : null,
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
          ? care.map((c) => (c.type === 'repot' ? { ...c, lastDoneDaysAgo: repotDaysAgo, intervalDays: speciesRepotIntervalDays } : c))
          : [...care, { type: 'repot', intervalDays: speciesRepotIntervalDays, lastDoneDaysAgo: repotDaysAgo }];
      }
      updatePlant(editingPlant.id, {
        ...sharedFields,
        wateringIntervalDays: form.waterEveryDays,
        baseIntervalDays: speciesBaseInterval,
        heatingSensitivity: speciesHeatingSensitivity,
        indoor: speciesIndoor,
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
      repotDaysAgo !== null ? [{ type: 'repot', intervalDays: speciesRepotIntervalDays, lastDoneDaysAgo: repotDaysAgo }] : [];
    const newPlant: Plant = {
      id,
      ...sharedFields,
      emoji: '🌱',
      avatarColor: AVATAR_COLORS[plants.length % AVATAR_COLORS.length],
      status: daysUntilWatering <= 0 ? (daysUntilWatering < 0 ? 'overdue' : 'dueToday') : 'upcoming',
      wateringIntervalDays: form.waterEveryDays,
      baseIntervalDays: speciesBaseInterval,
      heatingSensitivity: speciesHeatingSensitivity,
      indoor: speciesIndoor,
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
              <View style={styles.grid2}>
                {ROOM_KEYS.map((key) => (
                  <Pill
                    key={key}
                    label={t.addPlant.rooms[key]}
                    selected={form.roomKey === key}
                    onPress={() => set('roomKey', key)}
                    colors={colors}
                    wide
                  />
                ))}
              </View>
              {form.roomKey === 'other' && (
                <TextInput
                  value={form.customRoom}
                  onChangeText={(v) => set('customRoom', v)}
                  placeholder={t.addPlant.roomPlaceholder}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, { marginTop: 8, color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                />
              )}
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
                {LIGHT_KEYS.map((key) => {
                  const level = t.addPlant.lightLevels[key];
                  return (
                    <OptionRow
                      key={key}
                      title={level.label}
                      subtitle={level.hint}
                      selected={form.lightKey === key}
                      onPress={() => {
                        set('lightKey', key);
                        applyWaterSuggestion({ lightKey: key });
                      }}
                      colors={colors}
                    />
                  );
                })}
                <Pressable
                  onPress={() => {
                    awaitLightMeterResult((key: LightKey) => {
                      set('lightKey', key);
                      applyWaterSuggestion({ lightKey: key });
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
                    onChangeText={(v) => {
                      set('potDiameter', v);
                      applyWaterSuggestion({ potDiameter: v });
                    }}
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
                {POT_MATERIAL_KEYS.map((key) => (
                  <Pill
                    key={key}
                    label={t.addPlant.potMaterials[key]}
                    selected={form.potMaterialKey === key}
                    onPress={() => {
                      set('potMaterialKey', key);
                      applyWaterSuggestion({ potMaterialKey: key });
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
                  onPress={() => set('drainage', 'yes')}
                  colors={colors}
                  wide
                />
                <Pill
                  label={t.addPlant.no}
                  selected={form.drainage === 'no'}
                  onPress={() => set('drainage', 'no')}
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
                <SummaryItem
                  label={t.addPlant.summaryRoom}
                  value={form.roomKey === 'other' ? form.customRoom || t.addPlant.rooms.other : t.addPlant.rooms[form.roomKey]}
                  colors={colors}
                />
                <SummaryItem label={t.addPlant.summaryLight} value={t.addPlant.lightLevels[form.lightKey].label} colors={colors} />
                <SummaryItem label={t.addPlant.summaryWaterEvery} value={t.addPlant.summaryDays(form.waterEveryDays)} colors={colors} />
                <SummaryItem label={t.addPlant.summaryAmount} value={`${form.waterAmountMl || '—'}ml`} colors={colors} />
                <SummaryItem
                  label={t.addPlant.summaryPot}
                  value={
                    form.potDiameter
                      ? `${form.potDiameter}cm ${t.addPlant.potMaterials[form.potMaterialKey].toLowerCase()}`
                      : t.addPlant.potMaterials[form.potMaterialKey]
                  }
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

      {speciesSuggestions.length > 0 && (
        // A plain absolutely-positioned overlay, not <Modal> — Modal opens a
        // real native Dialog window on Android, which steals window focus
        // from the Species TextInput and dismisses the keyboard on every
        // keystroke. A View overlay has no window of its own, so typing
        // keeps the keyboard up while the list below updates live.
        <Pressable style={styles.speciesModalBackdrop} onPress={() => setSpeciesDropdownDismissed(true)}>
          <View style={[styles.speciesModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ScrollView keyboardShouldPersistTaps="always">
              {speciesSuggestions.map((entry) => (
                <Pressable key={entry.id} onPress={() => applySpeciesGuide(entry)} style={styles.speciesSuggestionRow}>
                  <Text style={[styles.speciesSuggestionName, { color: colors.text }]}>{speciesDisplayName(entry, lang)}</Text>
                  <Text style={[styles.speciesSuggestionHint, { color: colors.textSecondary }]}>
                    {t.addPlant.speciesGuideHint(entry.water.baseIntervalDays)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      )}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingTop: 90,
    paddingHorizontal: Spacing.four,
    zIndex: 50,
    elevation: 50,
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
