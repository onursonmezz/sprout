import { Plant } from '@/data/plants';

/** Longest streak worth counting — also the loop's safety bound. */
const MAX_STREAK_DAYS = 999;

/** Days-ago values of every watering known for a plant. */
function wateringDays(plant: Plant): number[] {
  const days = [plant.lastWateredDaysAgo];
  for (const entry of plant.journalNotes) if (entry.type === 'watered') days.push(entry.daysAgo);
  return days;
}

/** A stretch of days (as days-ago, inclusive) when the user was away. */
export type AwayRange = { fromDaysAgo: number; toDaysAgo: number } | null;

const isAway = (away: AwayRange, daysAgo: number) => away != null && daysAgo <= away.fromDaysAgo && daysAgo >= away.toDaysAgo;

/** Whether a plant was past due on the day `daysAgo` days back, judged from
 * its known waterings and its current interval. Days before the plant was
 * added, or before its first known watering, never count against the user. */
function wasOverdue(plant: Plant, waterings: number[], daysAgo: number): boolean {
  if (daysAgo > plant.createdDaysAgo) return false;
  let previous: number | null = null;
  for (const w of waterings) if (w >= daysAgo && (previous === null || w < previous)) previous = w;
  if (previous === null) return false;
  return previous - daysAgo > (plant.customIntervalDays ?? plant.wateringIntervalDays);
}

/**
 * Consecutive days, ending today, on which no plant was overdue.
 *
 * Deliberately not "days in a row with a watering": plants should not be
 * watered every day, so a streak that breaks on a day with nothing to do
 * would reward overwatering. Keeping every plant on time is the habit worth
 * counting. The streak cannot be longer than the oldest plant has been here.
 */
function computeStreak(plants: Plant[], away: AwayRange): number {
  if (plants.length === 0) return 0;
  // Days spent on vacation never break the streak: nobody was there to water.
  // Today uses the live status, which also knows about snoozes and rain.
  if (!isAway(away, 0) && plants.some((p) => p.status === 'overdue')) return 0;
  const withWaterings = plants.map((plant) => ({ plant, waterings: wateringDays(plant) }));
  const oldest = Math.min(MAX_STREAK_DAYS, Math.max(...plants.map((p) => p.createdDaysAgo)));
  let streak = 1;
  for (let daysAgo = 1; daysAgo <= oldest; daysAgo++) {
    if (!isAway(away, daysAgo) && withWaterings.some(({ plant, waterings }) => wasOverdue(plant, waterings, daysAgo))) break;
    streak++;
  }
  return streak;
}

/** Number of watering events logged within the current calendar month. */
function countThisMonth(plants: Plant[]): number {
  const today = new Date();
  let count = 0;
  for (const plant of plants) {
    for (const entry of plant.journalNotes) {
      if (entry.type !== 'watered') continue;
      const d = new Date(today);
      d.setDate(d.getDate() - entry.daysAgo);
      if (d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth()) count++;
    }
  }
  return count;
}

export function computeCareStats(plants: Plant[], away: AwayRange = null) {
  return {
    streak: computeStreak(plants, away),
    thisMonth: countThisMonth(plants),
  };
}
