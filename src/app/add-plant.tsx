import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlowBackground, GradientFill } from '@/components/glass';
import { DateField } from '@/components/date-field';
import { PhotoPicker } from '@/components/photo-picker';
import { isOutdoorRoom, ROOM_KEYS, RoomKey } from '@/constants/rooms';
import { Spacing } from '@/constants/theme';
import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/hooks/use-theme';
import { usePlants } from '@/context/plants-context';
import { useSettings } from '@/context/settings-context';
import { CareTask, JournalEntry, Plant } from '@/data/plants';
import {
  findSpeciesMatches,
  HeatingSensitivity,
  LightKey,
  LIGHT_KEYS,
  POT_MATERIAL_KEYS,
  PotMaterialKey,
  SpeciesRecord,
  speciesDisplayName,
  SeasonProfile,
  seasonProfileFor,
} from '@/data/species-guide';
import { recomputeWateringInterval, WINDOW_DISTANCE_OPTIONS, wateringSchedule, suggestWaterAmountMl } from '@/utils/watering-algorithm';
import { awaitLightMeterResult } from '@/utils/light-meter';

const DEFAULT_REPOT_INTERVAL_DAYS = 365;
const GENERIC_BASE_INTERVAL_DAYS = 7;

const AVATAR_COLORS = ['#DDE7D2', '#E4E9DA', '#DCE9D9', '#E8F0E2', '#DFE9D6', '#E6E2D2', '#DEE7D8', '#EDE6D6'];

