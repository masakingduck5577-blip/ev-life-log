/**
 * 線路・駅・高速道路のデータ（assets/geo/、scripts/fetch-osm-geo.mjs で作る）と、点からの距離。
 * データ：© OpenStreetMap contributors（ODbL）
 *
 * 点と線の距離は、地図をマス目に分けて、点のまわりのマスにある線だけを調べる。
 * 計算はスマホの中だけで行う（位置を外に送らない）。
 */

import railData from '../../assets/geo/tochigi-rail.json';
import motorwayData from '../../assets/geo/tochigi-motorway.json';

import { distanceM, type LatLng } from './geo';

/** マス目の大きさ（度）。約1km四方。30m以内を調べるので、まわり1マスで足りる */
const CELL_DEG = 0.01;
const M_PER_DEG = 111320;

type Seg = { a: [number, number]; b: [number, number]; line: number };
type Line = { k: string; hs: boolean; st: boolean; n: string };
type Grid = { segs: Map<string, Seg[]>; lines: Line[] };

export type RailHit = {
  distanceM: number;
  /** rail：鉄道／light_rail・tram：LRT・路面電車 */
  kind: string;
  /** 道路の上を走る線路（LRT・路面電車の併用軌道） */
  onStreet: boolean;
  highspeed: boolean;
  name: string;
};

function buildGrid(items: { c: number[]; k?: string; hs?: number; st?: number; n?: string }[]): Grid {
  const segs = new Map<string, Seg[]>();
  const lines: Line[] = [];
  items.forEach((it, line) => {
    lines.push({ k: it.k ?? '', hs: it.hs === 1, st: it.st === 1, n: it.n ?? '' });
    const c = it.c;
    for (let i = 2; i + 1 < c.length; i += 2) {
      const a: [number, number] = [c[i - 2], c[i - 1]];
      const b: [number, number] = [c[i], c[i + 1]];
      const seg = { a, b, line };
      // 線分が通るマスすべてに入れる（線分は短いので、四角で十分）
      const [la0, la1] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
      const [lo0, lo1] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
      for (let y = Math.floor(la0 / CELL_DEG); y <= Math.floor(la1 / CELL_DEG); y++) {
        for (let x = Math.floor(lo0 / CELL_DEG); x <= Math.floor(lo1 / CELL_DEG); x++) {
          const k = `${y}:${x}`;
          const list = segs.get(k);
          if (list) list.push(seg);
          else segs.set(k, [seg]);
        }
      }
    }
  });
  return { segs, lines };
}

/** 点から線分までの距離（m）。狭い範囲なので平面とみなす */
function segDistM(p: LatLng, a: [number, number], b: [number, number]): number {
  const cos = Math.cos((p.lat * Math.PI) / 180);
  const ax = (a[1] - p.lng) * M_PER_DEG * cos;
  const ay = (a[0] - p.lat) * M_PER_DEG;
  const bx = (b[1] - p.lng) * M_PER_DEG * cos;
  const by = (b[0] - p.lat) * M_PER_DEG;
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** いちばん近い線（なければ null）。まわり1マス（約1km）の中だけを調べる */
function nearest(grid: Grid, p: LatLng): { d: number; line: Line } | null {
  const y0 = Math.floor(p.lat / CELL_DEG);
  const x0 = Math.floor(p.lng / CELL_DEG);
  let best: { d: number; line: Line } | null = null;
  for (let y = y0 - 1; y <= y0 + 1; y++) {
    for (let x = x0 - 1; x <= x0 + 1; x++) {
      for (const s of grid.segs.get(`${y}:${x}`) ?? []) {
        const d = segDistM(p, s.a, s.b);
        if (!best || d < best.d) best = { d, line: grid.lines[s.line] };
      }
    }
  }
  return best;
}

// 使うときに一度だけ作る
let railGrid: Grid | null = null;
let motorwayGrid: Grid | null = null;
const rails = () => (railGrid ??= buildGrid(railData.rails));
const motorways = () => (motorwayGrid ??= buildGrid(motorwayData.motorways));

/** いちばん近い線路 */
export function nearestRail(p: LatLng): RailHit | null {
  const hit = nearest(rails(), p);
  return hit ? { distanceM: hit.d, kind: hit.line.k, onStreet: hit.line.st, highspeed: hit.line.hs, name: hit.line.n } : null;
}

/** いちばん近い高速道路までの距離（m）。近くになければ Infinity */
export function motorwayDistanceM(p: LatLng): number {
  return nearest(motorways(), p)?.d ?? Infinity;
}

/** いちばん近い駅。tram：LRT・路面電車の停留場／rail：鉄道の駅 */
export function nearestStation(p: LatLng, kind: 'rail' | 'tram'): { name: string; distanceM: number } | null {
  let best: { name: string; distanceM: number } | null = null;
  for (const s of railData.stations) {
    if ((s.t === 'tram_stop') !== (kind === 'tram')) continue;
    const [lat, lng] = s.p;
    if (Math.abs(lat - p.lat) > 0.02 || Math.abs(lng - p.lng) > 0.025) continue;
    const d = distanceM(p, { lat, lng });
    if (!best || d < best.distanceM) best = { name: s.n, distanceM: d };
  }
  return best;
}

/** 画面と README に出す出典 */
export const GEO_ATTRIBUTION = '線路・駅・高速道路：© OpenStreetMap contributors（ODbL）';
