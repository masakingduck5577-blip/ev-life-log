/**
 * 位置の点の列から「運転」と「止まっていた場所」を見つける。
 * スマホとブラウザで同じコードを使う。計算はスマホの中だけで行う。
 *
 * 決まり（iPhone では移動の種類が取れないので、速さと時間で見分ける）
 * - 時速15km以上の点から始まり、時速15km以上の点が15分来なくなるまでを1回の運転とする。
 *   途中で止まっていた時間（信号・渋滞・短い用事）も、その運転に含める
 * - 運転の中で同じ場所に5分以上いたところを「止まって待っていた時間」として数える
 * - 車ではない移動（運転が終わったあと、記録した点の列で判断する）。順番は 電車・新幹線・LRT → 自転車など
 *   電車：線路から30m以内の点が2km以上続いた区間を、電車として運転から切り出す（残りは車として残す）。
 *         区間の始まりと終わりがどちらも駅から200m以内なら、電車の判断を確かなものとする
 *   新幹線：時速150km以上が30秒以上続いた区間は電車（線路の上の区間ごと切り出す）
 *   LRT：線路が道路の上を走る区間では、時速50km以上が30秒以上続いていれば車とする
 *   自転車など：時速40km以上が30秒以上続かなかった運転は、車ではないとする
 * - 車ではないと判断した移動は計算に入れず、理由を出す。本人が「車だった」に直せる
 */

import type { LocationPoint } from '@/location/source';

import { center, distanceM, thin, type LatLng } from './geo';
import { motorwayDistanceM, nearestRail, nearestStation } from './rail';

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
/** 線路の上とみなす距離（m）。GPS のぶれ（10〜20m）と、複線の幅を含む */
const ON_RAIL_M = 30;
/** 線路の上がこの距離以上続いたら電車（m）。踏切や、線路沿いの道を少し走っただけを除くため */
const RAIL_RUN_M = 2000;
/** 線路から外れた点がこの距離までなら、線路の上が続いているとみなす（m）。トンネルや駅で位置がぶれるため */
const RAIL_GAP_M = 200;
/** 駅で乗り降りしたとみなす距離（m）。駅の建物とホームの広さ */
const STATION_M = 200;
/** 新幹線：時速150km以上（車では出ない速さ） */
const SHINKANSEN_SPEED = 150 / 3.6;
/** LRT の道路の上の区間で、車とみなす速さ：時速50km以上（道路の上の LRT は時速40kmまで） */
const LRT_CAR_SPEED = 50 / 3.6;
/** 高速道路から30m以内の点は、線路の近くでも線路の上と数えない（高速道路と線路が並んで走る所で、車を電車にしないため） */
const MOTORWAY_M = 30;
/** 電車の区間どうしが、これより短い間で続いていれば1つにまとめる（トンネルなどで線路から外れた所） */
const MERGE_GAP_MS = 3 * 60 * 1000;

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
    for (const piece of classifyRange(track, s, e)) {
      const trip = makeTrip(track, piece.s, piece.e, piece.kind, piece.reason, answers);
      if (trip) trips.push(trip);
    }
  }
  return trips;
}

type Piece = { s: number; e: number; kind: TripKind; reason: string | null };

/** 1回の運転を、電車の区間と車（または車ではない）の区間に分ける。順番は 新幹線・電車・LRT → 自転車など */
export function classifyRange(track: Track, s: number, e: number): Piece[] {
  // 電車・新幹線・LRT：線路の上が2km以上続いた区間と、時速150km以上が続いた区間を切り出す。
  // 重なる区間や、すぐ続く区間は1つにまとめてから判断する（LRT の道路の上で速く走っていれば車）
  const candidates = findRailRanges(track, s, e);
  const fast = shinkansenRange(track, s, e);
  if (fast) candidates.push(fast);
  const trains = mergeRanges(track, candidates)
    .map(([a, b]) => judgeRailRange(track, a, b))
    .filter((r): r is RailRun => r != null);

  const pieces: Piece[] = [];
  let cursor = s;
  for (const run of trains) {
    if (run.s > cursor) pieces.push(...carOrOther(track, cursor, run.s - 1));
    pieces.push({ s: run.s, e: run.e, kind: 'train', reason: run.reason });
    cursor = run.e + 1;
  }
  if (cursor <= e) pieces.push(...carOrOther(track, cursor, e));
  return pieces;
}

/** 自転車など：時速40km以上が30秒以上続かなかった区間は、車ではない */
function carOrOther(track: Track, s: number, e: number): Piece[] {
  if (sustained(track, s, e, CAR_PROOF_SPEED, SUSTAIN_MS)) return [{ s, e, kind: 'car', reason: null }];
  return [{ s, e, kind: 'other', reason: `車ではないと判断しました（最高 時速${Math.round(maxSpeedKmh(track, s, e))}km）` }];
}

