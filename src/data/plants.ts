import { HeatingSensitivity, LightKey, PotMaterialKey } from './species-guide';

export type WateringStatus = 'overdue' | 'dueToday' | 'upcoming';

export type CareTaskType = 'fertilize' | 'rotate' | 'mist' | 'prune' | 'repot';

export type CareTask = {
  type: CareTaskType;
  intervalDays: number;
  lastDoneDaysAgo: number;
};

export type JournalEntryType = 'watered' | 'newLeaf' | 'fertilized' | 'repotted' | 'note';

export type JournalEntry = {
  id: string;
  type: JournalEntryType;
  title: string;
  description: string;
  daysAgo: number;
  photoUri?: string | null;
};

export type Plant = {
  id: string;
  name: string;
  species: string;
  latinName: string;
  room: string;
  emoji: string;
  avatarColor: string;
  photoUri: string | null;
  wateringAmountMl: number;
  status: WateringStatus;
  daysUntilWatering: number;
  lastWateredDaysAgo: number;
  /** The plant's current watering cadence — recomputeWateringInterval()'s
   * output, cached here and refreshed on add/edit, watering, and the daily
   * rollover check (not on every render). */
  wateringIntervalDays: number;
  /** The species' reference-condition interval (or a generic fallback when
   * no species matched at add-time) — the fixed baseline
   * recomputeWateringInterval() scales by this plant's actual pot/light/
   * season conditions to produce wateringIntervalDays. */
  baseIntervalDays: number;
  heatingSensitivity: HeatingSensitivity;
  /** Whether this specific plant lives indoors or outdoors — only affects
   * the outdoor-summer-heat factor. */
  indoor: boolean;
  environment: {
    lightKey: LightKey;
    window: string;
    hoursLight: string;
    humidity: string;
    tempC: string;
  };
  pot: {
    size: string;
    materialKey: PotMaterialKey;
    /** Raw pot diameter in cm, used by the watering algorithm — `size` above
     * is just the "15x14cm" display string. */
    diameterCm: number | null;
    drainage: string;
    soil: string;
  };
  acquiredDate: string;
  care: CareTask[];
  journalNotes: JournalEntry[];
  /** Days since this plant was added to Sprout — bounds how far back
   * synthetic/projected history (dot grid, "recent" lists) is allowed to
   * reach, so it never fabricates events from before the plant existed here. */
  createdDaysAgo: number;
};
