/**
 * 「あなたの1週間がEVだったら」の計算（仮）。式と値は Web 版シミュレーターに合わせる。
 *
 * - 電費：カタログ値 ÷ 実際の係数（0.9）÷ 季節の係数（夏0.9・冬0.7・春秋1）
 * - 電池は90%まで充電する想定。安心ラインは20%
 * - 家での充電：家に1時間以上止めたら、止めた時間 × 家の充電の速さ（仮：3kW）で90%まで
 * - 電池が安心ラインを下回りそうなら、その前に外で急速充電（80%まで）したことにする
 * - 費用：家の電気代・外の充電の単価・ガソリン代はシミュレーターと同じ
 */

import { DAY_MS } from '@/lib/clock';
import { jstMidnight } from '@/lib/format';
import { EVS, GASES, PARAMS, type EvSpec } from '@/data/simulator';

import type { Stop, Trip } from './trips';

/** 家の充電の速さ（kW）。200Vの普通充電の目安（仮） */
export const HOME_CHARGE_KW = 3;
export const FULL_SOC = 90;
export const SAFE_SOC = 20;
const PUBLIC_TARGET_SOC = 80;
const HOME_MIN_PARK_MIN = 60;
/** ガソリンスタンドに行く回数の計算に使うタンクの大きさ（L、目安） */
export const TANK_L = 30;

export type HomeEnv = 'have' | 'install' | 'none';
export type Season = 'normal' | 'winter';

export type EvInput = {
  evKey: string;
  homeEnv: HomeEnv;
  /** 今の車の燃費（km/L）。null ならEVの比較相手のカタログ燃費 */
  gasKmPerL: number | null;
  /** 家の電気の単価（円/kWh） */
  homePrice: number;
  /** 外の充電の単価（円/kWh） */
  publicPrice: number;
};

export type DayBattery = {
  dayStart: number;
  startSoc: number;
  minSoc: number;
  endSoc: number;
  km: number;
  usedKwh: number;
  homeChargedKwh: number;
  /** 家に止めていた時間で、充電できた量（満タンかどうかに関係なく） */
  homeChargeableKwh: number;
  homeParkMin: number;
  publicCharges: number;
};

export type SeasonResult = {
  season: Season;
  factor: number;
  days: DayBattery[];
  minSoc: number;
  usedKwh: number;
  homeKwh: number;
  publicKwh: number;
  publicCharges: number;
  homeCharges: number;
};

export type EvResult = {
  ev: EvSpec;
  evKey: string;
  gasName: string;
  gasKmPerL: number;
  weekKm: number;
  yearKm: number;
  normal: SeasonResult;
  winter: SeasonResult;
  /** 1週間の費用（円） */
  cost: { gas: number; ev: number; evHome: number; evPublic: number; gasLiters: number };
  /** 外で充電する回数（週あたり、ならした値） */
  publicPerWeek: { normal: number; winter: number };
  /** 判定の1行 */
  verdict: { level: 'ok' | 'winter' | 'public'; text: string };
};

/** 季節の係数（記録した月から）。冬：12〜2月、夏：6〜8月、ほか1 */
export function seasonFactorFor(ms: number): number {
  const month = new Date(ms + 9 * 3600000).getUTCMonth() + 1;
  if (month === 12 || month <= 2) return PARAMS.winterFactor;
  if (month >= 6 && month <= 8) return PARAMS.summerFactor;
  return 1;
}

export function whPerKm(ev: EvSpec, factor: number) {
  return ev.whPerKm / PARAMS.evRealFactor / factor;
}

