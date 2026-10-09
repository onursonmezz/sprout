import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { isOutdoorRoom, RoomKey } from '@/constants/rooms';
import { careJournalType, CareTask, JournalEntry, Plant } from '@/data/plants';
import { findSpeciesLoose, HeatingSensitivity, LightKey, PotMaterialKey, SeasonProfile, seasonProfileFor } from '@/data/species-guide';
import { defaultCareTasks, speciesOf, withDefaultCare } from '@/utils/care';
import { loadJSON, saveJSON } from '@/utils/storage';
import {
  DEFAULT_WINDOW_DISTANCE_CM,
  effectiveLastWatered,
  effectiveWateringInterval,
  learnIntervalAdjust,
  recomputeWateringInterval,
  SoilFeedback,
  suggestWaterAmountMl,
  SeasonalOptions,
  wateringSchedule,
} from '@/utils/watering-algorithm';

// New schema (materialKey/lightKey/baseIntervalDays/etc. replacing the old
// species-guide's plain display strings) — a fresh key means every existing
// install starts over with zero plants rather than trying to migrate
// incompatible data, per the switch to the new plant database.
const STATE_KEY = 'sprout:plants-state-v2';
// Read-only peek at settings-context's own storage key for the seasonal
// watering factor. Plants-context sits outside SettingsProvider in the tree
// (see _layout.tsx) so it can't use useSettings(); reading the same
// AsyncStorage key directly avoids reordering the providers for this alone.
const SETTINGS_KEY = 'sprout:settings';

type PersistedState = { plants: Plant[]; savedAt: string };

/**
 * Defensive against plants saved before this schema existed — most notably a
 * cloud backup made before the pot/light fields switched from translated
 * display strings to canonical keys. Falls back to generic assumptions
 * rather than crashing recomputeWateringInterval on a missing field.
 */
function seasonProfileOf(p: { species: string; latinName: string }): SeasonProfile {
  const species = findSpeciesLoose(p.species) ?? findSpeciesLoose(p.latinName);
  return species ? seasonProfileFor(species) : 'normal';
}

