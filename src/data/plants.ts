import { RoomKey } from '@/constants/rooms';
import { HeatingSensitivity, LightKey, PotMaterialKey, SeasonProfile } from './species-guide';

export type WateringStatus = 'overdue' | 'dueToday' | 'upcoming';

export type CareTaskType = 'fertilize' | 'rotate' | 'mist' | 'prune' | 'repot';

export type CareTask = {
  type: CareTaskType;
  intervalDays: number;
  lastDoneDaysAgo: number;
};

export type JournalEntryType = 'watered' | 'newLeaf' | 'fertilized' | 'repotted' | 'rotated' | 'misted' | 'pruned' | 'note';

/** The journal entry type a completed care task is logged as. */
export const careJournalType: Record<CareTaskType, JournalEntryType> = {
  fertilize: 'fertilized',
  rotate: 'rotated',
  mist: 'misted',
  prune: 'pruned',
  repot: 'repotted',
};

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
  roomKey: RoomKey;
  /** Only meaningful when roomKey is 'other' — the user's own typed room name. */
  customRoom: string | null;
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
  /** Set when the user picked their own interval with the stepper — it then
   * wins over the algorithm everywhere until they switch back to automatic. */
  customIntervalDays: number | null;
  /** Learned from the user's "how was the soil?" answers: the algorithm's
   * interval is multiplied by this (1 = no correction yet). Ignored while a
   * custom interval is set. */
  intervalAdjust: number;
  /** Extra days added to the due date by "snooze"; cleared on watering. */
  snoozeDays: number;
  /** The species' reference-condition interval (or a generic fallback when
   * no species matched at add-time) — the fixed baseline
   * recomputeWateringInterval() scales by this plant's actual pot/light/
   * season conditions to produce wateringIntervalDays. */
  baseIntervalDays: number;
  heatingSensitivity: HeatingSensitivity;
  /** How strongly the seasons change this plant's watering — from its
   * species ('normal' when no species matched). */
  seasonProfile: SeasonProfile;
  /** Whether this specific plant lives indoors or outdoors — only affects
   * the outdoor-summer-heat factor. */
  indoor: boolean;
  environment: {
    lightKey: LightKey;
    /** How far the plant sits from its window — feeds the watering algorithm. */
    windowDistanceCm: number;
  };
  pot: {
    materialKey: PotMaterialKey;
    diameterCm: number | null;
    hasDrainage: boolean;
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
