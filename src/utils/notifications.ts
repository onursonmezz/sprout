import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const DAILY_REMINDER_ID = 'sprout-daily-reminder';
const CHANNEL_ID = 'plant-reminders';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let channelReady = false;

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || channelReady) return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Plant reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
  });
  channelReady = true;
}

/** Local scheduled notifications aren't available on web; every export below is a no-op there. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) {
    await ensureAndroidChannel();
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  if (requested.granted) await ensureAndroidChannel();
  return requested.granted;
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
  if (Platform.OS === 'web') return;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;
  await ensureAndroidChannel();
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
}

export async function cancelDailyReminder() {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID).catch(() => {});
}
