import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { loadJSON, saveJSON } from '@/utils/storage';

const STORAGE_KEY = 'sprout:propagations';

/** How the cutting is being rooted. Dividing a plant has no rooting stage. */
export type PropagationMethod = 'water' | 'soil' | 'division';
export type PropagationStage = 'started' | 'rooted' | 'potted';

/**
 * One propagation project: a cutting (or division) followed from the day it
 * was taken until it is a plant in its own pot — or until it fails. Dates are
 * absolute (ISO), so nothing needs rolling forward while the app is closed.
 */
export type Propagation = {
  id: string;
  /** The plant it was taken from, if that plant is in the app. */
  parentPlantId: string | null;
  name: string;
  species: string;
  latinName: string;
  method: PropagationMethod;
  stage: PropagationStage;
  startedAt: string;
  rootedAt: string | null;
  pottedAt: string | null;
  /** Water method only: when the water was last changed. */
  waterChangedAt: string;
  photoUri: string | null;
  status: 'active' | 'done' | 'failed';
};

/** Rooting water is usually refreshed about this often. */
export const WATER_CHANGE_DAYS = 5;

/** Whole calendar days from an ISO date until today. */
export function daysSince(iso: string, today: Date = new Date()): number {
  const d = new Date(iso);
  return Math.max(0, Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000));
}

/** The stages a project goes through, in order, for its method. */
export function stagesFor(method: PropagationMethod): PropagationStage[] {
  return method === 'division' ? ['started', 'potted'] : ['started', 'rooted', 'potted'];
}

/** Whether a rooting-in-water cutting is likely due fresh water. */
export function waterChangeDue(p: Propagation): boolean {
  return p.status === 'active' && p.method === 'water' && p.stage === 'started' && daysSince(p.waterChangedAt) >= WATER_CHANGE_DAYS;
}

type PropagationContextValue = {
  loaded: boolean;
  projects: Propagation[];
  getProject: (id: string) => Propagation | undefined;
  startProject: (input: { parentPlantId: string | null; name: string; species: string; latinName: string }) => string;
  updateProject: (id: string, updates: Partial<Propagation>) => void;
  /** Moves a project to its next stage; the last stage completes it. */
  advanceProject: (id: string) => void;
  deleteProject: (id: string) => void;
};

const PropagationContext = createContext<PropagationContextValue | null>(null);

export function PropagationProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Propagation[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadJSON<Propagation[]>(STORAGE_KEY, []).then((saved) => {
      setProjects(Array.isArray(saved) ? saved : []);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) saveJSON(STORAGE_KEY, projects);
  }, [projects, loaded]);

  const startProject: PropagationContextValue['startProject'] = (input) => {
    const now = new Date().toISOString();
    const id = `prop-${Date.now().toString(36)}`;
    setProjects((prev) => [
      { id, ...input, method: 'water', stage: 'started', startedAt: now, rootedAt: null, pottedAt: null, waterChangedAt: now, photoUri: null, status: 'active' },
      ...prev,
    ]);
    return id;
  };

  const updateProject = (id: string, updates: Partial<Propagation>) =>
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));

  const advanceProject = (id: string) =>
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id || p.status !== 'active') return p;
        const stages = stagesFor(p.method);
        const next = stages[stages.indexOf(p.stage) + 1];
        if (!next) return p;
        const now = new Date().toISOString();
        return next === 'rooted' ? { ...p, stage: next, rootedAt: now } : { ...p, stage: next, pottedAt: now, status: 'done' };
      })
    );

  const deleteProject = (id: string) => setProjects((prev) => prev.filter((p) => p.id !== id));

  return (
    <PropagationContext.Provider
      value={{ loaded, projects, getProject: (id) => projects.find((p) => p.id === id), startProject, updateProject, advanceProject, deleteProject }}>
      {children}
    </PropagationContext.Provider>
  );
}

export function usePropagation() {
  const ctx = useContext(PropagationContext);
  if (!ctx) throw new Error('usePropagation must be used within PropagationProvider');
  return ctx;
}
