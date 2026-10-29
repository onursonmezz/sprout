import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { loadJSON, saveJSON } from '@/utils/storage';

const STORAGE_KEY = 'sprout:propagations';

/** How the cutting is being rooted. Dividing a plant has no rooting stage;
 * a sowing goes through sprouting and first true leaves instead. */
export type PropagationMethod = 'water' | 'soil' | 'division' | 'seed';
export type PropagationStage = 'started' | 'rooted' | 'sprouted' | 'trueLeaves' | 'potted';

/** What the seeds were sown in. */
export type SeedContainer = 'tray' | 'pot' | 'paper' | 'peat';

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
  /** Seed sowings only (older projects have none of these). */
  seedCount?: number;
  /** How many of the seeds have come up, counted by the user. */
  sproutedCount?: number;
  container?: SeedContainer;
  sproutedAt?: string | null;
  trueLeavesAt?: string | null;
  /** The last day the soil's moisture was checked. */
  checkedAt?: string | null;
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
  if (method === 'seed') return ['started', 'sprouted', 'trueLeaves', 'potted'];
  return method === 'division' ? ['started', 'potted'] : ['started', 'rooted', 'potted'];
}

/** Seed trays dry out fast and want a look every day until the seedlings
 * are potted up: due when the soil has not been checked yet today. */
export function seedCheckDue(p: Propagation): boolean {
  return p.status === 'active' && p.method === 'seed' && (!p.checkedAt || daysSince(p.checkedAt) >= 1);
}

/** Whether a rooting-in-water cutting is likely due fresh water. */
export function waterChangeDue(p: Propagation): boolean {
  return p.status === 'active' && p.method === 'water' && p.stage === 'started' && daysSince(p.waterChangedAt) >= WATER_CHANGE_DAYS;
}

type PropagationContextValue = {
  loaded: boolean;
  projects: Propagation[];
  getProject: (id: string) => Propagation | undefined;
  startProject: (
    input: { parentPlantId: string | null; name: string; species: string; latinName: string } & Partial<
      Pick<Propagation, 'method' | 'startedAt' | 'photoUri' | 'seedCount' | 'container'>
    >
  ) => string;
  /** Marks today's moisture check done for these sowings. */
  markSeedsChecked: (ids: string[]) => void;
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
      {
        id,
        method: 'water',
        stage: 'started',
        startedAt: now,
        rootedAt: null,
        pottedAt: null,
        waterChangedAt: now,
        photoUri: null,
        status: 'active',
        ...input,
        ...(input.method === 'seed' ? { sproutedCount: 0, sproutedAt: null, trueLeavesAt: null, checkedAt: now } : {}),
      },
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
        if (next === 'rooted') return { ...p, stage: next, rootedAt: now };
        // Coming up at all means at least one seed sprouted.
        if (next === 'sprouted') return { ...p, stage: next, sproutedAt: now, sproutedCount: Math.max(1, p.sproutedCount ?? 0) };
        if (next === 'trueLeaves') return { ...p, stage: next, trueLeavesAt: now };
        return { ...p, stage: next, pottedAt: now, status: 'done' };
      })
    );

  const deleteProject = (id: string) => setProjects((prev) => prev.filter((p) => p.id !== id));

  const markSeedsChecked = (ids: string[]) => {
    const now = new Date().toISOString();
    setProjects((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, checkedAt: now } : p)));
  };

  return (
    <PropagationContext.Provider
      value={{
        loaded,
        projects,
        getProject: (id) => projects.find((p) => p.id === id),
        startProject,
        updateProject,
        advanceProject,
        deleteProject,
        markSeedsChecked,
      }}>
      {children}
    </PropagationContext.Provider>
  );
}

export function usePropagation() {
  const ctx = useContext(PropagationContext);
  if (!ctx) throw new Error('usePropagation must be used within PropagationProvider');
  return ctx;
}