function migratePlant(p: Plant): Plant {
  const legacy = p as unknown as {
    wateringIntervalDays?: number;
    createdDaysAgo?: number;
    baseIntervalDays?: number;
    heatingSensitivity?: HeatingSensitivity;
    seasonProfile?: SeasonProfile;
    indoor?: boolean;
    customIntervalDays?: number | null;
    intervalAdjust?: number;
    amountAuto?: boolean;
    rainExposed?: boolean;
    careDefaultsApplied?: boolean;
    snoozeDays?: number;
    environment?: { lightKey?: LightKey; windowDistanceCm?: number };
    pot?: { materialKey?: PotMaterialKey; diameterCm?: number | null; hasDrainage?: boolean; drainage?: string; soil?: string };
    roomKey?: RoomKey;
    customRoom?: string | null;
    /** Pre-room-picker plants stored a free-text display string here. */
    room?: string;
  };
  const wateringIntervalDays =
    typeof legacy.wateringIntervalDays === 'number' ? legacy.wateringIntervalDays : Math.max(1, p.lastWateredDaysAgo + p.daysUntilWatering);
  const hasRoomKey = typeof legacy.roomKey === 'string';
  let roomKey: RoomKey = hasRoomKey ? (legacy.roomKey as RoomKey) : legacy.room && legacy.room !== '—' ? 'other' : 'living_room';
  // "Outdoor" used to come from the species; now the room decides. A plant
  // saved as outdoor but filed under an indoor room moves to the balcony so
  // it keeps behaving as it did. A custom ("other") room keeps its own flag.
  if (legacy.indoor === false && !isOutdoorRoom(roomKey) && roomKey !== 'other') roomKey = 'balcony';
  const indoor = isOutdoorRoom(roomKey) ? false : roomKey === 'other' ? (legacy.indoor ?? true) : true;
  const hasDrainage =
    typeof legacy.pot?.hasDrainage === 'boolean' ? legacy.pot.hasDrainage : !['No', 'Hayır'].includes(legacy.pot?.drainage ?? '');
  // Before amounts were suggested from the pot, every plant started at the
  // fixed default of 200 ml — those are treated as "never chosen".
  const amountAuto = typeof legacy.amountAuto === 'boolean' ? legacy.amountAuto : p.wateringAmountMl === 200;
  return {
    ...p,
    wateringIntervalDays,
    createdDaysAgo: typeof legacy.createdDaysAgo === 'number' ? legacy.createdDaysAgo : 3650,
    baseIntervalDays: typeof legacy.baseIntervalDays === 'number' ? legacy.baseIntervalDays : wateringIntervalDays,
    heatingSensitivity: legacy.heatingSensitivity ?? 'med',
    // Plants saved before season profiles existed get theirs from the species
    // they were added as.
    seasonProfile: legacy.seasonProfile ?? seasonProfileOf(p),
    customIntervalDays: legacy.customIntervalDays ?? null,
    intervalAdjust: typeof legacy.intervalAdjust === 'number' ? legacy.intervalAdjust : 1,
    amountAuto,
    rainExposed: !indoor && (legacy.rainExposed ?? false),
    // Plants from before automatic care get it once, counted from today.
    care: legacy.careDefaultsApplied ? p.care : withDefaultCare(p.care, defaultCareTasks(speciesOf(p), indoor, null)),
    careDefaultsApplied: true,
    wateringAmountMl: amountAuto ? suggestWaterAmountMl(legacy.pot?.diameterCm ?? null, hasDrainage) : p.wateringAmountMl,
    snoozeDays: legacy.snoozeDays ?? 0,
    environment: {
      lightKey: legacy.environment?.lightKey ?? 'part_sun',
      windowDistanceCm: legacy.environment?.windowDistanceCm ?? DEFAULT_WINDOW_DISTANCE_CM,
    },
    pot: {
      materialKey: legacy.pot?.materialKey ?? 'plastic',
      diameterCm: legacy.pot?.diameterCm ?? null,
      // Older saves stored a translated "Yes"/"No" label instead of a boolean.
      hasDrainage,
      soil: legacy.pot?.soil ?? '',
    },
    roomKey,
    indoor,
    customRoom: hasRoomKey ? legacy.customRoom ?? null : legacy.room && legacy.room !== '—' ? legacy.room : null,
  };
}

/** The watering that just happened: what the undo / soil-question prompt works from. */
type PendingWatering = {
  plantId: string;
  /** Days the soil had gone without water. */
  elapsedDays: number;
  /** Whether the soil question is worth asking for this watering. */
  askSoil: boolean;
  /** The plant as it was just before, for undo. */
  before: Plant;
};

type PlantsContextValue = {
  plants: Plant[];
  addPlant: (plant: Plant) => void;
  updatePlant: (plantId: string, updates: Partial<Plant>) => void;
  deletePlant: (plantId: string) => void;
  getPlant: (id: string) => Plant | undefined;
  addCareTask: (plantId: string, task: CareTask) => void;
  removeCareTask: (plantId: string, taskIndex: number) => void;
  completeCareTask: (plantId: string, taskIndex: number, journalTitle: string) => void;
  addJournalEntry: (plantId: string, entry: JournalEntry) => void;
  waterPlant: (plantId: string) => void;
  snoozePlant: (plantId: string) => void;
  /** Set right after a watering that is worth asking about; drives the
   * "how was the soil?" prompt. */
  pendingFeedback: PendingWatering | null;
  answerWateringFeedback: (answer: SoilFeedback) => void;
  dismissWateringFeedback: () => void;
  /** Puts the plant back exactly as it was before its last watering. */
  undoWatering: () => void;
  /** Forgets what soil feedback taught for one plant. */
  resetIntervalAdjust: (plantId: string) => void;
  /** Re-applies the watering algorithm to every plant right away — called
   * when a setting that feeds it (seasonal adjustment, heating) changes. */
  recomputeIntervals: (options: SeasonalOptions) => void;
  resetPlants: () => void;
  /** Replaces all local plants with a restored backup, fast-forwarding its
   * relative fields by however long has passed since the backup was made. */
  restorePlants: (plants: Plant[], savedAt: string) => void;
  loaded: boolean;
};

