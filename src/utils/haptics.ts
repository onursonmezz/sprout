import * as Haptics from 'expo-haptics';

/** A satisfying little buzz for completing something (watering, finishing a
 * care task). expo-haptics has a web stub, so this is safe to call anywhere. */
export function hapticSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** A lighter tap for a lower-stakes action (snoozing, picking an option). */
export function hapticTap() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
