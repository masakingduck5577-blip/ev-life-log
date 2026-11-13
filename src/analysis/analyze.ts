/**
 * 1週間の記録の分析（仮）。位置の点の列 → 移動・止まった場所・1日ごとのまとめ・EVの計算。
 */

import { CHARGERS, EVS, type Charger } from '@/data/simulator';
import { DAY_MS } from '@/lib/clock';
import { jstMidnight } from '@/lib/format';
import type { LocationPoint } from '@/location/source';

import { calcEv, perMonth, type EvInput, type EvResult } from './ev';
import { distanceM, nearBox, type LatLng } from './geo';
import { detectStops, detectTrips, estimateHome, type Stop, type Trip } from './trips';

/** 待っていた時間とみなす停車（お迎えなど）：車で来て車で出た・歩いていない・家ではない・5〜30分 */
const WAIT_MIN = 5;
const WAIT_MAX = 30;
/** 充電スポットに止まった：スポットから150m以内に15分以上 */
const CHARGER_STOP_M = 150;
const CHARGER_STOP_MIN = 15;
/** 通った道と行き先の近くの充電スポット */
const NEAR_ROUTE_M = 500;

export type ChargeAnswer = { charged: boolean; yen?: number | null };
export type Answers = {
  /** 家の推定を本人が確かめたか（true：はい／false：ちがう） */
  homeConfirmed?: boolean | null;
  /** 移動の答え（電車・バスかも → 車だった など） */
  trips?: Record<string, 'car' | 'transit'>;
  /** 充電スポットで「ここで充電しましたか？」の答え */
  charges?: Record<string, ChargeAnswer>;
};

export type ChargerStop = { stop: Stop; charger: Charger; distanceM: number };
export type SpotNearRoute = { charger: Charger; passes: number; nearestM: number };

export type DayInfo = {
  dayStart: number;
  trips: Trip[];
  carTrips: Trip[];
  carKm: number;
  waitMin: number;
  waits: Stop[];
  stops: Stop[];
};

export type Analysis = {
  home: LatLng | null;
  trips: Trip[];
  stops: Stop[];
  days: DayInfo[];
  carKm: number;
  carTripCount: number;
  waitMin: number;
  needsAnswer: Trip[];
  chargerStops: ChargerStop[];
  spots: SpotNearRoute[];
  ev: EvResult;
};

export function analyze(
  points: LocationPoint[],
  options: { startedAt: number; days: number; until: number; evInput: EvInput; answers: Answers },
): Analysis {
  const { startedAt, days, until, evInput, answers } = options;
  const weekStart = jstMidnight(startedAt);
  const home = answers.homeConfirmed === false ? null : estimateHome(points);
  const trips = detectTrips(points, answers.trips ?? {});
  const stops = detectStops(points, trips, home, until);
  const carTrips = trips.filter((t) => t.kind === 'car');

  // 充電スポットに止まっていた時間は、待ち時間に数えない（充電していたかもしれないため）
  const chargerStops = findChargerStops(stops);
  const atCharger = new Set(chargerStops.map((c) => c.stop.id));
  const isWait = (s: Stop) =>
    s.byCar &&
    !s.walked &&
    !s.atHome &&
    !atCharger.has(s.id) &&
    s.durationMin >= WAIT_MIN &&
    s.durationMin <= WAIT_MAX;

  const dayInfos: DayInfo[] = Array.from({ length: days }, (_, i) => {
    const from = weekStart + i * DAY_MS;
    const to = from + DAY_MS;
    const inDay = (t: number) => t >= from && t < to;
    const dTrips = trips.filter((t) => inDay(t.start));
    const dCar = dTrips.filter((t) => t.kind === 'car');
    const dStops = stops.filter((s) => inDay(s.start));
    const waits = dStops.filter(isWait);
    return {
      dayStart: from,
      trips: dTrips,
      carTrips: dCar,
      carKm: dCar.reduce((s, t) => s + t.distanceKm, 0),
      waitMin: waits.reduce((s, w) => s + w.durationMin, 0),
      waits,
      stops: dStops,
    };
  });

  return {
    home,
    trips,
    stops,
    days: dayInfos,
    carKm: carTrips.reduce((s, t) => s + t.distanceKm, 0),
    carTripCount: carTrips.length,
    waitMin: dayInfos.reduce((s, d) => s + d.waitMin, 0),
    needsAnswer: trips.filter((t) => t.needsAnswer),
    chargerStops,
    spots: spotsNearRoute(carTrips),
    ev: calcEv(evInput, trips, stops, weekStart, days),
  };
}

