import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { DEVICE_DATASET } from '@/recording/datasets';
import { getStore } from '@/storage/store';

import type { LocationPermission, LocationPoint, LocationSource, PointsListener } from './source';

/**
 * スマホ用：expo-location ＋ expo-task-manager で、画面を閉じていても位置を取る。
 *
 * 取った点は、受け取ったその場で SQLite に保存する（アプリの画面がなくても動くため）。
 * 移動の種類（CoreMotion）はまだ取れないので 'unknown' にする（別のネイティブモジュールが必要）。
 */

export const LOCATION_TASK = 'evlifelog-location';

const listeners = new Set<PointsListener>();

function toPoint(loc: Location.LocationObject): LocationPoint {
  return {
    t: new Date(loc.timestamp).toISOString(),
    lat: loc.coords.latitude,
    lng: loc.coords.longitude,
    speed: loc.coords.speed ?? -1,
    accuracy: loc.coords.accuracy ?? -1,
    activity: 'unknown',
  };
}

// タスクは、アプリが起動したらすぐ（画面を作る前に）登録しておく必要がある
if (!TaskManager.isTaskDefined(LOCATION_TASK)) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
    LOCATION_TASK,
    async ({ data, error }) => {
      if (error || !data?.locations?.length) return;
      const points = data.locations.map(toPoint);
      await getStore().addPoints(DEVICE_DATASET, points);
      listeners.forEach((l) => l(points));
    },
  );
}

export function createDeviceSource(): LocationSource {
  return {
    kind: 'device',
    async start() {
      if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) return;
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        distanceInterval: 20,
        activityType: Location.ActivityType.AutomotiveNavigation,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: 'EV Life Log が移動を記録しています',
          notificationBody: '位置はスマホの中だけで計算し、外には送りません。',
          notificationColor: '#1F6FEB',
        },
      });
    },
    async stop() {
      if (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK)) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK);
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function toPermission(
  fg: Location.LocationPermissionResponse,
  bg: Location.LocationPermissionResponse | null,
): LocationPermission {
  if (bg?.granted) return 'always';
  if (fg.granted) return 'whenInUse';
  if (fg.status === Location.PermissionStatus.DENIED) return 'denied';
  return 'undetermined';
}

export async function getLocationPermission(): Promise<LocationPermission> {
  const fg = await Location.getForegroundPermissionsAsync();
  const bg = fg.granted ? await Location.getBackgroundPermissionsAsync() : null;
  return toPermission(fg, bg);
}

export async function requestLocationPermission(): Promise<LocationPermission> {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return toPermission(fg, null);
  const bg = await Location.requestBackgroundPermissionsAsync();
  return toPermission(fg, bg);
}
