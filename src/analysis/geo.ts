/** 距離の計算など */

export type LatLng = { lat: number; lng: number };

const R = 6371000;
const rad = (d: number) => (d * Math.PI) / 180;

/** 2点の距離（m） */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 点のまわりの、おおよその四角（すばやく絞り込むため） */
export function nearBox(p: LatLng, meters: number) {
  const dLat = meters / 111320;
  const dLng = meters / (111320 * Math.cos(rad(p.lat)));
  return (q: LatLng) => Math.abs(q.lat - p.lat) <= dLat && Math.abs(q.lng - p.lng) <= dLng;
}

/** 点の列を間引く（地図に描くため）。minMeters より近い点は飛ばす */
export function thin(points: LatLng[], minMeters = 60): LatLng[] {
  if (points.length <= 2) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    if (distanceM(out[out.length - 1], points[i]) >= minMeters) out.push(points[i]);
  }
  out.push(points[points.length - 1]);
  return out;
}

export function center(points: LatLng[]): LatLng {
  const n = Math.max(points.length, 1);
  return {
    lat: points.reduce((s, p) => s + p.lat, 0) / n,
    lng: points.reduce((s, p) => s + p.lng, 0) / n,
  };
}
