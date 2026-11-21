import { TRIP_GAP_MS, type Trip, type TripKind } from '@/analysis/trips';
import { isHondaCharge, type Charger } from '@/data/simulator';

import type { MapMarker } from './route-map.types';

export const TRIP_LABEL: Record<TripKind, string> = { car: '車', train: '電車', other: '車ではない' };

/** まだ運転が続いているか：記録中で、最後の時速15km以上の点から15分たっていない */
export const isDriving = (t: Trip, now: number, recording: boolean) => recording && now - t.end < TRIP_GAP_MS;

export function chargerKindLabel(c: Charger): string {
  if (isHondaCharge(c)) return 'Honda Charge';
  return c.type === 'quick' ? '急速' : '普通';
}

export function chargerMarker(c: Charger, detail?: string): MapMarker {
  return {
    id: c.id,
    lat: c.lat,
    lng: c.lng,
    kind: isHondaCharge(c) ? 'honda' : c.type,
    title: c.name,
    detail: [chargerKindLabel(c) + (c.kw ? ` ${c.kw}kW` : ''), c.hours, detail].filter(Boolean).join('・'),
  };
}
