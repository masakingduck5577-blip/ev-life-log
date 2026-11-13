import type { TripKind } from '@/analysis/trips';
import { isHondaCharge, type Charger } from '@/data/simulator';

import type { MapMarker } from './route-map.types';

export const TRIP_LABEL: Record<TripKind, string> = { car: '車', train: '電車', bus: 'バス' };

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
