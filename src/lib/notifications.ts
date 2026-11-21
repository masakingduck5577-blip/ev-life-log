import * as Notifications from 'expo-notifications';

export type NotificationPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

const toPermission = (s: Notifications.NotificationPermissionsStatus): NotificationPermission =>
  s.granted ? 'granted' : s.canAskAgain ? 'undetermined' : 'denied';

/** 通知の許可の状態（スマホ） */
export async function getNotificationPermission(): Promise<NotificationPermission> {
  return toPermission(await Notifications.getPermissionsAsync());
}

/** 通知の許可を求める（スマホ） */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  return toPermission(await Notifications.requestPermissionsAsync());
}

/** 決まった時刻にお知らせを出す予約（同じ id の予約は置きかえる）。許可がなければ何もしない */
export async function scheduleNotificationAt(id: string, ms: number, title: string, body: string): Promise<void> {
  if (ms <= Date.now()) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: ms },
    });
  } catch {
    // 許可がないときなど。記録は続ける
  }
}

export async function cancelNotification(id: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // 予約がなければそのまま
  }
}
