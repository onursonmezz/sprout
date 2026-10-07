import Constants, { AppOwnership } from 'expo-constants';
import { Platform } from 'react-native';
import type * as NotificationsType from 'expo-notifications';

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

export type PlannedReminder = { date: Date; title: string; body: string };

/**
 * Replaces every pending reminder with the given dated ones. Each carries the
 * text for its own day (which plants will be due by then), so the reminders
 * stay right even if the app isn't opened in between — unlike a single
 * repeating notification, whose text is frozen at whatever was true when it
 * was scheduled.
 */
export async function scheduleReminders(reminders: PlannedReminder[]) {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (reminders.length === 0) return;
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;
    await ensureAndroidChannel(Notifications);
    for (const reminder of reminders) {
      await Notifications.scheduleNotificationAsync({
        content: { title: reminder.title, body: reminder.body, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: reminder.date, channelId: CHANNEL_ID },
      });
    }
  } catch (err) {
    console.warn('[notifications] scheduleReminders failed:', err);
  }
}

export async function cancelReminders() {
  const Notifications = notificationsModule ?? (await loadNotifications());
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}
