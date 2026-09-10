import { Translations } from '@/constants/translations';

/** Days from now until the next occurrence; negative means overdue. */
export function daysUntilNext(intervalDays: number, lastDoneDaysAgo: number) {
  return intervalDays - lastDoneDaysAgo;
}

/** Days-ago values for past occurrences of a recurring task, most recent first. */
export function generateEventDaysAgoList(intervalDays: number, lastDoneDaysAgo: number, maxDaysBack = 84) {
  const days: number[] = [];
  let d = Math.max(0, lastDoneDaysAgo);
  while (d <= maxDaysBack) {
    days.push(d);
    d += Math.max(1, intervalDays);
  }
  return days;
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
