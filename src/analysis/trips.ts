/**
 * 位置の点の列から「運転」と「止まっていた場所」を見つける。
 * スマホとブラウザで同じコードを使う。計算はスマホの中だけで行う。
 *
 * 決まり（iPhone では移動の種類が取れないので、速さと時間で見分ける）
 * - 時速15km以上の点から始まり、時速15km以上の点が15分来なくなるまでを1回の運転とする。
 *   途中で止まっていた時間（信号・渋滞・短い用事）も、その運転に含める
 * - 運転の中で同じ場所に5分以上いたところを「止まって待っていた時間」として数える
 * - 車ではない移動（運転が終わったあと、記録した点の列で判断する）
 *   自転車など：時速40km以上が30秒以上続かなかった運転は、車ではないとする
 * - 車ではないと判断した移動は計算に入れず、理由を出す。本人が「車だった」に直せる
 */

import type { LocationPoint } from '@/location/source';

import { center, distanceM, thin, type LatLng } from './geo';

/* ---------- 決まりの値（理由） ---------- */
/** 運転の始まりと続きを見る速さ：時速15km以上（歩きやゆっくりの自転車より速く、街中の運転は含む） */
export const DRIVE_SPEED = 15 / 3.6;
/** 始まりをさかのぼる速さ：時速8km以上（動き出しの加速中の距離を入れるため。歩きより速い） */
const MOVING_SPEED = 8 / 3.6;
/** 始まりをさかのぼるときに、点のすき間がこれ以上なら止める（前の移動とつなげないため） */
const BACKTRACK_GAP_MS = 5 * 60 * 1000;
/** 時速15km以上の点がこの時間来なければ運転を区切る（信号・渋滞・短い用事では区切らないため） */
export const TRIP_GAP_MS = 15 * 60 * 1000;
/** 運転の中で、同じ場所にこの時間以上いたら「止まって待っていた」とする（信号待ちより長い） */
const WAIT_MIN_MS = 5 * 60 * 1000;
/** 「同じ場所」とみなす広さ（m）。位置のぶれ（数十m）を同じ場所とみなすため */
const WAIT_RADIUS_M = 100;
/** 誤差がこれより大きい点は使わない（m）。位置が大きくずれた点で距離が増えないように */
const MAX_ACCURACY_M = 50;
/** これより短い移動は数えない（m）。位置のぶれで生まれる見かけの移動を除くため */
const MIN_TRIP_M = 500;
/** 車とみなす速さ：時速40km以上（自転車ではまず続けて出ない速さ） */
const CAR_PROOF_SPEED = 40 / 3.6;
/** その速さが続く時間：30秒以上（下り坂の自転車や、位置のぶれの一瞬を除くため） */
const SUSTAIN_MS = 30 * 1000;

/** 家の推定で「動いている点」を除くための速さ（m/s） */
export const CAR_MIN_SPEED = DRIVE_SPEED;

/** car：車／train：電車（線路の上）／other：車ではない（自転車など） */
export type TripKind = 'car' | 'train' | 'other';

/** 運転の中で止まって待っていたところ */
export type TripWait = { start: number; end: number; place: LatLng; durationMin: number };

