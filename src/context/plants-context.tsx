import { createContext, ReactNode, useContext, useState } from 'react';

import { Plant, plants as initialPlants } from '@/data/plants';

type PlantsContextValue = {
  plants: Plant[];
  addPlant: (plant: Plant) => void;
  getPlant: (id: string) => Plant | undefined;
};

const PlantsContext = createContext<PlantsContextValue | null>(null);

export function PlantsProvider({ children }: { children: ReactNode }) {
  const [plants, setPlants] = useState<Plant[]>(initialPlants);

  const addPlant = (plant: Plant) => setPlants((prev) => [plant, ...prev]);
  const getPlant = (id: string) => plants.find((p) => p.id === id);

  return <PlantsContext.Provider value={{ plants, addPlant, getPlant }}>{children}</PlantsContext.Provider>;
}

export function usePlants() {
  const ctx = useContext(PlantsContext);
  if (!ctx) throw new Error('usePlants must be used within a PlantsProvider');
  return ctx;
}
