/**
 * 位置の点の列から「移動」と「止まっていた場所」を見つける（仮の判定）。
 * スマホとブラウザで同じコードを使う。
 *
 * 決まり（要件まとめ 3-2）
 * - 移動の種類が「乗り物」で、時速15km以上なら車の移動とみなす
 * - 5分以上止まったら、そこで1回の運転を区切る
 * - 電車・バスの見分け（仮）：乗る前に「歩く → 3分以上待つ」があれば「電車・バスかも」。
 *   最高時速70km以上なら電車、それ未満ならバスと推定する。本人が「車だった」と答えるまで計算に入れない。
 *   （線路との重なりで見分けるのは、線路のデータを入れてから）
 */

import type { LocationPoint } from '@/location/source';

import { center, distanceM, thin, type LatLng } from './geo';

export const CAR_MIN_SPEED = 15 / 3.6; // m/s
const STOP_SPLIT_MS = 5 * 60 * 1000;
const WALK_LOOKBACK_MS = 15 * 60 * 1000;
const TRANSIT_WAIT_MS = 3 * 60 * 1000;
const TRAIN_SPEED = 70 / 3.6;
const MIN_TRIP_M = 300;

export type TripKind = 'car' | 'train' | 'bus';

export type Trip = {
  /** 始まりの時刻（ミリ秒）を文字にしたもの。答え（車だった など）を覚えるのに使う */
  id: string;
  start: number;
  end: number;
  from: LatLng;
  to: LatLng;
  distanceKm: number;
  maxSpeedKmh: number;
  /** 見つけた種類（推定） */
  guess: TripKind;
  /** 本人の答えを入れたあとの種類 */
  kind: TripKind;
  /** 本人に確かめる必要があるか（電車・バスかも） */
  needsAnswer: boolean;
  path: LatLng[];
};

export type Stop = {
  id: string;
  start: number;
  end: number;
  place: LatLng;
  durationMin: number;
  /** 止まっている間に歩いたか（お迎えの待ち時間と、買い物などを分ける） */
  walked: boolean;
  /** 車で来て、車で出たか */
  byCar: boolean;
  atHome: boolean;
};

const isWalking = (p: LocationPoint) =>
  p.activity === 'walking' || (p.activity === 'unknown' && p.speed >= 0.5 && p.speed < 2.5);
const isVehicle = (p: LocationPoint) =>
  p.activity === 'automotive' || (p.activity === 'unknown' && p.speed >= CAR_MIN_SPEED);

export function detectTrips(
  points: LocationPoint[],
  answers: Record<string, 'car' | 'transit'> = {},
): Trip[] {
  const ms = points.map((p) => Date.parse(p.t));
  const trips: Trip[] = [];
  let i = 0;
  while (i < points.length) {
    // 乗り物で、速く動いている点から始める
    if (!(isVehicle(points[i]) && points[i].speed >= CAR_MIN_SPEED)) {
      i++;
      continue;
    }
    // 始まりは、その前の「乗り物」の点（信号待ちなど）までさかのぼる
    let s = i;
    while (s > 0 && isVehicle(points[s - 1]) && ms[i] - ms[s - 1] < STOP_SPLIT_MS) s--;
    let e = i;
    let lastMoving = ms[i];
    let j = i + 1;
    for (; j < points.length; j++) {
      const p = points[j];
      if (!isVehicle(p)) break;
      if (ms[j] - lastMoving >= STOP_SPLIT_MS) break; // 5分以上止まった
      e = j;
      if (p.speed >= CAR_MIN_SPEED) lastMoving = ms[j];
    }
    // 最後に止まっていた点（信号待ちのあとに長く止まった など）は含めない
    while (e > s && points[e].speed < CAR_MIN_SPEED && ms[e] > lastMoving) e--;

    const seg = points.slice(s, e + 1);
    let dist = 0;
    let max = 0;
    for (let k = 1; k < seg.length; k++) dist += distanceM(seg[k - 1], seg[k]);
    for (const p of seg) max = Math.max(max, p.speed);

    if (dist >= MIN_TRIP_M) {
      const guess = guessKind(points, ms, s, max);
      const id = String(ms[s]);
      const answer = answers[id];
      const kind: TripKind =
        answer === 'car' ? 'car' : answer === 'transit' ? (guess === 'car' ? 'bus' : guess) : guess;
      trips.push({
        id,
        start: ms[s],
        end: ms[e],
        from: seg[0],
        to: seg[seg.length - 1],
        distanceKm: dist / 1000,
        maxSpeedKmh: max * 3.6,
        guess,
        kind,
        needsAnswer: guess !== 'car' && answer == null,
        path: thin(seg),
      });
    }
    i = Math.max(j, i + 1);
  }
  return trips;
}

/** 乗る前に「歩く → 3分以上待つ」があれば、電車・バスかも */
function guessKind(points: LocationPoint[], ms: number[], s: number, maxSpeed: number): TripKind {
  const start = ms[s];
  let k = s - 1;
  // 待っていた時間：乗る直前の、歩いていない点
  while (k >= 0 && !isWalking(points[k]) && start - ms[k] < WALK_LOOKBACK_MS) k--;
  if (k < 0 || !isWalking(points[k])) return 'car';
  const waited = start - ms[k];
  if (waited < TRANSIT_WAIT_MS) return 'car';
  return maxSpeed >= TRAIN_SPEED ? 'train' : 'bus';
}

/** 移動と移動の間の「止まっていた場所」 */
export function detectStops(points: LocationPoint[], trips: Trip[], home: LatLng | null, until: number): Stop[] {
  const stops: Stop[] = [];
  const ms = points.map((p) => Date.parse(p.t));
  for (let i = 0; i < trips.length; i++) {
    const arrive = trips[i];
    const leave = trips[i + 1];
    const start = arrive.end;
    const end = leave ? leave.start : Math.max(until, start);
    let walked = false;
    for (let k = 0; k < points.length; k++) {
      if (ms[k] > start && ms[k] < end && isWalking(points[k])) {
        walked = true;
        break;
      }
    }
    stops.push({
      id: String(start),
      start,
      end,
      place: arrive.to,
      durationMin: (end - start) / 60000,
      walked,
      byCar: arrive.kind === 'car' && (!leave || leave.kind === 'car'),
      atHome: home != null && distanceM(arrive.to, home) < 300,
    });
  }
  return stops;
}

/**
 * 家の推定：夜（20時〜翌7時）に止まっていた点がいちばん多い場所（約100m四方）。
 */
export function estimateHome(points: LocationPoint[]): LatLng | null {
  const cells = new Map<string, LocationPoint[]>();
  for (const p of points) {
    if (p.activity === 'walking' || p.speed >= CAR_MIN_SPEED) continue;
    const hour = new Date(Date.parse(p.t) + 9 * 3600000).getUTCHours();
    if (hour >= 7 && hour < 20) continue;
    const key = `${p.lat.toFixed(3)},${p.lng.toFixed(3)}`;
    const list = cells.get(key) ?? [];
    list.push(p);
    cells.set(key, list);
  }
  let best: LocationPoint[] | null = null;
  for (const list of cells.values()) if (!best || list.length > best.length) best = list;
  return best && best.length >= 3 ? center(best) : null;
}