function findChargerStops(stops: Stop[]): ChargerStop[] {
  const out: ChargerStop[] = [];
  for (const s of stops) {
    if (!s.byCar || s.atHome || s.durationMin < CHARGER_STOP_MIN) continue;
    const box = nearBox(s.place, CHARGER_STOP_M);
    let best: ChargerStop | null = null;
    for (const c of CHARGERS) {
      if (!box(c)) continue;
      const d = distanceM(s.place, c);
      if (d <= CHARGER_STOP_M && (!best || d < best.distanceM)) best = { stop: s, charger: c, distanceM: d };
    }
    if (best) out.push(best);
  }
  return out;
}

/** 車で通った道と行き先から500m以内の充電スポット（通った回数の多い順） */
export function spotsNearRoute(carTrips: Trip[]): SpotNearRoute[] {
  const found = new Map<string, SpotNearRoute>();
  for (const trip of carTrips) {
    const seen = new Set<string>();
    for (const p of trip.path) {
      const box = nearBox(p, NEAR_ROUTE_M);
      for (const c of CHARGERS) {
        if (!box(c)) continue;
        const d = distanceM(p, c);
        if (d > NEAR_ROUTE_M) continue;
        const cur = found.get(c.id) ?? { charger: c, passes: 0, nearestM: d };
        cur.nearestM = Math.min(cur.nearestM, d);
        if (!seen.has(c.id)) {
          cur.passes++;
          seen.add(c.id);
        }
        found.set(c.id, cur);
      }
    }
  }
  return [...found.values()].sort((a, b) => b.passes - a.passes || a.nearestM - b.nearestM);
}

/* ---------- EVに乗っている人：あなたの充電代（E3） ---------- */

export type OwnChargeCost = {
  weekYen: number;
  monthYen: number;
  perKmYen: number;
  homeYen: number;
  publicYen: number;
  homeKwh: number;
  publicKwh: number;
  publicCount: number;
  /** 金額を入れた充電の回数 */
  paidKnown: number;
  gasYen: number;
  /** 夜が安いプランにしたら（目安） */
  nightPlanYen: number | null;
  usedKwh: number;
};

/** 夜が安いプランの単価（円/kWh、目安。プランによって違う） */
export const NIGHT_PLAN_PRICE = 25;

export function ownChargeCost(a: Analysis, input: EvInput, answers: Answers): OwnChargeCost {
  const ev = EVS[input.evKey] ?? EVS['n-one-e'];
  const used = a.ev.normal.usedKwh;
  let publicKwh = 0;
  let publicYen = 0;
  let paidKnown = 0;
  let publicCount = 0;
  for (const cs of a.chargerStops) {
    const ans = answers.charges?.[cs.stop.id];
    if (!ans?.charged) continue;
    publicCount++;
    const kw = cs.charger.type === 'quick' ? Math.min(cs.charger.kw ?? 50, ev.quickKw) : Math.min(cs.charger.kw ?? 6, ev.acKw);
    // 入れた量の推定：止めていた時間 × 速さ。ただし、1回で入るのは電池の60%まで、
    // 1週間で入れた量は、走って使った量まで（仮）
    const kwh = Math.max(0, Math.min((cs.stop.durationMin / 60) * kw, ev.batteryKwh * 0.6, used - publicKwh));
    publicKwh += kwh;
    if (ans.yen != null && ans.yen >= 0) {
      publicYen += ans.yen;
      paidKnown++;
    } else {
      publicYen += kwh * input.publicPrice;
    }
  }
  // 残りは家で入れたと推定する（家で充電できない人は、外の単価で）
  const restKwh = Math.max(0, used - publicKwh);
  const homeYen = input.homeEnv === 'none' ? restKwh * input.publicPrice : restKwh * input.homePrice;
  const weekYen = homeYen + publicYen;
  return {
    weekYen,
    monthYen: perMonth(weekYen),
    perKmYen: a.carKm > 0 ? weekYen / a.carKm : 0,
    homeYen,
    publicYen,
    homeKwh: input.homeEnv === 'none' ? 0 : restKwh,
    publicKwh: publicKwh + (input.homeEnv === 'none' ? restKwh : 0),
    publicCount,
    paidKnown,
    gasYen: a.ev.cost.gas,
    nightPlanYen:
      input.homeEnv !== 'none' && input.homePrice > NIGHT_PLAN_PRICE
        ? restKwh * NIGHT_PLAN_PRICE + publicYen
        : null,
    usedKwh: used,
  };
}

