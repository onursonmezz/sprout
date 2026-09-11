import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { CareTask, JournalEntry, Plant, WateringStatus } from '@/data/plants';
import { loadJSON, saveJSON } from '@/utils/storage';

const STATE_KEY = 'sprout:plants-state';
// Pre-migration keys: plants and the fastForward anchor used to be saved as two
// separate, unawaited AsyncStorage writes, which could desync if the app was
// killed between them. Read once for existing installs, then never written again.
const LEGACY_PLANTS_KEY = 'sprout:plants';
const LEGACY_SAVED_AT_KEY = 'sprout:plants-saved-at';
// Read-only peek at settings-context's own storage key for the seasonal
// watering factor. Plants-context sits outside SettingsProvider in the tree
// (see _layout.tsx) so it can't use useSettings(); reading the same
// AsyncStorage key directly avoids reordering the providers for this alone.
const SETTINGS_KEY = 'sprout:settings';

type PersistedState = { plants: Plant[]; savedAt: string };

/** Plants persisted before wateringIntervalDays existed don't have it —
 * fall back to what the field replaced (lastWateredDaysAgo + daysUntilWatering). */
function migratePlant(p: Plant): Plant {
  if (typeof p.wateringIntervalDays === 'number') return p;
  return { ...p, wateringIntervalDays: Math.max(1, p.lastWateredDaysAgo + p.daysUntilWatering) };
}

type PlantsContextValue = {
  plants: Plant[];
  addPlant: (plant: Plant) => void;
  updatePlant: (plantId: string, updates: Partial<Plant>) => void;
  deletePlant: (plantId: string) => void;
  getPlant: (id: string) => Plant | undefined;
  addCareTask: (plantId: string, task: CareTask) => void;
  completeCareTask: (plantId: string, taskIndex: number) => void;
  addJournalEntry: (plantId: string, entry: JournalEntry) => void;
  waterPlant: (plantId: string) => void;
  snoozePlant: (plantId: string) => void;
  resetPlants: () => void;
  /** Replaces all local plants with a restored backup, fast-forwarding its
   * relative fields by however long has passed since the backup was made. */
  restorePlants: (plants: Plant[], savedAt: string) => void;
  loaded: boolean;
};

const PlantsContext = createContext<PlantsContextValue | null>(null);

/** Whole days of real elapsed time between two timestamps. Using elapsed
 * milliseconds (rather than diffing local-calendar dates) keeps this correct
 * even if the device's timezone changes between saves, e.g. after a flight. */
function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86400000);
}

/**
 * Plant "days ago" / "days until" fields are relative snapshots, so a plant
 * saved as "in 7 days" would still read "in 7 days" a week later unless we
 * roll every relative field forward by however long the app was closed.
 *
 * `seasonalFactor` scales only the watering countdown (not lastWateredDaysAgo,
 * care tasks, or journal history, which reflect real elapsed time) — warmer
 * weather makes it tick down faster, colder weather slower. 1 = no effect.
 */
function fastForward(plants: Plant[], daysPassed: number, seasonalFactor = 1): Plant[] {
  if (daysPassed <= 0) return plants;
  const wateringDaysPassed = daysPassed * seasonalFactor;
  return plants.map((p) => {
    const daysUntilWatering = Math.round(p.daysUntilWatering - wateringDaysPassed);
    const status: WateringStatus = daysUntilWatering < 0 ? 'overdue' : daysUntilWatering === 0 ? 'dueToday' : 'upcoming';
    return {
      ...p,
      lastWateredDaysAgo: p.lastWateredDaysAgo + daysPassed,
      daysUntilWatering,
      status,
      care: p.care.map((c) => ({ ...c, lastDoneDaysAgo: c.lastDoneDaysAgo + daysPassed })),
      journalNotes: p.journalNotes.map((j) => ({ ...j, daysAgo: j.daysAgo + daysPassed })),
    };
  });
}

export function PlantsProvider({ children }: { children: ReactNode }) {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      let state = await loadJSON<PersistedState | null>(STATE_KEY, null);
      if (!state) {
        const [legacyPlants, legacySavedAt] = await Promise.all([
          loadJSON<Plant[]>(LEGACY_PLANTS_KEY, []),
          loadJSON<string | null>(LEGACY_SAVED_AT_KEY, null),
        ]);
        state = { plants: legacyPlants, savedAt: legacySavedAt ?? new Date().toISOString() };
      }
      const migrated = state.plants.map(migratePlant);
      const daysPassed = Math.max(0, daysBetween(new Date(state.savedAt), new Date()));
      const settings = await loadJSON<{ seasonalAdjustment?: boolean; seasonalFactor?: number } | null>(
        SETTINGS_KEY,
        null
      );
      const seasonalFactor = settings?.seasonalAdjustment ? settings.seasonalFactor ?? 1 : 1;
      setPlants(fastForward(migrated, daysPassed, seasonalFactor));
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveJSON(STATE_KEY, { plants, savedAt: new Date().toISOString() } satisfies PersistedState);
  }, [plants, loaded]);

  const addPlant = (plant: Plant) => setPlants((prev) => [plant, ...prev]);
  const getPlant = (id: string) => plants.find((p) => p.id === id);

  const updatePlant = (plantId: string, updates: Partial<Plant>) =>
    setPlants((prev) => prev.map((p) => (p.id === plantId ? { ...p, ...updates } : p)));

  const deletePlant = (plantId: string) => setPlants((prev) => prev.filter((p) => p.id !== plantId));

  const resetPlants = () => setPlants([]);

  const restorePlants = (restored: Plant[], savedAt: string) => {
    const migrated = restored.map(migratePlant);
    const daysPassed = Math.max(0, daysBetween(new Date(savedAt), new Date()));
    setPlants(fastForward(migrated, daysPassed));
  };

  const addCareTask = (plantId: string, task: CareTask) =>
    setPlants((prev) => prev.map((p) => (p.id === plantId ? { ...p, care: [...p.care, task] } : p)));

  const completeCareTask = (plantId: string, taskIndex: number) =>
    setPlants((prev) =>
      prev.map((p) =>
        p.id === plantId
          ? { ...p, care: p.care.map((c, i) => (i === taskIndex ? { ...c, lastDoneDaysAgo: 0 } : c)) }
          : p
      )
    );

  const addJournalEntry = (plantId: string, entry: JournalEntry) =>
    setPlants((prev) =>
      prev.map((p) => (p.id === plantId ? { ...p, journalNotes: [entry, ...p.journalNotes] } : p))
    );

  const waterPlant = (plantId: string) =>
    setPlants((prev) =>
      prev.map((p) => {
        if (p.id !== plantId) return p;
        return { ...p, lastWateredDaysAgo: 0, daysUntilWatering: p.wateringIntervalDays, status: 'upcoming' };
      })
    );

  const snoozePlant = (plantId: string) =>
    setPlants((prev) =>
      prev.map((p) => {
        if (p.id !== plantId) return p;
        const daysUntilWatering = p.daysUntilWatering + 1;
        const status: WateringStatus = daysUntilWatering < 0 ? 'overdue' : daysUntilWatering === 0 ? 'dueToday' : 'upcoming';
        return { ...p, daysUntilWatering, status };
      })
    );

  return (
    <PlantsContext.Provider
      value={{
        plants,
        addPlant,
        updatePlant,
        deletePlant,
        getPlant,
        addCareTask,
        completeCareTask,
        addJournalEntry,
        waterPlant,
        snoozePlant,
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
