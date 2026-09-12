import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { CareTask, JournalEntry, Plant, WateringStatus } from '@/data/plants';
import { HeatingSensitivity, LightKey, PotMaterialKey } from '@/data/species-guide';
import { loadJSON, saveJSON } from '@/utils/storage';
import { recomputeWateringInterval } from '@/utils/watering-algorithm';

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
function migratePlant(p: Plant): Plant {
  const legacy = p as unknown as {
    wateringIntervalDays?: number;
    createdDaysAgo?: number;
    baseIntervalDays?: number;
    heatingSensitivity?: HeatingSensitivity;
    indoor?: boolean;
    environment?: { lightKey?: LightKey };
    pot?: { materialKey?: PotMaterialKey; diameterCm?: number | null };
  };
  const wateringIntervalDays =
    typeof legacy.wateringIntervalDays === 'number' ? legacy.wateringIntervalDays : Math.max(1, p.lastWateredDaysAgo + p.daysUntilWatering);
  return {
    ...p,
    wateringIntervalDays,
    createdDaysAgo: typeof legacy.createdDaysAgo === 'number' ? legacy.createdDaysAgo : 3650,
    baseIntervalDays: typeof legacy.baseIntervalDays === 'number' ? legacy.baseIntervalDays : wateringIntervalDays,
    heatingSensitivity: legacy.heatingSensitivity ?? 'med',
    indoor: typeof legacy.indoor === 'boolean' ? legacy.indoor : true,
    environment: { ...p.environment, lightKey: legacy.environment?.lightKey ?? 'part_sun' },
    pot: { ...p.pot, materialKey: legacy.pot?.materialKey ?? 'plastic', diameterCm: legacy.pot?.diameterCm ?? null },
  };
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
 * Plant "days ago" fields are relative snapshots, so a plant saved as
 * "watered 2 days ago" needs every such field rolled forward by however long
 * the app was closed. wateringIntervalDays is recomputed fresh each time
 * (rather than decremented) since it depends on today's calendar month —
 * this is what makes the watering algorithm's season/heating factors live
 * rather than frozen at whatever month the plant was added in.
 */
function fastForward(plants: Plant[], daysPassed: number, applySeasonalFactors: boolean, today: Date): Plant[] {
  if (daysPassed <= 0) return plants;
  return plants.map((p) => {
    const lastWateredDaysAgo = p.lastWateredDaysAgo + daysPassed;
    const wateringIntervalDays = recomputeWateringInterval(p, today, applySeasonalFactors);
    const daysUntilWatering = wateringIntervalDays - lastWateredDaysAgo;
    const status: WateringStatus = daysUntilWatering < 0 ? 'overdue' : daysUntilWatering === 0 ? 'dueToday' : 'upcoming';
    return {
      ...p,
      lastWateredDaysAgo,
      createdDaysAgo: p.createdDaysAgo + daysPassed,
      wateringIntervalDays,
      daysUntilWatering,
      status,
      care: p.care.map((c) => ({ ...c, lastDoneDaysAgo: c.lastDoneDaysAgo + daysPassed })),
      journalNotes: p.journalNotes.map((j) => ({ ...j, daysAgo: j.daysAgo + daysPassed })),
    };
  });
}

async function isSeasonalAdjustmentEnabled(): Promise<boolean> {
  const settings = await loadJSON<{ seasonalAdjustment?: boolean } | null>(SETTINGS_KEY, null);
  return settings?.seasonalAdjustment ?? true;
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
      const applySeasonalFactors = await isSeasonalAdjustmentEnabled();
      setPlants(fastForward(migrated, daysPassed, applySeasonalFactors, new Date()));
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
      const applySeasonalFactors = await isSeasonalAdjustmentEnabled();
      setPlants((prev) => fastForward(prev, daysPassed, applySeasonalFactors, new Date()));
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
    isSeasonalAdjustmentEnabled().then((applySeasonalFactors) => setPlants(fastForward(migrated, daysPassed, applySeasonalFactors, new Date())));
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

  const waterPlant = (plantId: string) => {
    (async () => {
      const applySeasonalFactors = await isSeasonalAdjustmentEnabled();
      const today = new Date();
      setPlants((prev) =>
        prev.map((p) => {
          if (p.id !== plantId) return p;
          const wateringIntervalDays = recomputeWateringInterval(p, today, applySeasonalFactors);
          return { ...p, lastWateredDaysAgo: 0, wateringIntervalDays, daysUntilWatering: wateringIntervalDays, status: 'upcoming' };
        })
      );
    })();
  };

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
