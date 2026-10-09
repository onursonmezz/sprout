import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientFill } from '@/components/glass';
import { PhotoPicker } from '@/components/photo-picker';
import { isOutdoorRoom, ROOM_KEYS, RoomKey } from '@/constants/rooms';
import { useLanguage } from '@/context/language-context';
import { usePlants } from '@/context/plants-context';
import { useSettings } from '@/context/settings-context';
import { JournalEntryType, Plant } from '@/data/plants';
import { LIGHT_KEYS, LightKey, POT_MATERIAL_KEYS, PotMaterialKey } from '@/data/species-guide';
import { useTheme } from '@/hooks/use-theme';
import { hapticSuccess } from '@/utils/haptics';
import { effectiveWateringInterval, softenIntervalAdjust, WINDOW_DISTANCE_OPTIONS } from '@/utils/watering-algorithm';

type View_ = 'menu' | 'place' | 'pot' | 'photo' | 'journal';

const POT_SIZES = [
  { key: 'small', cm: 10 },
  { key: 'medium', cm: 15 },
  { key: 'large', cm: 22 },
  { key: 'xlarge', cm: 30 },
] as const;

/** Journal kinds offered here. Waterings and repottings are logged by the
 * actions that actually do them, so they are not typed in by hand. */
const JOURNAL_TYPES: JournalEntryType[] = ['newLeaf', 'fertilized', 'pruned', 'note'];

const MENU: { view: Exclude<View_, 'menu'>; icon: keyof typeof Ionicons.glyphMap }[] = [
  { view: 'place', icon: 'location-outline' },
  { view: 'pot', icon: 'flower-outline' },
  { view: 'photo', icon: 'camera-outline' },
  { view: 'journal', icon: 'create-outline' },
];

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? colors.tint : colors.backgroundSelected, borderColor: selected ? colors.tint : colors.border }]}>
      <Text style={[styles.chipText, { color: selected ? colors.onTint : colors.text }]}>{label}</Text>
    </Pressable>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  const colors = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      {children}
    </View>
  );
}

function SaveButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.save}>
      <GradientFill stops={[colors.gradientFrom, colors.gradientTo]} />
      <Text style={[styles.saveText, { color: colors.onTint }]}>{label}</Text>
    </Pressable>
  );
}

/**
 * The sheet that opens when a plant card is held down: change one thing about
 * a plant and get out, without going through its page and the full edit form.
 * Rendered once at the app root; any card opens it through the plants store.
 */
