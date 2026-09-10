import { createContext, ReactNode, useContext, useState } from 'react';

import { CareTask, JournalEntry, Plant, plants as initialPlants } from '@/data/plants';

type PlantsContextValue = {
  plants: Plant[];
  addPlant: (plant: Plant) => void;
  getPlant: (id: string) => Plant | undefined;
  addCareTask: (plantId: string, task: CareTask) => void;
  completeCareTask: (plantId: string, taskIndex: number) => void;
  addJournalEntry: (plantId: string, entry: JournalEntry) => void;
  waterPlant: (plantId: string) => void;
};

const PlantsContext = createContext<PlantsContextValue | null>(null);

export function PlantsProvider({ children }: { children: ReactNode }) {
  const [plants, setPlants] = useState<Plant[]>(initialPlants);

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
      value={{ plants, addPlant, getPlant, addCareTask, completeCareTask, addJournalEntry, waterPlant }}>
      {children}
    </PlantsContext.Provider>
  );
}

export function usePlants() {
  const ctx = useContext(PlantsContext);
  if (!ctx) throw new Error('usePlants must be used within a PlantsProvider');
  return ctx;
}
