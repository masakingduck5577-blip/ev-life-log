import type { NotificationPermission } from './notifications';

/** ブラウザでは通知を使わない（説明だけ出して次へ進める） */
export async function getNotificationPermission(): Promise<NotificationPermission> {
  return 'unavailable';
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  return 'unavailable';
}
