import { Translations } from '@/constants/translations';

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