type RailRun = { s: number; e: number; reason: string };

/** 点が線路の上か（線路から30m以内で、高速道路から30mより離れている） */
function railHit(p: LocationPoint) {
  const hit = nearestRail(p);
  return hit != null && hit.distanceM <= ON_RAIL_M && motorwayDistanceM(p) > MOTORWAY_M ? hit : null;
}

function lengthM(track: Track, s: number, e: number): number {
  let length = 0;
  for (let m = s + 1; m <= e; m++) length += distanceM(track.points[m - 1], track.points[m]);
  return length;
}

/** 線路から30m以内の点が2km以上続いた区間（点の番号の範囲） */
function findRailRanges(track: Track, s: number, e: number): [number, number][] {
  const { points } = track;
  const onRail = points.slice(s, e + 1).map((p) => railHit(p) != null);
  const ranges: [number, number][] = [];
  let k = s;
  while (k <= e) {
    if (!onRail[k - s]) {
      k++;
      continue;
    }
    // 線路の上が続く区間（外れた点が200mまでなら続いているとみなす）
    const start = k;
    let last = k;
    let off = 0;
    for (let j = k + 1; j <= e; j++) {
      if (onRail[j - s]) {
        last = j;
        off = 0;
      } else {
        off += distanceM(points[j - 1], points[j]);
        if (off > RAIL_GAP_M) break;
      }
    }
    if (lengthM(track, start, last) >= RAIL_RUN_M) ranges.push([start, last]);
    k = last + 1;
  }
  return ranges;
}

/** 重なる区間や、3分以内に続く区間を1つにまとめる */
function mergeRanges(track: Track, ranges: [number, number][]): [number, number][] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const r of sorted) {
    const last = out[out.length - 1];
    if (last && (r[0] <= last[1] + 1 || track.ms[r[0]] - track.ms[last[1]] <= MERGE_GAP_MS)) {
      last[1] = Math.max(last[1], r[1]);
    } else {
      out.push([r[0], r[1]]);
    }
  }
  return out;
}

/** 線路の上の区間が電車か（LRT の道路の上の区間で速く走っていれば車）。電車なら理由をつけて返す */
function judgeRailRange(track: Track, s: number, e: number): RailRun | null {
  const near = track.points.slice(s, e + 1).map(railHit).filter((h) => h != null);
  const majority = (f: (h: (typeof near)[number]) => boolean) => near.filter(f).length > near.length / 2;
  const onStreet = majority((h) => h.onStreet);
  const tram = majority((h) => h.kind === 'tram' || h.kind === 'light_rail');
  const shinkansen = sustained(track, s, e, SHINKANSEN_SPEED, SUSTAIN_MS);
  // LRT：道路の上の区間で、時速50km以上が30秒以上続いていれば車（道路の上の LRT は時速40kmまで）
  if (!shinkansen && onStreet && sustained(track, s, e, LRT_CAR_SPEED, SUSTAIN_MS)) return null;
  const what = shinkansen ? '新幹線' : tram ? 'LRT' : '電車';
  const km = (lengthM(track, s, e) / 1000).toFixed(1);
  const from = nearestStation(track.points[s], tram ? 'tram' : 'rail');
  const to = nearestStation(track.points[e], tram ? 'tram' : 'rail');
  const sure = from != null && to != null && from.distanceM <= STATION_M && to.distanceM <= STATION_M;
  const where = near.length ? `線路の上を${km}km` : `${km}km`;
  const reason = sure
    ? `電車と判断しました（${what}・${where}、${from.name}〜${to.name}）`
    : `電車と判断しました（${what}・${where}。駅での乗り降りは確かめられません）`;
  return { s, e, reason };
}

/** 時速150km以上が30秒以上続いた区間を、前後の動いている間（時速15km以上）まで広げたもの */
function shinkansenRange(track: Track, s: number, e: number): [number, number] | null {
  if (!sustained(track, s, e, SHINKANSEN_SPEED, SUSTAIN_MS)) return null;
  const { sp, ms } = track;
  let a = s;
  while (a <= e && sp[a] < SHINKANSEN_SPEED) a++;
  let b = e;
  while (b >= s && sp[b] < SHINKANSEN_SPEED) b--;
  while (a > s && sp[a - 1] >= DRIVE_SPEED && ms[a] - ms[a - 1] < BACKTRACK_GAP_MS) a--;
  while (b < e && sp[b + 1] >= DRIVE_SPEED && ms[b + 1] - ms[b] < BACKTRACK_GAP_MS) b++;
  return [a, b];
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