function formatDate(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function todayFormatted() {
  return formatDate(new Date());
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
  windowDistanceCm: number;
  lightKey: LightKey;
  potDiameter: string;
  potMaterialKey: PotMaterialKey;
  drainage: 'yes' | 'no';
  rainExposed: 'yes' | 'no';
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
  windowDistanceCm: 100,
  lightKey: 'part_sun',
  potDiameter: '',
  potMaterialKey: 'plastic',
  drainage: 'yes',
  rainExposed: 'no',
  soilMix: '',
  lastRepotted: '',
  waterEveryDays: 7,
  waterAmountMl: String(suggestWaterAmountMl(null, true)),
  lastWatered: todayFormatted(),
};

function daysAgoToDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

function plantToForm(plant: Plant): FormState {
  const repot = plant.care.find((c) => c.type === 'repot');
  return {
    photoUri: plant.photoUri,
    nickname: plant.name,
    species: plant.species === '—' ? '' : plant.species,
    latinName: plant.latinName,
    dateAcquired: plant.acquiredDate,
    roomKey: plant.roomKey,
    customRoom: plant.customRoom ?? '',
    windowDistanceCm: plant.environment.windowDistanceCm,
    lightKey: plant.environment.lightKey,
    potDiameter: plant.pot.diameterCm != null ? String(plant.pot.diameterCm) : '',
    potMaterialKey: plant.pot.materialKey,
    drainage: plant.pot.hasDrainage ? 'yes' : 'no',
    rainExposed: plant.rainExposed ? 'yes' : 'no',
    soilMix: plant.pot.soil,
    lastRepotted: repot ? formatDate(daysAgoToDate(repot.lastDoneDaysAgo)) : '',
    waterEveryDays: plant.wateringIntervalDays,
    waterAmountMl: String(plant.wateringAmountMl),
    lastWatered: formatDate(daysAgoToDate(plant.lastWateredDaysAgo)),
  };
}

export default function AddPlantScreen() {
  const colors = useTheme();
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { seasonalAdjustment, heatingOn, latitude } = useSettings();
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
  const [speciesSeasonProfile, setSpeciesSeasonProfile] = useState<SeasonProfile>(() => editingPlant?.seasonProfile ?? 'normal');
  const [speciesRepotIntervalDays, setSpeciesRepotIntervalDays] = useState(
    () => editingPlant?.care.find((c) => c.type === 'repot')?.intervalDays ?? DEFAULT_REPOT_INTERVAL_DAYS
  );
  // True once the user has picked their own interval with the stepper — that
  // choice is then saved as the plant's custom interval and the algorithm
  // stops overriding it, until they tap "back to automatic".
  const [waterIntervalTouched, setWaterIntervalTouched] = useState(() => editingPlant?.customIntervalDays != null);
  const [waterAmountTouched, setWaterAmountTouched] = useState(() => (editingPlant ? !editingPlant.amountAuto : false));

  if (isEditing && !editingPlant) {
    return (
      <View style={[styles.safe, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: colors.text }}>{t.plantDetail.notFound}</Text>
      </View>
    );
  }

  /** Whether a room choice makes the plant an outdoor one. A custom ("other")
   * room has no fixed answer, so an edited plant keeps the one it had. */
  const outdoorIn = (roomKey: RoomKey) => isOutdoorRoom(roomKey) || (roomKey === 'other' && editingPlant?.indoor === false);
  const isOutdoor = outdoorIn(form.roomKey);

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
        seasonProfile: speciesSeasonProfile,
        pot: {
          materialKey: next.potMaterialKey,
          diameterCm: next.potDiameter ? Number(next.potDiameter) : null,
          hasDrainage: next.drainage === 'yes',
        },
        environment: { lightKey: next.lightKey, windowDistanceCm: next.windowDistanceCm },
        indoor: !outdoorIn(next.roomKey),
      },
      new Date(),
      { applySeasonalFactors: seasonalAdjustment, heatingOn, latitude }
    );
  };

  /** The pot-size-based amount for the current (or about-to-be) answers. */
  const suggestedAmount = (overrides: Partial<FormState> = {}) => {
    const next = { ...form, ...overrides };
    return String(suggestWaterAmountMl(next.potDiameter ? Number(next.potDiameter) : null, next.drainage === 'yes'));
  };

  const applyWaterSuggestion = (overrides: Partial<FormState> = {}) => {
    if (!waterAmountTouched) set('waterAmountMl', suggestedAmount(overrides));
    if (waterIntervalTouched) return;
    set('waterEveryDays', computeSuggestion(overrides));
  };

  const applySpeciesGuide = (entry: SpeciesRecord) => {
    setSpeciesPickApplied(true);
    setSpeciesBaseInterval(entry.water.baseIntervalDays);
    setSpeciesHeatingSensitivity(entry.heatingSensitivity);
    setSpeciesSeasonProfile(seasonProfileFor(entry));
    setSpeciesRepotIntervalDays(entry.repotEveryMonths * 30);
    setForm((prev) => {
      const next: FormState = { ...prev, species: speciesDisplayName(entry, lang), latinName: entry.scientificName, lightKey: entry.light.preferred };
      // A balcony/terrace species most likely lives outside: suggest the
      // balcony unless the user already picked an outdoor room.
      if (entry.category === 'outdoor' && !outdoorIn(next.roomKey)) next.roomKey = 'balcony';
      if (waterIntervalTouched) return next;
      return {
        ...next,
        waterEveryDays: recomputeWateringInterval(
          {
            baseIntervalDays: entry.water.baseIntervalDays,
            heatingSensitivity: entry.heatingSensitivity,
            seasonProfile: seasonProfileFor(entry),
            pot: {
          materialKey: next.potMaterialKey,
          diameterCm: next.potDiameter ? Number(next.potDiameter) : null,
          hasDrainage: next.drainage === 'yes',
        },
            environment: { lightKey: next.lightKey, windowDistanceCm: next.windowDistanceCm },
            indoor: !outdoorIn(next.roomKey),
          },
          new Date(),
          { applySeasonalFactors: seasonalAdjustment, heatingOn, latitude }
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
    const sharedFields = {
      photoUri: form.photoUri,
      name: form.nickname.trim(),
      species: form.species.trim() || '—',
      latinName: form.latinName.trim(),
      roomKey: form.roomKey,
      customRoom: form.roomKey === 'other' ? form.customRoom.trim() || null : null,
      wateringAmountMl: Number(form.waterAmountMl) || Number(suggestedAmount()),
      amountAuto: !waterAmountTouched,
      rainExposed: isOutdoor && form.rainExposed === 'yes',
      environment: { lightKey: form.lightKey, windowDistanceCm: form.windowDistanceCm },
      pot: {
        materialKey: form.potMaterialKey,
        diameterCm: form.potDiameter ? Number(form.potDiameter) : null,
        hasDrainage: form.drainage === 'yes',
        soil: form.soilMix.trim(),
      },
      acquiredDate: form.dateAcquired,
      customIntervalDays: waterIntervalTouched ? form.waterEveryDays : null,
    };
    // An edited plant keeps what soil feedback taught about it.
    const learnedAdjust = editingPlant?.intervalAdjust ?? 1;
    const wateringIntervalDays = waterIntervalTouched
      ? form.waterEveryDays
      : Math.max(1, Math.round(computeSuggestion() * learnedAdjust));
    const lastWateredDaysAgo = daysAgoFrom(form.lastWatered);

    const repotDaysAgo = form.lastRepotted ? daysAgoFrom(form.lastRepotted) : null;

    if (editingPlant) {
      // Correcting the last-watered date starts the countdown over from it.
      const snoozeDays = lastWateredDaysAgo === editingPlant.lastWateredDaysAgo ? editingPlant.snoozeDays : 0;
      let care = editingPlant.care;
      if (repotDaysAgo !== null) {
        const existing = care.find((c) => c.type === 'repot');
        care = existing
          ? care.map((c) => (c.type === 'repot' ? { ...c, lastDoneDaysAgo: repotDaysAgo, intervalDays: speciesRepotIntervalDays } : c))
          : [...care, { type: 'repot', intervalDays: speciesRepotIntervalDays, lastDoneDaysAgo: repotDaysAgo }];
      }
      updatePlant(editingPlant.id, {
        ...sharedFields,
        wateringIntervalDays,
        baseIntervalDays: speciesBaseInterval,
        heatingSensitivity: speciesHeatingSensitivity,
        seasonProfile: speciesSeasonProfile,
        indoor: !isOutdoor,
        lastWateredDaysAgo,
        snoozeDays,
        ...wateringSchedule(wateringIntervalDays, lastWateredDaysAgo, snoozeDays),
        care,
      });
      router.replace(`/plant/${editingPlant.id}`);
      return;
    }

    const id = `${form.nickname.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const care: CareTask[] =
      repotDaysAgo !== null ? [{ type: 'repot', intervalDays: speciesRepotIntervalDays, lastDoneDaysAgo: repotDaysAgo }] : [];
    const wateredEntry: JournalEntry = {
      id: `watered-${Date.now()}`,
      type: 'watered',
      title: t.plantDetail.journal.wateredTitle,
      description: t.plantDetail.journal.wateredDesc(sharedFields.wateringAmountMl),
      daysAgo: lastWateredDaysAgo,
    };
    const newPlant: Plant = {
      id,
      ...sharedFields,
      emoji: '🌱',
      avatarColor: AVATAR_COLORS[plants.length % AVATAR_COLORS.length],
      wateringIntervalDays,
      baseIntervalDays: speciesBaseInterval,
      heatingSensitivity: speciesHeatingSensitivity,
      seasonProfile: speciesSeasonProfile,
      indoor: !isOutdoor,
      lastWateredDaysAgo,
      snoozeDays: 0,
      intervalAdjust: 1,
      ...wateringSchedule(wateringIntervalDays, lastWateredDaysAgo, 0),
      care,
      // The last watering the user told us about is a real event, so it
      // belongs in the history from day one.
      journalNotes: [wateredEntry],
      createdDaysAgo: 0,
    };
    addPlant(newPlant);
    router.replace(`/plant/${id}`);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <GlowBackground />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <Pressable onPress={handleBack}>
            <Text style={[styles.backText, { color: colors.textSecondary }]}>
              {step === 1 ? t.addPlant.close : t.addPlant.back}
            </Text>
          </Pressable>
          <Text style={[styles.stepCount, { color: colors.textSecondary }]}>{t.addPlant.stepOf(step)}</Text>
        </View>

        <Text style={[styles.title, { color: colors.text, fontWeight: '700' }]}>
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
                style={[styles.input, { color: colors.text, backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
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
                style={[styles.input, { color: colors.text, backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
              />
            </Field>
            <Field label={t.addPlant.latinName} colors={colors}>
              <TextInput
                value={form.latinName}
                onChangeText={(v) => set('latinName', v)}
                placeholder={t.addPlant.latinNamePlaceholder}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
              />
            </Field>
            <Field label={t.addPlant.dateAcquired} colors={colors}>
<DateField
                value={parseFormattedDate(form.dateAcquired) ?? new Date()}
                mode="date"
                maximumDate={new Date()}
                onChange={(d) => set('dateAcquired', formatDate(d))}
                displayText={form.dateAcquired || t.addPlant.datePlaceholder}
                textColor={colors.text}
                backgroundColor={colors.backgroundSelected}
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
                    onPress={() => {
                      set('roomKey', key);
                      applyWaterSuggestion({ roomKey: key });
                    }}
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
                  style={[styles.input, { marginTop: 8, color: colors.text, backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
                />
              )}
            </Field>
            {isOutdoor && (
              <Field label={t.addPlant.rainExposed} colors={colors}>
                <View style={styles.grid2}>
                  <Pill label={t.addPlant.rainExposedYes} selected={form.rainExposed === 'yes'} onPress={() => set('rainExposed', 'yes')} colors={colors} wide />
                  <Pill label={t.addPlant.rainExposedNo} selected={form.rainExposed === 'no'} onPress={() => set('rainExposed', 'no')} colors={colors} wide />
                </View>
                <Text style={[styles.intervalNote, { color: colors.textSecondary }]}>{t.addPlant.rainExposedNote}</Text>
              </Field>
            )}
            <Field label={t.addPlant.windowDistance} colors={colors}>
              <View style={styles.grid2}>
                {WINDOW_DISTANCE_OPTIONS.map((cm) => (
                  <Pill
                    key={cm}
                    label={t.addPlant.windowDistances[cm]}
                    selected={form.windowDistanceCm === cm}
                    onPress={() => {
                      set('windowDistanceCm', cm);
                      applyWaterSuggestion({ windowDistanceCm: cm });
                    }}
                    colors={colors}
                    wide
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
          </View>
        )}

        {step === 3 && (
          <View style={styles.fieldGroup}>
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
                style={[styles.input, { color: colors.text, backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
              />
            </Field>
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
                  onPress={() => {
                    set('drainage', 'yes');
                    applyWaterSuggestion({ drainage: 'yes' });
                  }}
                  colors={colors}
                  wide
                />
                <Pill
                  label={t.addPlant.no}
                  selected={form.drainage === 'no'}
                  onPress={() => {
                    set('drainage', 'no');
                    applyWaterSuggestion({ drainage: 'no' });
                  }}
                  colors={colors}
                  wide
                />
              </View>
              {form.drainage === 'no' && (
                <Text style={[styles.intervalNote, { color: colors.textSecondary }]}>{t.addPlant.noDrainageNote}</Text>
              )}
            </Field>
            <Field label={t.addPlant.soilMix} colors={colors}>
              <TextInput
                value={form.soilMix}
                onChangeText={(v) => set('soilMix', v)}
                placeholder={t.addPlant.soilMixPlaceholder}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
              />
            </Field>
            <Field label={t.addPlant.lastRepotted} colors={colors}>
<DateField
                value={parseFormattedDate(form.lastRepotted)}
                mode="date"
                maximumDate={new Date()}
                onChange={(d) => set('lastRepotted', formatDate(d))}
                displayText={form.lastRepotted || t.addPlant.datePlaceholder}
                textColor={colors.text}
                backgroundColor={colors.backgroundSelected}
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
              {waterIntervalTouched ? (
                <Pressable
                  onPress={() => {
                    setWaterIntervalTouched(false);
                    set('waterEveryDays', computeSuggestion());
                  }}>
                  <Text style={[styles.intervalNote, { color: colors.tint }]}>{t.addPlant.intervalBackToAuto}</Text>
                </Pressable>
              ) : (
                <Text style={[styles.intervalNote, { color: colors.textSecondary }]}>{t.addPlant.intervalAutoNote}</Text>
              )}
            </Field>

            <Field label={t.addPlant.waterAmount} colors={colors}>
              <TextInput
                value={form.waterAmountMl}
                onChangeText={(v) => {
                  setWaterAmountTouched(true);
                  set('waterAmountMl', v);
                }}
                keyboardType="numeric"
                placeholder={suggestedAmount()}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, backgroundColor: colors.glass, borderColor: colors.glassBorder }]}
              />
              {Number(form.waterAmountMl) > 0 && (
                <Text style={[styles.intervalNote, { color: colors.text }]}>{t.water.approxSentence(Number(form.waterAmountMl))}</Text>
              )}
              {waterAmountTouched ? (
                <Pressable
                  onPress={() => {
                    setWaterAmountTouched(false);
                    set('waterAmountMl', suggestedAmount());
                  }}>
                  <Text style={[styles.intervalNote, { color: colors.tint }]}>{t.addPlant.amountBackToAuto(Number(suggestedAmount()))}</Text>
                </Pressable>
              ) : (
                <Text style={[styles.intervalNote, { color: colors.textSecondary }]}>{t.addPlant.amountAutoNote}</Text>
              )}
            </Field>

            <Field label={t.addPlant.lastWatered} colors={colors}>
              <DateField
                value={parseFormattedDate(form.lastWatered) ?? new Date()}
                mode="date"
                maximumDate={new Date()}
                onChange={(d) => set('lastWatered', formatDate(d))}
                displayText={form.lastWatered}
                textColor={colors.text}
                backgroundColor={colors.backgroundSelected}
              />
            </Field>

            <View style={[styles.summaryCard, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
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
                <SummaryItem label={t.addPlant.summarySoil} value={form.soilMix || '—'} colors={colors} />
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
          <GradientFill stops={[colors.gradientFrom, colors.gradientTo]} />
          <Text style={[styles.footerContinueText, { color: colors.onTint }]}>
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
        { backgroundColor: selected ? colors.tint : colors.glass, borderColor: selected ? colors.tint : colors.glassBorder },
      ]}>
      <Text style={[styles.pillOptionText, { color: selected ? colors.onTint : colors.text }]}>{label}</Text>
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
        { backgroundColor: selected ? colors.tintMuted : colors.glass, borderColor: selected ? colors.tint : colors.glassBorder },
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
  intervalNote: { fontSize: 12, marginTop: 6 },
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
  footerContinue: { flex: 2, borderRadius: 16, overflow: 'hidden', paddingVertical: 14, alignItems: 'center' },
  footerContinueText: { color: '#fff', fontWeight: '700' },
});
