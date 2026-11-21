import type { NotificationPermission } from './notifications';

/** ブラウザでは通知を使わない（説明だけ出して次へ進める） */
export async function getNotificationPermission(): Promise<NotificationPermission> {
  return 'unavailable';
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  return 'unavailable';
}

export async function scheduleNotificationAt(_id: string, _ms: number, _title: string, _body: string): Promise<void> {}

export async function cancelNotification(_id: string): Promise<void> {}
