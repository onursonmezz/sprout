import Constants, { AppOwnership } from 'expo-constants';
import { Platform } from 'react-native';
import type * as NotificationsType from 'expo-notifications';

const DAILY_REMINDER_ID = 'sprout-daily-reminder';
const CHANNEL_ID = 'plant-reminders';

let notificationsModule: typeof NotificationsType | null = null;
let loadPromise: Promise<typeof NotificationsType | null> | null = null;

/**
 * Merely importing expo-notifications registers a push-token listener at
 * module scope, which throws on Android as soon as it runs inside Expo Go
 * (push support was removed there in SDK 53). Catching the import isn't
 * enough — the module must never be loaded at all in Expo Go, so check that
 * first via expo-constants (safe to import anywhere) and skip it entirely.
 */
function isExpoGo() {
  return Constants.appOwnership === AppOwnership.Expo;
}

function loadNotifications(): Promise<typeof NotificationsType | null> {
  if (!loadPromise) {
    loadPromise =
      Platform.OS === 'web' || isExpoGo()
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
    if (!granted) {
      console.warn('[notifications] scheduleDailyReminder skipped: permission not granted');
      return;
    }
    await ensureAndroidChannel(Notifications);
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
    const trigger: NotificationsType.DailyTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: CHANNEL_ID,
    };
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_REMINDER_ID,
      content: { title, body, sound: true },
      trigger,
    });
    const nextTrigger = await Notifications.getNextTriggerDateAsync(trigger);
    console.log(
      '[notifications] scheduled daily reminder for',
      `${hour}:${String(minute).padStart(2, '0')}`,
      '- next fire at',
      nextTrigger ? new Date(nextTrigger).toString() : 'unknown',
    );
  } catch (err) {
    console.warn('[notifications] scheduleDailyReminder failed:', err);
  }
}

export async function cancelDailyReminder() {
  const Notifications = notificationsModule ?? (await loadNotifications());
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
}