const PlantsContext = createContext<PlantsContextValue | null>(null);

/** Calendar days between two moments, in the device's local time: saving at
 * 23:00 and reopening at 08:00 the next morning is one day, not zero. Counting
 * elapsed 24h blocks instead would drop the remainder every time the state is
 * re-saved, so plants would age slower than the calendar. */
function daysBetween(a: Date, b: Date) {
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((day(b) - day(a)) / 86400000);
}

/**
 * Plant "days ago" fields are relative snapshots, so a plant saved as
 * "watered 2 days ago" needs every such field rolled forward by however long
 * the app was closed. wateringIntervalDays is recomputed fresh each time
 * (rather than decremented) since it depends on today's calendar month —
 * this is what makes the watering algorithm's season/heating factors live
 * rather than frozen at whatever month the plant was added in.
 */
function fastForward(plants: Plant[], daysPassed: number, options: SeasonalOptions, today: Date): Plant[] {
  if (daysPassed <= 0) return plants;
  return plants.map((p) => {
    const lastWateredDaysAgo = p.lastWateredDaysAgo + daysPassed;
    const wateringIntervalDays = effectiveWateringInterval(p, today, options);
    return {
      ...p,
      lastWateredDaysAgo,
      createdDaysAgo: p.createdDaysAgo + daysPassed,
      wateringIntervalDays,
      ...wateringSchedule(wateringIntervalDays, effectiveLastWatered({ ...p, lastWateredDaysAgo }, options, today), p.snoozeDays),
      care: p.care.map((c) => ({ ...c, lastDoneDaysAgo: c.lastDoneDaysAgo + daysPassed })),
      journalNotes: p.journalNotes.map((j) => ({ ...j, daysAgo: j.daysAgo + daysPassed })),
    };
  });
}

/** The options most recently used — for the few synchronous actions (snooze,
 * the soil-feedback question) that cannot wait for storage. */
let latestOptions: SeasonalOptions = { applySeasonalFactors: true, heatingOn: true };

async function loadSeasonalOptions(): Promise<SeasonalOptions> {
  const settings = await loadJSON<{
    seasonalAdjustment?: boolean;
    heatingOn?: boolean;
    latitude?: number | null;
    lastRainDate?: string | null;
  } | null>(SETTINGS_KEY, null);
  latestOptions = {
    applySeasonalFactors: settings?.seasonalAdjustment ?? true,
    heatingOn: settings?.heatingOn ?? true,
    latitude: settings?.latitude ?? null,
    lastRainDate: settings?.lastRainDate ?? null,
  };
  return latestOptions;
}