export type Trip = {
  /** 始まりの時刻（ミリ秒）を文字にしたもの。答え（車だった など）を覚えるのに使う */
  id: string;
  start: number;
  end: number;
  from: LatLng;
  to: LatLng;
  distanceKm: number;
  maxSpeedKmh: number;
  /** アプリが判断した種類 */
  guess: TripKind;
  /** 本人の直しを入れたあとの種類 */
  kind: TripKind;
  /** 車ではないと判断した理由（画面に出す）。車なら null */
  reason: string | null;
  /** 本人に聞く必要があるか（今の決まりでは聞かない。判断した理由を出して、本人が直せるようにする） */
  needsAnswer: boolean;
  /** 運転の中で止まって待っていた時間（分）と、その場所 */
  waitMin: number;
  waits: TripWait[];
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

/** 使う点（誤差の大きい点を除く）と、その時刻・速さ */
export type Track = { points: LocationPoint[]; ms: number[]; sp: number[] };

export function toTrack(allPoints: LocationPoint[]): Track {
  // 誤差の大きい点は使わない（誤差が分からない点は使う）
  const points = allPoints.filter((p) => p.accuracy < 0 || p.accuracy <= MAX_ACCURACY_M);
  const ms = points.map((p) => Date.parse(p.t));
  return { points, ms, sp: speeds(points, ms) };
}

/** 運転の区間（点の番号 s〜e）を見つける */
export function findDriveRanges(track: Track): [number, number][] {
  const { ms, sp } = track;
  const ranges: [number, number][] = [];
  let i = 0;
  while (i < ms.length) {
    // 時速15km以上の点から始める
    if (sp[i] < DRIVE_SPEED) {
      i++;
      continue;
    }
    // 始まりは、その直前の動き出し（時速8km以上）までさかのぼる
    let s = i;
    while (s > 0 && sp[s - 1] >= MOVING_SPEED && ms[s] - ms[s - 1] < BACKTRACK_GAP_MS) s--;
    // 終わり：時速15km以上の点が15分来なかったところ。終わりの地点・時刻は最後の時速15km以上の点
    let lastFast = i;
    let j = i + 1;
    for (; j < ms.length; j++) {
      if (ms[j] - ms[lastFast] >= TRIP_GAP_MS) break;
      if (sp[j] >= DRIVE_SPEED) lastFast = j;
    }
    ranges.push([s, lastFast]);
    i = lastFast + 1;
  }
  return ranges;
}

/** 点の番号 s〜e の区間を、1つの移動にまとめる（短すぎれば null） */
export function makeTrip(
  track: Track,
  s: number,
  e: number,
  guess: TripKind,
  reason: string | null,
  answers: Record<string, 'car' | 'transit'>,
): Trip | null {
  const { points, ms, sp } = track;
  const seg = points.slice(s, e + 1);
  const waits = findWaits(seg, ms.slice(s, e + 1));
  // 止まって待っていた間の位置のぶれは、距離に入れない
  const inWait = (t: number) => waits.some((w) => t >= w.start && t <= w.end);
  let dist = 0;
  for (let k = 1; k < seg.length; k++) {
    if (inWait(ms[s + k - 1]) && inWait(ms[s + k])) continue;
    dist += distanceM(seg[k - 1], seg[k]);
  }
  if (dist < MIN_TRIP_M) return null;
  let max = 0;
  for (let k = s; k <= e; k++) max = Math.max(max, sp[k]);
  const id = String(ms[s]);
  // 本人が「車だった」と直したものは車にする
  const kind: TripKind = answers[id] === 'car' ? 'car' : guess;
  return {
    id,
    start: ms[s],
    end: ms[e],
    from: seg[0],
    to: seg[seg.length - 1],
    distanceKm: dist / 1000,
    maxSpeedKmh: max * 3.6,
    guess,
    kind,
    reason,
    needsAnswer: false,
    waitMin: waits.reduce((sum, w) => sum + w.durationMin, 0),
    waits,
    path: thin(seg),
  };
}

/** 同じ場所（100m以内）に5分以上いたところ。止まっていると点が来ないので、点のすき間も含めて数える */
function findWaits(seg: LocationPoint[], ms: number[]): TripWait[] {
  const out: TripWait[] = [];
  let a = 0;
  while (a < seg.length) {
    let b = a;
    while (b + 1 < seg.length && distanceM(seg[a], seg[b + 1]) <= WAIT_RADIUS_M) b++;
    if (ms[b] - ms[a] >= WAIT_MIN_MS) {
      out.push({ start: ms[a], end: ms[b], place: center(seg.slice(a, b + 1)), durationMin: (ms[b] - ms[a]) / 60000 });
      a = b + 1;
    } else {
      a++;
    }
  }
  return out;
}

export function detectTrips(
  allPoints: LocationPoint[],
  answers: Record<string, 'car' | 'transit'> = {},
): Trip[] {
  const track = toTrack(allPoints);
  const trips: Trip[] = [];
  for (const [s, e] of findDriveRanges(track)) {
    // 自転車など：時速40km以上が30秒以上続かなかった運転は、車ではない
    const isCar = sustained(track, s, e, CAR_PROOF_SPEED, SUSTAIN_MS);
    const trip = isCar
      ? makeTrip(track, s, e, 'car', null, answers)
      : makeTrip(track, s, e, 'other', `車ではないと判断しました（最高 時速${Math.round(maxSpeedKmh(track, s, e))}km）`, answers);
    if (trip) trips.push(trip);
  }
  return trips;
}

/** 点の番号 s〜e の中で、speed 以上が続けて ms 以上あったか */
export function sustained(track: Track, s: number, e: number, speed: number, ms: number): boolean {
  let runStart = -1;
  for (let k = s; k <= e; k++) {
    if (track.sp[k] >= speed) {
      if (runStart < 0) runStart = k;
      if (track.ms[k] - track.ms[runStart] >= ms) return true;
    } else {
      runStart = -1;
    }
  }
  return false;
}

function maxSpeedKmh(track: Track, s: number, e: number): number {
  let max = 0;
  for (let k = s; k <= e; k++) max = Math.max(max, track.sp[k]);
  return max * 3.6;
}

/** 点ごとの速さ（m/s）。スマホが速さを出さなかった点は、前の点との距離と時間から出す */
function speeds(points: LocationPoint[], ms: number[]): number[] {
  return points.map((p, i) => {
    if (p.speed >= 0) return p.speed;
    if (i === 0 || ms[i] <= ms[i - 1]) return 0;
    return distanceM(points[i - 1], p) / ((ms[i] - ms[i - 1]) / 1000);
  });
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
