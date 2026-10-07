import { useEffect } from 'react';

import { useLanguage } from '@/context/language-context';
import { usePlants } from '@/context/plants-context';
import { useSettings } from '@/context/settings-context';
import { daysUntilNext } from '@/utils/care';
import { cancelReminders, PlannedReminder, scheduleReminders } from '@/utils/notifications';

/** How far ahead reminders are queued. Opening the app re-plans the whole
 * window, so this only bounds how long they keep coming if it's never opened. */
const DAYS_AHEAD = 30;

function isWithinVacation(day: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const time = midnight(day);
  return time >= midnight(start) && time <= midnight(end);
}

export function useNotificationScheduler() {
  const { plants, loaded: plantsLoaded } = usePlants();
  const { notificationsEnabled, reminderTime, vacationMode, vacationStart, vacationEnd, loaded: settingsLoaded } = useSettings();
  const { t } = useLanguage();

  // settings-context builds fresh Date objects every render; depend on the
  // primitive values so unrelated settings changes don't re-plan everything.
  const reminderTimeMs = reminderTime.getTime();
  const vacationStartMs = vacationStart ? vacationStart.getTime() : null;
  const vacationEndMs = vacationEnd ? vacationEnd.getTime() : null;

  useEffect(() => {
    if (!plantsLoaded || !settingsLoaded) return;
    if (!notificationsEnabled) {
      cancelReminders();
      return;
    }

    const now = new Date();
    const reminders: PlannedReminder[] = [];
    for (let offset = 0; offset < DAYS_AHEAD; offset++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, reminderTime.getHours(), reminderTime.getMinutes());
      if (date.getTime() <= now.getTime()) continue;
      if (vacationMode && isWithinVacation(date, vacationStart, vacationEnd)) continue;

      // Anything due on or before that day and still not done by then.
      const thirsty = plants.filter((p) => p.daysUntilWatering <= offset);
      const careDue = plants.reduce(
        (n, p) => n + p.care.filter((c) => daysUntilNext(c.intervalDays, c.lastDoneDaysAgo) <= offset).length,
        0
      );
      if (thirsty.length === 0 && careDue === 0) continue;

      const parts: string[] = [];
      if (thirsty.length > 0) {
        parts.push(t.notifications.bodyWater(thirsty.slice(0, 2).map((p) => p.name), Math.max(0, thirsty.length - 2)));
      }
      if (careDue > 0) parts.push(t.notifications.bodyCare(careDue));
      reminders.push({ date, title: t.notifications.title, body: parts.join(' · ') });
    }
    scheduleReminders(reminders);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plantsLoaded, settingsLoaded, notificationsEnabled, reminderTimeMs, vacationMode, vacationStartMs, vacationEndMs, plants, t]);
}
