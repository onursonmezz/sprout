import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { CareTask, JournalEntry, Plant, WateringStatus } from '@/data/plants';
import { loadJSON, saveJSON } from '@/utils/storage';

const PLANTS_KEY = 'sprout:plants';
const SAVED_AT_KEY = 'sprout:plants-saved-at';

type PlantsContextValue = {
  plants: Plant[];
  addPlant: (plant: Plant) => void;
  getPlant: (id: string) => Plant | undefined;
  addCareTask: (plantId: string, task: CareTask) => void;
  completeCareTask: (plantId: string, taskIndex: number) => void;
  addJournalEntry: (plantId: string, entry: JournalEntry) => void;
  waterPlant: (plantId: string) => void;
  loaded: boolean;
};

const PlantsContext = createContext<PlantsContextValue | null>(null);

/** Whole calendar days between two dates (ignores time of day). */
function daysBetween(a: Date, b: Date) {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86400000);
}

/**
 * Plant "days ago" / "days until" fields are relative snapshots, so a plant
 * saved as "in 7 days" would still read "in 7 days" a week later unless we
 * roll every relative field forward by however long the app was closed.
 */
function fastForward(plants: Plant[], daysPassed: number): Plant[] {
  if (daysPassed <= 0) return plants;
  return plants.map((p) => {
    const daysUntilWatering = p.daysUntilWatering - daysPassed;
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
      const [savedPlants, savedAt] = await Promise.all([
        loadJSON<Plant[]>(PLANTS_KEY, []),
        loadJSON<string | null>(SAVED_AT_KEY, null),
      ]);
      const daysPassed = savedAt ? Math.max(0, daysBetween(new Date(savedAt), new Date())) : 0;
      setPlants(fastForward(savedPlants, daysPassed));
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveJSON(PLANTS_KEY, plants);
    saveJSON(SAVED_AT_KEY, new Date().toISOString());
  }, [plants, loaded]);

  const addPlant = (plant: Plant) => setPlants((prev) => [plant, ...prev]);
  const getPlant = (id: string) => plants.find((p) => p.id === id);

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
        const intervalDays = Math.max(1, p.lastWateredDaysAgo + p.daysUntilWatering);
        return { ...p, lastWateredDaysAgo: 0, daysUntilWatering: intervalDays, status: 'upcoming' };
      })
    );

  return (
    <PlantsContext.Provider
      value={{ plants, addPlant, getPlant, addCareTask, completeCareTask, addJournalEntry, waterPlant, loaded }}>
      {children}
    </PlantsContext.Provider>
  );
}

export function usePlants() {
  const ctx = useContext(PlantsContext);
  if (!ctx) throw new Error('usePlants must be used within a PlantsProvider');
  return ctx;
}
