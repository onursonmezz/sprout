import { Plant } from '@/data/plants';

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Calendar dates (as local-day keys) on which at least one plant was watered,
 * reconstructed from each journal entry's daysAgo relative to today. */
function wateredDayKeys(plants: Plant[]): Set<string> {
  const today = new Date();
  const keys = new Set<string>();
  for (const plant of plants) {
    for (const entry of plant.journalNotes) {
      if (entry.type !== 'watered') continue;
      const d = new Date(today);
      d.setDate(d.getDate() - entry.daysAgo);
      keys.add(dateKey(d));
    }
  }
  return keys;
}

/** Consecutive days (ending today or yesterday) with at least one watering
 * logged. Today not having a watering yet doesn't break the streak until the
 * day fully lapses. */
function computeStreak(days: Set<string>): number {
  const cursor = new Date();
  if (!days.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dateKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
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

export function computeCareStats(plants: Plant[]) {
  return {
    streak: computeStreak(wateredDayKeys(plants)),
    thisMonth: countThisMonth(plants),
  };
}
