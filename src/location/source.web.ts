import type { LocationPermission, LocationSource } from './source';

/**
 * ブラウザ用。ブラウザでは本当の位置を使わず、テストデータ（replay.ts）を流す。
 * そのため、スマホの位置の取得元は作らない。
 */
export function createDeviceSource(): LocationSource | null {
  return null;
}

export async function getLocationPermission(): Promise<LocationPermission> {
  return 'unavailable';
}

export async function requestLocationPermission(): Promise<LocationPermission> {
  return 'unavailable';
}
