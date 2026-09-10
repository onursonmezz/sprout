import { Platform } from 'react-native';
import type * as NotificationsType from 'expo-notifications';

const DAILY_REMINDER_ID = 'sprout-daily-reminder';
const CHANNEL_ID = 'plant-reminders';

let notificationsModule: typeof NotificationsType | null = null;
let loadPromise: Promise<typeof NotificationsType | null> | null = null;

/**
 * expo-notifications throws as soon as it's loaded when running inside Expo Go
 * on SDK 53+ (push support was removed there). A dynamic import lets us catch
 * that failure instead of crashing the whole app at startup; every export
 * below degrades to a no-op when the module couldn't be loaded.
 */
function loadNotifications(): Promise<typeof NotificationsType | null> {
  if (!loadPromise) {
    loadPromise =
      Platform.OS === 'web'
        ? Promise.resolve(null)
        : import('expo-notifications')
            .then((mod) => {
              mod.setNotificationHandler({
                handleNotification: async () => ({
                  shouldShowBanner: true,
                  shouldShowList: true,
                  shouldPlaySound: true,
                  shouldSetBadge: false,
                }),
              });
              notificationsModule = mod;
              return mod;
            })
            .catch(() => null);
  }
  return loadPromise;
}

let channelReady = false;

async function ensureAndroidChannel(Notifications: typeof NotificationsType) {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Plant reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
  channelReady = true;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) {
      await ensureAndroidChannel(Notifications);
      return true;
    }
    const requested = await Notifications.requestPermissionsAsync();
    if (requested.granted) await ensureAndroidChannel(Notifications);
    return requested.granted;
  } catch {
    return false;
  }
}

export async function scheduleDailyReminder({
  hour,
  minute,
  title,
  body,
}: {
  hour: number;
  minute: number;
  title: string;
  body: string;
}) {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;
    await ensureAndroidChannel(Notifications);
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: { title, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });
  } catch {
    // Local scheduling isn't available in this environment (e.g. Expo Go); ignore.
  }
}

export async function cancelDailyReminder() {
  const Notifications = notificationsModule ?? (await loadNotifications());
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
}
