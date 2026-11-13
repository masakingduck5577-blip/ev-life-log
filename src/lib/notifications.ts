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
