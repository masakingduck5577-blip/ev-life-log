import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  getLocationPermission,
  requestLocationPermission,
  type LocationPermission,
} from '@/location/source';

import {
  getNotificationPermission,
  requestNotificationPermission,
  type NotificationPermission,
} from './notifications';

/**
 * 位置とお知らせの許可の状態。設定アプリから戻ってきたときにも読み直す。
 * askAll()：まだ聞いていないものだけ、iPhone の確認の画面を順に出す（位置 → お知らせ）。
 */
export function usePermissions() {
  const [location, setLocation] = useState<LocationPermission | null>(null);
  const [notification, setNotification] = useState<NotificationPermission | null>(null);

  const refresh = useCallback(
    () =>
      Promise.all([getLocationPermission().catch(() => null), getNotificationPermission().catch(() => null)]).then(
        ([loc, noti]) => {
          setLocation(loc);
          setNotification(noti);
        },
      ),
    [],
  );

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const askAll = useCallback(async () => {
    const loc = await getLocationPermission().catch(() => null);
    // 「使用中のみ」でも、もう一度聞くと「常に許可に変更」の確認が出る
    if (loc === 'undetermined' || loc === 'whenInUse') {
      setLocation(await requestLocationPermission().catch(() => loc));
    }
    const noti = await getNotificationPermission().catch(() => null);
    if (noti === 'undetermined') {
      setNotification(await requestNotificationPermission().catch(() => noti));
    }
  }, []);

  return { location, notification, refresh, askAll };
}

export function locationStatusText(p: LocationPermission | null): { tone: 'ok' | 'warn' | 'sub'; text: string } | null {
  switch (p) {
    case 'always':
      return { tone: 'ok', text: '✓ 「常に許可」になっています' };
    case 'whenInUse':
      return { tone: 'warn', text: '今は「使用中のみ」です。設定アプリで「常に」にしてください' };
    case 'denied':
      return { tone: 'warn', text: '許可されていません。設定アプリで「常に」にしてください' };
    case 'undetermined':
      return { tone: 'sub', text: 'まだ許可していません。「はじめる」を押すと確認が出ます' };
    case 'unavailable':
      return { tone: 'sub', text: 'ブラウザでは使いません' };
    default:
      return null;
  }
}

export function notificationStatusText(p: NotificationPermission | null): { tone: 'ok' | 'warn' | 'sub'; text: string } | null {
  switch (p) {
    case 'granted':
      return { tone: 'ok', text: '✓ 許可されています' };
    case 'denied':
      return { tone: 'sub', text: 'オフです（設定アプリで変えられます）' };
    case 'undetermined':
      return { tone: 'sub', text: 'まだ許可していません。「はじめる」を押すと確認が出ます' };
    case 'unavailable':
      return { tone: 'sub', text: 'ブラウザでは使いません' };
    default:
      return null;
  }
}
