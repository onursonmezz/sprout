import { useEffect } from 'react';

import { useLanguage } from '@/context/language-context';
import { usePlants } from '@/context/plants-context';
import { useSettings } from '@/context/settings-context';
import { cancelDailyReminder, scheduleDailyReminder } from '@/utils/notifications';

function isWithinVacation(now: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const time = day(now);
  return time >= day(start) && time <= day(end);
}

export function useNotificationScheduler() {
  const { plants, loaded: plantsLoaded } = usePlants();
  const {
    notificationsEnabled,
    reminderTime,
    vacationMode,
    vacationStart,
    vacationEnd,
    loaded: settingsLoaded,
  } = useSettings();
  const { t } = useLanguage();

  useEffect(() => {
    if (!plantsLoaded || !settingsLoaded) return;

    (async () => {
      if (!notificationsEnabled) {
        await cancelDailyReminder();
        return;
      }
      if (vacationMode && isWithinVacation(new Date(), vacationStart, vacationEnd)) {
        await cancelDailyReminder();
        return;
      }
      const dueCount = plants.filter((p) => p.status === 'overdue' || p.status === 'dueToday').length;
      await scheduleDailyReminder({
        hour: reminderTime.getHours(),
        minute: reminderTime.getMinutes(),
        title: t.notifications.title,
        body: dueCount > 0 ? t.notifications.bodyWithCount(dueCount) : t.notifications.bodyGeneric,
      });
    })();
  }, [
    plantsLoaded,
    settingsLoaded,
    notificationsEnabled,
    reminderTime,
    vacationMode,
    vacationStart,
    vacationEnd,
    plants,
    t,
  ]);
}
