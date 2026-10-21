import { Translations } from '@/constants/translations';
import { CareTask, Plant } from '@/data/plants';
import { findSpeciesLoose, SpeciesRecord } from '@/data/species-guide';

/** Used when a plant's species is not in the database. */
const GENERIC_FERTILIZE_MONTHS = [4, 5, 6, 7, 8, 9];
const GENERIC_FERTILIZE_INTERVAL_DAYS = 30;
const GENERIC_REPOT_MONTHS = 24;
const ROTATE_INTERVAL_DAYS = 30;

const speciesCache = new Map<string, SpeciesRecord | undefined>();

/** The database record for a plant's species, if it has one. */
export function speciesOf(plant: { species: string; latinName: string }): SpeciesRecord | undefined {
  const key = `${plant.species}|${plant.latinName}`;
  if (!speciesCache.has(key)) speciesCache.set(key, findSpeciesLoose(plant.species) ?? findSpeciesLoose(plant.latinName));
  return speciesCache.get(key);
}

/**
 * The care a plant gets without the user having to set it up: fertilizing at
 * its species' rhythm, repotting when the species usually needs it, and — for
 * indoor plants, which lean toward the window — an occasional turn. Each can
 * be removed from the plant's Care tab.
 */
export function defaultCareTasks(species: SpeciesRecord | undefined, indoor: boolean, repotDaysAgo: number | null): CareTask[] {
  const tasks: CareTask[] = [];
  const fertilizeMonths = species ? species.fertilize.months : GENERIC_FERTILIZE_MONTHS;
  if (fertilizeMonths.length > 0) {
    tasks.push({ type: 'fertilize', intervalDays: species?.fertilize.intervalDays ?? GENERIC_FERTILIZE_INTERVAL_DAYS, lastDoneDaysAgo: 0 });
  }
  if (indoor) tasks.push({ type: 'rotate', intervalDays: ROTATE_INTERVAL_DAYS, lastDoneDaysAgo: 0 });
  tasks.push({ type: 'repot', intervalDays: (species?.repotEveryMonths ?? GENERIC_REPOT_MONTHS) * 30, lastDoneDaysAgo: repotDaysAgo ?? 0 });
  return tasks;
}

/** Adds the default tasks a plant does not already have a task of that type for. */
export function withDefaultCare(existing: CareTask[], defaults: CareTask[]): CareTask[] {
  return [...existing, ...defaults.filter((d) => !existing.some((e) => e.type === d.type))];
}

/** Fertilizing only happens in the species' growing months; a resting plant
 * cannot use the feed. Every other task is in season all year. */
export function careTaskInSeason(task: CareTask, plant: { species: string; latinName: string }, date: Date = new Date()): boolean {
  if (task.type !== 'fertilize') return true;
  const months = speciesOf(plant)?.fertilize.months ?? GENERIC_FERTILIZE_MONTHS;
  return months.includes(date.getMonth() + 1);
}

/** Whether a care task should be shown as waiting to be done today. */
export function careTaskDue(task: CareTask, plant: { species: string; latinName: string }): boolean {
  return careTaskInSeason(task, plant) && daysUntilNext(task.intervalDays, task.lastDoneDaysAgo) <= 0;
}

/** Days from now until the next occurrence; negative means overdue. */
export function daysUntilNext(intervalDays: number, lastDoneDaysAgo: number) {
  return intervalDays - lastDoneDaysAgo;
}

/** Whether a recurring task next due in daysUntil days (negative = already
 * overdue, treated as due today) falls on the day offset days from now — for
 * projecting future occurrences onto the calendar. */
export function fallsOn(offset: number, daysUntil: number, intervalDays: number) {
  if (offset < 0) return false;
  const first = Math.max(0, daysUntil);
  return offset >= first && (offset - first) % Math.max(1, intervalDays) === 0;
}

/** Whether a plant is (or was) watered on the day `offset` days from today:
 * future days are projected from its interval, past days come only from what
 * actually happened. */
export function wateringOn(p: Plant, offset: number) {
  if (offset > 0) return fallsOn(offset, p.daysUntilWatering, p.wateringIntervalDays);
  if (offset === 0 && p.daysUntilWatering <= 0) return true;
  return p.lastWateredDaysAgo === -offset || p.journalNotes.some((e) => e.type === 'watered' && e.daysAgo === -offset);
}

/** Days since the plant came home: from its acquired date when that is a
 * full date, otherwise from when it was added to Sprout. */
export function daysSinceAcquired(plant: Plant): number | null {
  const match = plant.acquiredDate.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) {
    const then = Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    const now = new Date();
    const days = Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - then) / 86400000);
    if (days >= 0) return days;
  }
  return plant.createdDaysAgo < 3650 ? plant.createdDaysAgo : null;
}

export function formatDateFromDaysOffset(daysFromToday: number, t: Translations) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  const day = date.getDate();
  const month = t.calendar.monthsShort[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function relativeTime(daysAgo: number, t: Translations) {
  if (daysAgo <= 0) return t.plantDetail.history.today;
  if (daysAgo === 1) return t.plantDetail.history.oneDayAgo;
  if (daysAgo < 30) return t.plantDetail.history.daysAgo(daysAgo);
  const months = Math.max(1, Math.round(daysAgo / 30));
  if (months === 1) return t.plantDetail.history.oneMonthAgo;
  return t.plantDetail.history.monthsAgo(months);
}
