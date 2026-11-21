/**
 * 位置の点の列から「移動」と「止まっていた場所」を見つける（仮の判定）。
 * スマホとブラウザで同じコードを使う。
 *
 * 決まり（iPhone では移動の種類が取れていないので、速さで見分ける）
 * - 時速20km以上で動き出してから、5分以上止まる（または時速8km未満が5分続く）までを1回の運転とする。
 *   信号や渋滞で少し止まっても区切らない
 * - 電車かも・自転車かもの移動は、本人が「車だった」と答えるまで計算に入れない。バスは見分けない
 *   （線路との重なりで見分けるのは、線路のデータを入れてから）
 */

import type { LocationPoint } from '@/location/source';

import { center, distanceM, thin, type LatLng } from './geo';

/** 家の推定で「動いている点」を除くための速さ（m/s） */
export const CAR_MIN_SPEED = 15 / 3.6;
/** 運転の始まり：時速20km以上 */
const DRIVE_START_SPEED = 20 / 3.6;
/** 動いているとみなす速さ：時速8km以上（これ未満は止まっている・歩いている） */
const MOVING_SPEED = 8 / 3.6;
/** 5分以上止まったら、そこで運転を区切る */
const STOP_SPLIT_MS = 5 * 60 * 1000;
/** 誤差がこれより大きい点は使わない（m） */
const MAX_ACCURACY_M = 50;
const WALK_LOOKBACK_MS = 15 * 60 * 1000;
const TRANSIT_WAIT_MS = 3 * 60 * 1000;
/** これだけ歩いたあとに止まったら、乗り換えなどとみなして区切る */
const WALK_BEFORE_WAIT_MS = 60 * 1000;
/** 動き出す直前のゆっくりした点（歩きと見分けない） */
const START_CREEP_MS = 30 * 1000;
const TRAIN_SPEED = 70 / 3.6;
const BIKE_MAX_SPEED = 35 / 3.6;
const BIKE_AVG_SPEED = 20 / 3.6;
const MIN_TRIP_M = 500;

export type TripKind = 'car' | 'train' | 'bike';

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
  /** 本人に確かめる必要があるか（電車かも・自転車かも） */
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
export function detectTrips(
  allPoints: LocationPoint[],
  answers: Record<string, 'car' | 'transit'> = {},
): Trip[] {
  // 誤差の大きい点は使わない（誤差が分からない点は使う）
  const points = allPoints.filter((p) => p.accuracy < 0 || p.accuracy <= MAX_ACCURACY_M);
  const ms = points.map((p) => Date.parse(p.t));
  const sp = speeds(points, ms);
  const trips: Trip[] = [];
  let i = 0;
  while (i < points.length) {
    // 時速20km以上で動いた点から始める
    if (sp[i] < DRIVE_START_SPEED) {
      i++;
      continue;
    }
    // 始まりは、その直前の動き出し（加速中）までさかのぼる
    let s = i;
    while (s > 0 && sp[s - 1] >= MOVING_SPEED && ms[s] - ms[s - 1] < STOP_SPLIT_MS) s--;

    // 終わり：5分以上止まった（点が来ない）か、ゆっくり（時速8km未満）が5分続いたところ。
    // また、1分以上歩いたあとに3分以上止まったところ（降りて歩き、駅で待った など）。
    // 信号や渋滞で少し止まっても、そこでは区切らない
    let lastMoving = i;
    let walkSince: number | null = null;
    for (let j = i + 1; j < points.length; j++) {
      const gap = ms[j] - ms[j - 1];
      if (gap >= STOP_SPLIT_MS) break;
      if (gap >= TRANSIT_WAIT_MS && walkSince != null && ms[j - 1] - walkSince >= WALK_BEFORE_WAIT_MS) break;
      if (sp[j] >= MOVING_SPEED) {
        lastMoving = j;
        walkSince = null;
      } else {
        if (isWalking(points[j])) walkSince ??= ms[j];
        else walkSince = null;
        if (ms[j] - ms[lastMoving] >= STOP_SPLIT_MS) break;
      }
    }
    // 最後に動いていた点まで（降りて歩いた分は入れない）
    const e = lastMoving;

    const seg = points.slice(s, e + 1);
    let dist = 0;
    let max = 0;
    for (let k = 1; k < seg.length; k++) dist += distanceM(seg[k - 1], seg[k]);
    for (let k = s; k <= e; k++) max = Math.max(max, sp[k]);
    const avg = ms[e] > ms[s] ? dist / ((ms[e] - ms[s]) / 1000) : 0;

    if (dist >= MIN_TRIP_M) {
      const guess = guessKind(points, ms, s, max, avg);
      const id = String(ms[s]);
      const answer = answers[id];
      const kind: TripKind =
        answer === 'car' ? 'car' : answer === 'transit' ? (guess === 'car' ? 'train' : guess) : guess;
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
    i = e + 1;
  }
  return trips;
}

/** 点ごとの速さ（m/s）。スマホが速さを出さなかった点は、前の点との距離と時間から出す */
function speeds(points: LocationPoint[], ms: number[]): number[] {
  return points.map((p, i) => {
    if (p.speed >= 0) return p.speed;
    if (i === 0 || ms[i] <= ms[i - 1]) return 0;
    return distanceM(points[i - 1], p) / ((ms[i] - ms[i - 1]) / 1000);
  });
}

/**
 * 車かどうかの推定（迷うものは本人に確かめる）
 * - 電車かも：乗る前に「歩く → 3分以上待つ」があり、最高時速70km以上
 *   （高速道路は、運転の途中で速くなるだけなので、ここには入らない）
 * - 自転車かも：最高時速35km未満で、平均も時速20km未満
 */
function guessKind(points: LocationPoint[], ms: number[], s: number, maxSpeed: number, avgSpeed: number): TripKind {
  if (maxSpeed >= TRAIN_SPEED && walkedThenWaited(points, ms, s)) return 'train';
  if (maxSpeed < BIKE_MAX_SPEED && avgSpeed < BIKE_AVG_SPEED) return 'bike';
  return 'car';
}

function walkedThenWaited(points: LocationPoint[], ms: number[], s: number): boolean {
  const start = ms[s];
  let k = s - 1;
  // 動き出す直前（30秒）のゆっくりした点は、歩きとみなさない
  while (k >= 0 && start - ms[k] < START_CREEP_MS) k--;
  // 待っていた時間：乗る直前の、歩いていない点（止まっていると点が来ないこともある）
  while (k >= 0 && !isWalking(points[k]) && start - ms[k] < WALK_LOOKBACK_MS) k--;
  if (k < 0 || !isWalking(points[k])) return false;
  return start - ms[k] >= TRANSIT_WAIT_MS;
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