export function PlantsProvider({ children }: { children: ReactNode }) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Tracks the last moment plants' relative fields are known to be caught up
  // to. Kept in a ref (not state) since it's only read by the rollover check
  // below, never rendered.
  const savedAtRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const state = await loadJSON<PersistedState | null>(STATE_KEY, null);
      const migrated = (state?.plants ?? []).map(migratePlant);
      const daysPassed = state ? Math.max(0, daysBetween(new Date(state.savedAt), new Date())) : 0;
      const options = await loadSeasonalOptions();
      setPlants(fastForward(migrated, daysPassed, options, new Date()));
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const savedAt = new Date().toISOString();
    savedAtRef.current = savedAt;
    saveJSON(STATE_KEY, { plants, savedAt } satisfies PersistedState);
  }, [plants, loaded]);

  // The initial load effect only fires once per JS context, so a day
  // boundary crossed while the app sits backgrounded (or just left open)
  // would never get applied until the process is fully killed and
  // relaunched. Re-check on every return to the foreground, and on a timer
  // in case the app is never backgrounded at all (screen left on overnight).
  useEffect(() => {
    if (!loaded) return;
    const checkRollover = async () => {
      if (!savedAtRef.current) return;
      const daysPassed = Math.max(0, daysBetween(new Date(savedAtRef.current), new Date()));
      if (daysPassed <= 0) return;
      const options = await loadSeasonalOptions();
      setPlants((prev) => fastForward(prev, daysPassed, options, new Date()));
    };
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') checkRollover();
    });
    const interval = setInterval(checkRollover, 15 * 60 * 1000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [loaded]);

  const addPlant = (plant: Plant) => setPlants((prev) => [plant, ...prev]);
  const getPlant = (id: string) => plants.find((p) => p.id === id);

  const updatePlant = (plantId: string, updates: Partial<Plant>) =>
    setPlants((prev) => prev.map((p) => (p.id === plantId ? { ...p, ...updates } : p)));

  const deletePlant = (plantId: string) => setPlants((prev) => prev.filter((p) => p.id !== plantId));

  const resetPlants = () => setPlants([]);

  const restorePlants = (restored: Plant[], savedAt: string) => {
    const migrated = restored.map(migratePlant);
    const daysPassed = Math.max(0, daysBetween(new Date(savedAt), new Date()));
    loadSeasonalOptions().then((options) => setPlants(fastForward(migrated, daysPassed, options, new Date())));
  };

  const addCareTask = (plantId: string, task: CareTask) =>
    setPlants((prev) => prev.map((p) => (p.id === plantId ? { ...p, care: [...p.care, task] } : p)));

  const removeCareTask = (plantId: string, taskIndex: number) =>
    setPlants((prev) => prev.map((p) => (p.id === plantId ? { ...p, care: p.care.filter((_, i) => i !== taskIndex) } : p)));

  // Completing a task also logs it, so History shows what was actually done
  // rather than what the schedule implies.
  const completeCareTask = (plantId: string, taskIndex: number, journalTitle: string) =>
    setPlants((prev) =>
      prev.map((p) => {
        if (p.id !== plantId || !p.care[taskIndex]) return p;
        const entry: JournalEntry = {
          id: `care-${Date.now()}`,
          type: careJournalType[p.care[taskIndex].type],
          title: journalTitle,
          description: '',
          daysAgo: 0,
        };
        return {
          ...p,
          care: p.care.map((c, i) => (i === taskIndex ? { ...c, lastDoneDaysAgo: 0 } : c)),
          journalNotes: [entry, ...p.journalNotes],
        };
      })
    );

  const addJournalEntry = (plantId: string, entry: JournalEntry) =>
    setPlants((prev) =>
      prev.map((p) => (p.id === plantId ? { ...p, journalNotes: [entry, ...p.journalNotes] } : p))
    );

  const [pendingFeedback, setPendingFeedback] = useState<PendingWatering | null>(null);

  const waterPlant = (plantId: string) => {
    // Only ask about the soil when the answer can teach something: the
    // algorithm (not a custom interval) is in charge, and enough days have
    // passed for the soil's state to mean anything.
    const before = plants.find((p) => p.id === plantId);
    const elapsedDays = before ? effectiveLastWatered(before, latestOptions, new Date()) : 0;
    setPendingFeedback(
      before ? { plantId, elapsedDays, askSoil: before.customIntervalDays == null && elapsedDays >= 2, before } : null
    );
    (async () => {
      const options = await loadSeasonalOptions();
      const today = new Date();
      setPlants((prev) =>
        prev.map((p) => {
          if (p.id !== plantId) return p;
          const wateringIntervalDays = effectiveWateringInterval(p, today, options);
          return { ...p, lastWateredDaysAgo: 0, snoozeDays: 0, wateringIntervalDays, ...wateringSchedule(wateringIntervalDays, 0, 0) };
        })
      );
    })();
  };

  const applyIntervalAdjust = (plantId: string, nextAdjust: (p: Plant, algoInterval: number) => number) => {
    (async () => {
      const options = await loadSeasonalOptions();
      const today = new Date();
      setPlants((prev) =>
        prev.map((p) => {
          if (p.id !== plantId) return p;
          const adjusted = { ...p, intervalAdjust: nextAdjust(p, recomputeWateringInterval(p, today, options)) };
          const wateringIntervalDays = effectiveWateringInterval(adjusted, today, options);
          return {
            ...adjusted,
            wateringIntervalDays,
            ...wateringSchedule(wateringIntervalDays, effectiveLastWatered(p, options, today), p.snoozeDays),
          };
        })
      );
    })();
  };

  const answerWateringFeedback = (answer: SoilFeedback) => {
    if (!pendingFeedback || !pendingFeedback.askSoil) return;
    const { plantId, elapsedDays } = pendingFeedback;
    setPendingFeedback(null);
    applyIntervalAdjust(plantId, (p, algoInterval) => learnIntervalAdjust(p.intervalAdjust, algoInterval, elapsedDays, answer));
  };

  const dismissWateringFeedback = () => setPendingFeedback(null);

  const undoWatering = () => {
    if (!pendingFeedback) return;
    const { before } = pendingFeedback;
    setPendingFeedback(null);
    setPlants((prev) => prev.map((p) => (p.id === before.id ? before : p)));
  };

  const resetIntervalAdjust = (plantId: string) => applyIntervalAdjust(plantId, () => 1);

  const snoozePlant = (plantId: string) =>
    setPlants((prev) =>
      prev.map((p) => {
        if (p.id !== plantId) return p;
        // Snoozing a due/overdue plant means "remind me tomorrow", not "one
        // day less overdue"; an upcoming one just moves a day further out.
        const target = Math.max(1, p.daysUntilWatering + 1);
        const last = effectiveLastWatered(p, latestOptions, new Date());
        const snoozeDays = target - (p.wateringIntervalDays - last);
        return { ...p, snoozeDays, ...wateringSchedule(p.wateringIntervalDays, last, snoozeDays) };
      })
    );

  const recomputeIntervals = (options: SeasonalOptions) => {
    latestOptions = options;
    setPlants((prev) => {
      const today = new Date();
      let changed = false;
      const next = prev.map((p) => {
        const wateringIntervalDays = effectiveWateringInterval(p, today, options);
        const schedule = wateringSchedule(wateringIntervalDays, effectiveLastWatered(p, options, today), p.snoozeDays);
        // A rainy day moves the countdown without touching the interval.
        if (wateringIntervalDays === p.wateringIntervalDays && schedule.daysUntilWatering === p.daysUntilWatering) return p;
        changed = true;
        return { ...p, wateringIntervalDays, ...schedule };
      });
      return changed ? next : prev;
    });
  };

  return (
    <PlantsContext.Provider
      value={{
        plants,
        addPlant,
        updatePlant,
        deletePlant,
        getPlant,
        addCareTask,
        removeCareTask,
        completeCareTask,
        addJournalEntry,
        waterPlant,
        snoozePlant,
        pendingFeedback,
        answerWateringFeedback,
        dismissWateringFeedback,
        undoWatering,
        resetIntervalAdjust,
        recomputeIntervals,
        resetPlants,
        restorePlants,
        loaded,
      }}>
      {children}
    </PlantsContext.Provider>
  );
}

export function usePlants() {
  const ctx = useContext(PlantsContext);
  if (!ctx) throw new Error('usePlants must be used within a PlantsProvider');
  return ctx;
}
