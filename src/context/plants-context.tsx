import { createContext, ReactNode, useContext, useState } from 'react';

import { CareTask, JournalEntry, Plant, plants as initialPlants } from '@/data/plants';

type PlantsContextValue = {
  plants: Plant[];
  addPlant: (plant: Plant) => void;
  getPlant: (id: string) => Plant | undefined;
  addCareTask: (plantId: string, task: CareTask) => void;
  addJournalEntry: (plantId: string, entry: JournalEntry) => void;
};

const PlantsContext = createContext<PlantsContextValue | null>(null);

export function PlantsProvider({ children }: { children: ReactNode }) {
  const [plants, setPlants] = useState<Plant[]>(initialPlants);

  const addPlant = (plant: Plant) => setPlants((prev) => [plant, ...prev]);
  const getPlant = (id: string) => plants.find((p) => p.id === id);

  const addCareTask = (plantId: string, task: CareTask) =>
    setPlants((prev) => prev.map((p) => (p.id === plantId ? { ...p, care: [...p.care, task] } : p)));

  const addJournalEntry = (plantId: string, entry: JournalEntry) =>
    setPlants((prev) =>
      prev.map((p) => (p.id === plantId ? { ...p, journalNotes: [entry, ...p.journalNotes] } : p))
    );

  return (
    <PlantsContext.Provider value={{ plants, addPlant, getPlant, addCareTask, addJournalEntry }}>
      {children}
    </PlantsContext.Provider>
  );
}

export function usePlants() {
  const ctx = useContext(PlantsContext);
  if (!ctx) throw new Error('usePlants must be used within a PlantsProvider');
  return ctx;
}