function simulate(
  ev: EvSpec,
  trips: Trip[],
  stops: Stop[],
  homeCharge: boolean,
  factor: number,
  weekStart: number,
  days: number,
  season: Season,
): SeasonResult {
  const cap = ev.batteryKwh;
  const perKm = whPerKm(ev, factor) / 1000; // kWh/km
  let soc = FULL_SOC;
  const daysOut: DayBattery[] = Array.from({ length: days }, (_, i) => ({
    dayStart: weekStart + i * DAY_MS,
    startSoc: NaN,
    minSoc: Infinity,
    endSoc: NaN,
    km: 0,
    usedKwh: 0,
    homeChargedKwh: 0,
    homeChargeableKwh: 0,
    homeParkMin: 0,
    publicCharges: 0,
  }));
  let publicKwh = 0;
  let homeKwh = 0;
  let homeCharges = 0;

  type Ev = { t: number; trip?: Trip; stop?: Stop };
  const events: Ev[] = [
    ...trips.filter((t) => t.kind === 'car').map((trip) => ({ t: trip.start, trip })),
    ...stops.filter((s) => s.atHome).map((stop) => ({ t: stop.start, stop })),
  ].sort((a, b) => a.t - b.t);

  // 1日ずつ、その日の出来事を時刻の順に計算する
  let k = 0;
  for (let di = 0; di < days; di++) {
    const d = daysOut[di];
    d.startSoc = soc;
    d.minSoc = soc;
    const dayEnd = weekStart + (di + 1) * DAY_MS;
    for (; k < events.length && (events[k].t < dayEnd || di === days - 1); k++) {
      step(events[k], d);
    }
    d.endSoc = soc;
  }

  function step(e: Ev, d: DayBattery) {
    if (e.trip) {
      const need = e.trip.distanceKm * perKm;
      // 安心ラインを下回りそうなら、先に外で急速充電
      if (soc - (need / cap) * 100 < SAFE_SOC) {
        const add = Math.max(0, ((PUBLIC_TARGET_SOC - soc) / 100) * cap);
        soc += (add / cap) * 100;
        publicKwh += add;
        d.publicCharges++;
      }
      soc -= (need / cap) * 100;
      d.km += e.trip.distanceKm;
      d.usedKwh += need;
      d.minSoc = Math.min(d.minSoc, soc);
    } else if (e.stop) {
      // 家に止めていた時間は、その日（止め始めた日）に数える
      const hours = e.stop.durationMin / 60;
      d.homeParkMin += e.stop.durationMin;
      d.homeChargeableKwh += hours * HOME_CHARGE_KW;
      if (homeCharge && e.stop.durationMin >= HOME_MIN_PARK_MIN && soc < FULL_SOC) {
        const add = Math.min(hours * HOME_CHARGE_KW, ((FULL_SOC - soc) / 100) * cap);
        soc += (add / cap) * 100;
        homeKwh += add;
        d.homeChargedKwh += add;
        homeCharges++;
      }
    }
  }

  const publicCharges = daysOut.reduce((s, d) => s + d.publicCharges, 0);
  return {
    season,
    factor,
    days: daysOut,
    minSoc: Math.min(...daysOut.map((d) => d.minSoc)),
    usedKwh: daysOut.reduce((s, d) => s + d.usedKwh, 0),
    homeKwh,
    publicKwh,
    publicCharges,
    homeCharges,
  };
}

export function calcEv(
  input: EvInput,
  trips: Trip[],
  stops: Stop[],
  weekStart: number,
  days: number,
): EvResult {
  const ev = EVS[input.evKey] ?? EVS['n-one-e'];
  const gas = GASES[ev.rival] ?? Object.values(GASES)[0];
  const gasKmPerL = input.gasKmPerL && input.gasKmPerL > 0 ? input.gasKmPerL : gas.kmPerL;
  const homeCharge = input.homeEnv !== 'none';
  const start = jstMidnight(weekStart);
  const factor = seasonFactorFor(weekStart);

  const normal = simulate(ev, trips, stops, homeCharge, factor, start, days, 'normal');
  const winter = simulate(ev, trips, stops, homeCharge, PARAMS.winterFactor, start, days, 'winter');

  const weekKm = trips.filter((t) => t.kind === 'car').reduce((s, t) => s + t.distanceKm, 0);
  // 走った分の電気を、家と外のどちらで入れたか（家の充電が足りない分は外）
  const used = normal.usedKwh;
  const fromPublic = homeCharge ? Math.min(used, normal.publicKwh) : used;
  const fromHome = used - fromPublic;
  const evHome = fromHome * input.homePrice;
  const evPublic = fromPublic * input.publicPrice;
  const gasLiters = weekKm / (gasKmPerL * PARAMS.gasRealFactor);
  const gasCost = gasLiters * PARAMS.gasPrice;

  // 外で充電する回数（週あたり）。家で充電できない人は、使った電気をすべて外で入れる
  // （1回で 安心ライン20% → 80% まで入れるとして、ならした回数）
  const perCharge = (ev.batteryKwh * (PUBLIC_TARGET_SOC - SAFE_SOC)) / 100;
  const publicPerWeek = {
    normal: homeCharge ? normal.publicCharges : normal.usedKwh / perCharge,
    winter: homeCharge ? winter.publicCharges : winter.usedKwh / perCharge,
  };

  let verdict: EvResult['verdict'];
  if (!homeCharge) {
    verdict = {
      level: 'public',
      text: `家で充電できないので、外での充電が週に約${formatTimes(publicPerWeek.normal)}必要です`,
    };
  } else if (normal.publicCharges > 0) {
    verdict = {
      level: 'public',
      text: `外での充電が週に${normal.publicCharges}回ほど必要です`,
    };
  } else if (winter.publicCharges > 0 || winter.minSoc < SAFE_SOC) {
    verdict = {
      level: 'winter',
      text: 'ふだんは充電の不安なし。冬は外での充電が必要になることがあります',
    };
  } else {
    verdict = { level: 'ok', text: '充電スポットの不安なし（冬も安心）' };
  }

  return {
    ev,
    evKey: input.evKey,
    gasName: gas.name,
    gasKmPerL,
    weekKm,
    yearKm: weekKm * 52,
    normal,
    winter,
    cost: { gas: gasCost, ev: evHome + evPublic, evHome, evPublic, gasLiters },
    publicPerWeek,
    verdict,
  };
}

/** 0.7 → 「0.7回」、2 → 「2回」 */
export function formatTimes(n: number): string {
  return n >= 10 || Number.isInteger(n) ? `${Math.round(n)}回` : `${n.toFixed(1)}回`;
}

/** 1週間 → 1か月（30日） */
export const perMonth = (week: number) => (week * 30) / 7;