export function PlantQuickActions() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const { quickActionsPlantId, closeQuickActions, getPlant, changePlantConditions, updatePlant, addJournalEntry } = usePlants();
  const { seasonalAdjustment, heatingOn, latitude } = useSettings();
  const plant = quickActionsPlantId ? getPlant(quickActionsPlantId) : undefined;

  const [view, setView] = useState<View_>('menu');
  // Place
  const [roomKey, setRoomKey] = useState<RoomKey>('living_room');
  const [customRoom, setCustomRoom] = useState('');
  const [lightKey, setLightKey] = useState<LightKey>('part_sun');
  const [windowDistanceCm, setWindowDistanceCm] = useState(100);
  const [rainExposed, setRainExposed] = useState(false);
  // Pot
  const [diameter, setDiameter] = useState('');
  const [materialKey, setMaterialKey] = useState<PotMaterialKey>('plastic');
  const [hasDrainage, setHasDrainage] = useState(true);
  const [soil, setSoil] = useState('');
  // Journal
  const [journalType, setJournalType] = useState<JournalEntryType>('newLeaf');
  const [journalTitle, setJournalTitle] = useState('');
  const [journalText, setJournalText] = useState('');
  const [journalPhoto, setJournalPhoto] = useState<string | null>(null);

  // Every time the sheet opens for a plant, start from the menu with that plant's current values.
  useEffect(() => {
    if (!plant) return;
    setView('menu');
    setRoomKey(plant.roomKey);
    setCustomRoom(plant.customRoom ?? '');
    setLightKey(plant.environment.lightKey);
    setWindowDistanceCm(plant.environment.windowDistanceCm);
    setRainExposed(plant.rainExposed);
    setDiameter(plant.pot.diameterCm != null ? String(plant.pot.diameterCm) : '');
    setMaterialKey(plant.pot.materialKey);
    setHasDrainage(plant.pot.hasDrainage);
    setSoil(plant.pot.soil);
    setJournalType('newLeaf');
    setJournalTitle('');
    setJournalText('');
    setJournalPhoto(null);
    // Only when a different plant's sheet opens, not on every change to the plant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickActionsPlantId]);

  if (!plant) return null;

  const outdoor = isOutdoorRoom(roomKey) || (roomKey === 'other' && !plant.indoor);
  const options = { applySeasonalFactors: seasonalAdjustment, heatingOn, latitude };

  /** What the watering interval would become with the values on screen. */
  const previewInterval = (changed: Partial<Pick<Plant, 'indoor' | 'environment' | 'pot'>>) =>
    effectiveWateringInterval({ ...plant, ...changed, intervalAdjust: softenIntervalAdjust(plant.intervalAdjust) }, new Date(), options);

  const intervalNote = (next: number) =>
    plant.customIntervalDays != null
      ? t.quick.intervalCustom
      : next === plant.wateringIntervalDays
        ? t.quick.intervalSame(next)
        : t.quick.intervalChange(plant.wateringIntervalDays, next);

  const done = () => {
    hapticSuccess();
    closeQuickActions();
  };

  const savePlace = () => {
    changePlantConditions(plant.id, {
      kind: 'place',
      roomKey,
      customRoom: roomKey === 'other' ? customRoom.trim() || null : null,
      lightKey,
      windowDistanceCm,
      rainExposed: outdoor && rainExposed,
    });
    done();
  };

  const diameterCm = diameter ? Number(diameter) || null : null;

  const savePot = () => {
    changePlantConditions(plant.id, {
      kind: 'pot',
      diameterCm,
      materialKey,
      hasDrainage,
      soil: soil.trim(),
      journalTitle: t.plantDetail.journal.typeNames.repotted,
    });
    done();
  };

  const saveJournal = () => {
    addJournalEntry(plant.id, {
      id: `entry-${Date.now()}`,
      type: journalType,
      title: journalTitle.trim() || t.plantDetail.journal.typeNames[journalType],
      description: journalText.trim(),
      daysAgo: 0,
      photoUri: journalPhoto,
    });
    done();
  };

  const inputStyle = [styles.input, { color: colors.text, backgroundColor: colors.backgroundSelected, borderColor: colors.border }];

  return (
    <Modal visible transparent animationType="slide" onRequestClose={closeQuickActions}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.backdrop} onPress={closeQuickActions} />
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.header}>
            {view !== 'menu' && (
              <Pressable onPress={() => setView('menu')} hitSlop={10} accessibilityLabel={t.quick.back}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
            )}
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {view === 'menu' ? plant.name : t.quick.actions[view]}
            </Text>
            <Pressable onPress={closeQuickActions} hitSlop={10} accessibilityLabel={t.quick.close}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
            {view === 'menu' &&
              MENU.map((item) => (
                <Pressable
                  key={item.view}
                  onPress={() => setView(item.view)}
                  style={[styles.menuRow, { backgroundColor: colors.backgroundSelected }]}>
                  <Ionicons name={item.icon} size={20} color={colors.tintBright} />
                  <Text style={[styles.menuText, { color: colors.text }]}>{t.quick.actions[item.view]}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                </Pressable>
              ))}

            {view === 'place' && (
              <>
                <Section label={t.addPlant.room}>
                  <View style={styles.chips}>
                    {ROOM_KEYS.map((key) => (
                      <Chip key={key} label={t.addPlant.rooms[key]} selected={roomKey === key} onPress={() => setRoomKey(key)} />
                    ))}
                  </View>
                  {roomKey === 'other' && (
                    <TextInput
                      value={customRoom}
                      onChangeText={setCustomRoom}
                      placeholder={t.quick.customRoomPlaceholder}
                      placeholderTextColor={colors.textSecondary}
                      style={inputStyle}
                    />
                  )}
                </Section>
                {outdoor && (
                  <Section label={t.addPlant.rainExposed}>
                    <View style={styles.chips}>
                      <Chip label={t.addPlant.rainExposedYes} selected={rainExposed} onPress={() => setRainExposed(true)} />
                      <Chip label={t.addPlant.rainExposedNo} selected={!rainExposed} onPress={() => setRainExposed(false)} />
                    </View>
                  </Section>
                )}
                <Section label={t.addPlant.lightLevel}>
                  <View style={styles.chips}>
                    {LIGHT_KEYS.map((key) => (
                      <Chip key={key} label={t.addPlant.lightLevels[key].label} selected={lightKey === key} onPress={() => setLightKey(key)} />
                    ))}
                  </View>
                </Section>
                <Section label={t.addPlant.windowDistance}>
                  <View style={styles.chips}>
                    {WINDOW_DISTANCE_OPTIONS.map((cm) => (
                      <Chip key={cm} label={t.addPlant.windowDistances[cm]} selected={windowDistanceCm === cm} onPress={() => setWindowDistanceCm(cm)} />
                    ))}
                  </View>
                </Section>
                <Text style={[styles.note, { color: colors.textSecondary }]}>
                  {intervalNote(previewInterval({ indoor: !outdoor, environment: { lightKey, windowDistanceCm } }))}
                </Text>
                <SaveButton label={t.quick.save} onPress={savePlace} />
              </>
            )}

            {view === 'pot' && (
              <>
                <Section label={t.addPlant.potDiameter}>
                  <View style={styles.chips}>
                    {POT_SIZES.map(({ key, cm }) => (
                      <Chip key={key} label={t.addPlant.potSizes[key]} selected={diameter === String(cm)} onPress={() => setDiameter(String(cm))} />
                    ))}
                  </View>
                  <TextInput
                    value={diameter}
                    onChangeText={setDiameter}
                    keyboardType="numeric"
                    placeholder={t.addPlant.potDiameterOrCm}
                    placeholderTextColor={colors.textSecondary}
                    style={inputStyle}
                  />
                </Section>
                <Section label={t.addPlant.potMaterial}>
                  <View style={styles.chips}>
                    {POT_MATERIAL_KEYS.map((key) => (
                      <Chip key={key} label={t.addPlant.potMaterials[key]} selected={materialKey === key} onPress={() => setMaterialKey(key)} />
                    ))}
                  </View>
                </Section>
                <Section label={t.addPlant.drainageHoles}>
                  <View style={styles.chips}>
                    <Chip label={t.addPlant.yes} selected={hasDrainage} onPress={() => setHasDrainage(true)} />
                    <Chip label={t.addPlant.no} selected={!hasDrainage} onPress={() => setHasDrainage(false)} />
                  </View>
                </Section>
                <Section label={t.addPlant.soilMix}>
                  <TextInput
                    value={soil}
                    onChangeText={setSoil}
                    placeholder={t.addPlant.soilMixPlaceholder}
                    placeholderTextColor={colors.textSecondary}
                    style={inputStyle}
                  />
                </Section>
                <Text style={[styles.note, { color: colors.textSecondary }]}>
                  {intervalNote(previewInterval({ pot: { ...plant.pot, diameterCm, materialKey, hasDrainage } }))} {t.quick.repotLogged}
                </Text>
                <SaveButton label={t.quick.save} onPress={savePot} />
              </>
            )}

            {view === 'photo' && (
              <PhotoPicker
                uri={plant.photoUri}
                onChange={(uri) => {
                  updatePlant(plant.id, { photoUri: uri });
                  done();
                }}
                colors={colors}
                t={t}
              />
            )}

            {view === 'journal' && (
              <>
                <View style={styles.chips}>
                  {JOURNAL_TYPES.map((type) => (
                    <Chip key={type} label={t.plantDetail.journal.typeNames[type]} selected={journalType === type} onPress={() => setJournalType(type)} />
                  ))}
                </View>
                <TextInput
                  value={journalTitle}
                  onChangeText={setJournalTitle}
                  placeholder={t.plantDetail.journal.typeNames[journalType]}
                  placeholderTextColor={colors.textSecondary}
                  style={inputStyle}
                />
                <TextInput
                  value={journalText}
                  onChangeText={setJournalText}
                  placeholder={t.plantDetail.journal.descriptionPlaceholder}
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  style={[inputStyle, styles.multiline]}
                />
                <PhotoPicker uri={journalPhoto} onChange={setJournalPhoto} colors={colors} t={t} height={110} />
                <SaveButton label={t.plantDetail.journal.save} onPress={saveJournal} />
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: '86%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, paddingTop: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingBottom: 10 },
  title: { flex: 1, fontSize: 18, fontWeight: '700' },
  body: { paddingHorizontal: 18, paddingBottom: 8, gap: 14 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 15 },
  menuText: { flex: 1, fontSize: 15, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  chipText: { fontSize: 13, fontWeight: '600' },
  input: { borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, height: 46, fontSize: 14 },
  multiline: { height: 90, paddingTop: 12, textAlignVertical: 'top' },
  note: { fontSize: 12, lineHeight: 17 },
  save: { overflow: 'hidden', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '700' },
});
