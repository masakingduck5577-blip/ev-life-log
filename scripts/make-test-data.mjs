/**
 * テストデータ（栃木県宇都宮市周辺の架空の1週間）を作る。
 *
 *   node scripts/make-test-data.mjs
 *
 * 出力：assets/test/scenario-a.json（点の列）
 * 点の形は iPhone で取るものと同じ：{ t, lat, lng, speed(m/s), accuracy(m), activity }
 * 完成した運転の一覧は入れない（運転の判定はアプリ側のコードで行う）。
 *
 * 決まった乱数（シード）を使うので、何度作っても同じデータになる。
 *
 * 注意
 * - 場所の名前はすべて架空。座標はおおよその位置で、道は手で決めた通過点を結んだだけ
 *   （実際の道路・線路に正確には沿わない。線路との重なりの判定を試すときは、OSM の線路と比べて直す）。
 * - 家の点は、田畑の多いあたりに置いている。人の家に重なっていないか、地図で確かめてから使う。
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- 乱数（シードつき） ---------- */
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rand = mulberry32(1);
const between = (a, b) => a + (b - a) * rand();
const gauss = () => {
  const u = 1 - rand();
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

/* ---------- 時刻（日本時間） ---------- */
const JST = 9 * 60 * 60 * 1000;
const MIN = 60 * 1000;
/** 2026-11-16（月）0:00 日本時間 */
const WEEK_START = Date.UTC(2026, 10, 16) - JST;
const at = (day, hh, mm, ss = 0) => WEEK_START + (day - 1) * 24 * 60 * MIN + (hh * 60 + mm) * MIN + ss * 1000;
const iso = (ms) => {
  const d = new Date(Math.round(ms / 1000) * 1000 + JST);
  return d.toISOString().replace(/\.\d{3}Z$/, '+09:00');
};

/* ---------- 地理 ---------- */
const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
function dist(a, b) {
  const dLat = rad(b[0] - a[0]);
  const dLng = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
/** 道（通過点の列）の上で、始まりから s メートルの位置 */
function makePath(points) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + dist(points[i - 1], points[i]));
  const length = cum[cum.length - 1];
  const pos = (s) => {
    s = Math.max(0, Math.min(length, s));
    let i = 1;
    while (i < cum.length - 1 && cum[i] < s) i++;
    const seg = cum[i] - cum[i - 1] || 1;
    const f = (s - cum[i - 1]) / seg;
    const a = points[i - 1];
    const b = points[i];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  };
  return { length, pos };
}
/** 誤差をのせる（accuracy の半分くらいの揺れ） */
function jitter(p, accuracy) {
  const m = (accuracy / 2) * gauss();
  const ang = rand() * 2 * Math.PI;
  const dLat = (m * Math.cos(ang)) / 111320;
  const dLng = (m * Math.sin(ang)) / (111320 * Math.cos(rad(p[0])));
  return [p[0] + dLat, p[1] + dLng];
}

/* ---------- 架空の場所（名前はすべて架空） ---------- */
const PLACES = {
  home: { name: 'みどり台の家', at: [36.5902, 139.9848] },
  office: { name: '駅東口のオフィス', at: [36.5586, 139.9046] },
  super: { name: 'ひばりスーパー', at: [36.5668, 139.9565] },
  mall: { name: '東部ショッピングモール', at: [36.553, 139.9302] },
  busHome: { name: 'みどり台バス停', at: [36.5868, 139.9822] },
  busStation: { name: '駅東口バス停', at: [36.5596, 139.9012] },
  stationA: { name: '中央駅（JR宇都宮線）', at: [36.559, 139.8984] },
  stationB: { name: '南の駅（JR宇都宮線）', at: [36.4956, 139.874] },
  cafe: { name: '南のカフェ', at: [36.4942, 139.8762] },
  nikko: { name: '日光の観光駐車場', at: [36.748, 139.602] },
  // シナリオE：実在の公開の充電スポット（Web版シミュレーターの公式一覧にあるもの）
  charger: { name: 'ENEOS アニマート柳田SS（急速）', at: [36.569679, 139.961594] },
};

// 道（通過点）。おおよその位置
const ROAD_HOME_TO_MAIN = [PLACES.home.at, [36.5868, 139.9822], [36.5795, 139.9785], [36.5702, 139.9702], [36.5662, 139.9602]];
const ROAD_MAIN_TO_OFFICE = [[36.5662, 139.9602], [36.5641, 139.9451], [36.5622, 139.9301], [36.5606, 139.9152], [36.5593, 139.9062], PLACES.office.at];
const ROAD_HOME_TO_OFFICE = [...ROAD_HOME_TO_MAIN, ...ROAD_MAIN_TO_OFFICE.slice(1)];
const ROAD_OFFICE_TO_SUPER = [...[...ROAD_MAIN_TO_OFFICE].reverse(), PLACES.super.at];
const ROAD_SUPER_TO_HOME = [PLACES.super.at, [36.5662, 139.9602], ...[...ROAD_HOME_TO_MAIN].reverse().slice(1)];
const ROAD_HOME_TO_MALL = [...ROAD_HOME_TO_MAIN, [36.5641, 139.9451], [36.5575, 139.9365], PLACES.mall.at];
const ROAD_HOME_TO_SUPER = [...ROAD_HOME_TO_MAIN, PLACES.super.at];
const BUS_ROUTE = [PLACES.busHome.at, [36.5795, 139.9785], [36.5702, 139.9702], [36.5662, 139.9602], [36.5641, 139.9451], [36.5622, 139.9301], [36.5606, 139.9152], [36.5598, 139.9062], PLACES.busStation.at];
// JR宇都宮線（中央駅 → 南の駅）。線路に正確には沿わない
const RAIL = [PLACES.stationA.at, [36.5395, 139.892], [36.5198, 139.8852], [36.5052, 139.8795], PLACES.stationB.at];
const rev = (p) => [...p].reverse();
const ROAD_OFFICE_TO_CHARGER = [...rev(ROAD_MAIN_TO_OFFICE), [36.5675, 139.961], PLACES.charger.at];
const ROAD_CHARGER_TO_HOME = [PLACES.charger.at, [36.5702, 139.9702], [36.5795, 139.9785], [36.5868, 139.9822], PLACES.home.at];
const ROAD_HOME_TO_PICKUP = [...ROAD_HOME_TO_MAIN, ...ROAD_MAIN_TO_OFFICE.slice(1, -1), PLACES.busStation.at];
// 日光へ：市の中心を通って北西へ。宇都宮IC〜日光IC は自動車専用道路（おおよその位置）
const ROAD_HOME_TO_CITY = [...ROAD_HOME_TO_MAIN, [36.5641, 139.9451], [36.5622, 139.9301], [36.5606, 139.9152], [36.56, 139.9], [36.564, 139.88], [36.58, 139.865], [36.609, 139.835]];
const ROAD_CITY_TO_NIKKO = [[36.609, 139.835], [36.65, 139.79], [36.69, 139.74], [36.715, 139.69], [36.735, 139.645], PLACES.nikko.at];

/* ---------- 点を作る ---------- */
const out = [];
const push = (ms, p, speed, accuracy, activity) => {
  const [lat, lng] = jitter(p, accuracy);
  out.push({
    t: iso(ms),
    lat: +lat.toFixed(6),
    lng: +lng.toFixed(6),
    speed: +Math.max(0, speed).toFixed(1),
    accuracy: Math.round(accuracy),
    activity,
  });
};

const MODES = {
  car: { cruise: [11, 16], accel: 1.5, brake: 2, stopEvery: 650, stopProb: 0.4, stopWait: [20, 70], every: 5, everyStopped: 15, acc: [5, 10], activity: 'automotive' },
  bus: { cruise: [9, 12], accel: 1, brake: 1.2, stopEvery: 450, stopProb: 0.85, stopWait: [15, 45], every: 5, everyStopped: 15, acc: [6, 12], activity: 'automotive' },
  carFast: { cruise: [20, 23], accel: 1.2, brake: 2, stopEvery: 4000, stopProb: 0.15, stopWait: [20, 60], every: 5, everyStopped: 15, acc: [5, 10], activity: 'automotive' },
  train: { cruise: [22, 27], accel: 0.7, brake: 0.8, stopEvery: Infinity, stopProb: 0, stopWait: [0, 0], every: 5, everyStopped: 15, acc: [8, 20], activity: 'automotive' },
};

/** 乗り物で道を進む。着いた時刻を返す */
function ride(mode, path, startMs) {
  const m = MODES[mode];
  const p = makePath(path);
  // 止まる場所（信号・バス停）と終点
  const stops = [];
  for (let s = m.stopEvery; s < p.length - 100; s += m.stopEvery * between(0.7, 1.3)) {
    if (rand() < m.stopProb) stops.push(s);
  }
  stops.push(p.length);
  const cruise = between(...m.cruise);
  let s = 0;
  let v = 0;
  let t = startMs;
  let lastOut = -Infinity;
  let stopIdx = 0;
  while (true) {
    const next = stops[stopIdx];
    const d = next - s;
    if (d <= 1 && v < 0.6) {
      // 止まった
      if (stopIdx === stops.length - 1) break;
      const wait = between(...m.stopWait);
      for (let w = 0; w < wait; w += m.everyStopped) push(t + w * 1000, p.pos(s), 0, between(...m.acc), m.activity);
      t += wait * 1000;
      lastOut = t;
      stopIdx++;
      v = 0;
      continue;
    }
    const target = Math.min(cruise * between(0.9, 1.05), Math.sqrt(2 * m.brake * Math.max(0, d - 1)));
    v = v < target ? Math.min(target, v + m.accel) : Math.max(target, v - m.brake);
    v = Math.max(v, 0.5);
    s = Math.min(next, s + v);
    t += 1000;
    if (t - lastOut >= m.every * 1000) {
      push(t, p.pos(s), v, between(...m.acc), m.activity);
      lastOut = t;
    }
  }
  return t;
}

/** 歩く。着いた時刻を返す */
function walk(path, startMs) {
  const p = makePath(path);
  const speed = between(1.1, 1.5);
  const dur = p.length / speed;
  for (let x = 0; x <= dur; x += 10) push(startMs + x * 1000, p.pos(x * speed), speed * between(0.85, 1.15), between(8, 16), 'walking');
  return startMs + dur * 1000;
}

/** 止まっている（建物の中など）。終わりの時刻を返す。夜（23時〜6時）は点を出さない */
function stay(place, fromMs, toMs, indoor = true) {
  for (let t = fromMs; t < toMs; t += 10 * MIN) {
    const hour = new Date(t + JST).getUTCHours();
    if (hour >= 23 || hour < 6) continue;
    push(t, place, 0, indoor ? between(20, 50) : between(8, 15), 'stationary');
  }
  return toMs;
}

/** 少し歩く（駐車場から建物まで など） */
const near = (p, dLat, dLng) => [p[0] + dLat, p[1] + dLng];
const shortWalk = (from, to, startMs) => walk([from, to], startMs);

/* ---------- シナリオの部品 ---------- */
const H = PLACES.home.at;
const O = PLACES.office.at;
const S = PLACES.super.at;
const DESK = near(O, 0.0006, -0.0004);
const SUPER_IN = near(S, 0.0004, 0.0003);

/** 朝：車で通勤 */
function morningByCar(day, t) {
  t = stay(H, t, at(day, 7, 40 + Math.round(between(0, 10))));
  t = ride('car', ROAD_HOME_TO_OFFICE, t);
  return shortWalk(O, DESK, t);
}
/** 昼：歩いて外へ */
function lunchWalk(day, t) {
  t = stay(DESK, t, at(day, 12, 5));
  t = walk([DESK, near(O, 0.0018, -0.0021), near(O, 0.0025, -0.0035)], t);
  t = stay(near(O, 0.0025, -0.0035), t, t + between(30, 40) * MIN);
  return walk([near(O, 0.0025, -0.0035), near(O, 0.0018, -0.0021), DESK], t);
}
/** 夕方：車で帰る。寄り道（スーパー・充電スポット）を選べる */
function eveningByCar(day, t, via = null) {
  t = stay(DESK, t, at(day, 17, 35 + Math.round(between(0, 20))));
  t = shortWalk(DESK, O, t);
  if (via === 'super') {
    t = ride('car', ROAD_OFFICE_TO_SUPER, t);
    t = shortWalk(S, SUPER_IN, t);
    t = stay(SUPER_IN, t, t + between(18, 28) * MIN);
    t = shortWalk(SUPER_IN, S, t);
    return ride('car', ROAD_SUPER_TO_HOME, t);
  }
  if (via === 'charger') {
    // 充電スポットで20〜25分（車の中で待つ）
    t = ride('car', ROAD_OFFICE_TO_CHARGER, t);
    t = stay(PLACES.charger.at, t, t + between(20, 25) * MIN, false);
    return ride('car', ROAD_CHARGER_TO_HOME, t);
  }
  return ride('car', rev(ROAD_HOME_TO_OFFICE), t);
}
/** 夕方：駅へお迎え（車の中で10〜20分待つ） */
function pickup(day, t) {
  t = stay(H, t, at(day, 18, 40 + Math.round(between(0, 15))));
  t = ride('car', ROAD_HOME_TO_PICKUP, t);
  t = stay(PLACES.busStation.at, t, t + between(10, 20) * MIN, false);
  return ride('car', rev(ROAD_HOME_TO_PICKUP), t);
}
/** バスで通勤（行き・帰り） */
function busCommute(day, t) {
  t = stay(H, t, at(day, 7, 25));
  t = walk([H, PLACES.busHome.at], t);
  t = stay(PLACES.busHome.at, t, t + between(3, 6) * MIN, false);
  t = ride('bus', BUS_ROUTE, t);
  t = walk([PLACES.busStation.at, O, DESK], t);
  t = stay(DESK, t, at(day, 17, 50));
  t = walk([DESK, O, PLACES.busStation.at], t);
  t = stay(PLACES.busStation.at, t, t + between(4, 9) * MIN, false);
  t = ride('bus', rev(BUS_ROUTE), t);
  return walk([PLACES.busHome.at, H], t);
}
/** バスと電車で南の駅のカフェへ */
function busAndTrain(day, t) {
  t = stay(H, t, at(day, 9, 50));
  t = walk([H, PLACES.busHome.at], t);
  t = stay(PLACES.busHome.at, t, t + between(3, 6) * MIN, false);
  t = ride('bus', BUS_ROUTE, t);
  t = walk([PLACES.busStation.at, [36.5594, 139.8998], PLACES.stationA.at], t);
  t = stay(PLACES.stationA.at, t, t + between(6, 9) * MIN);
  t = ride('train', RAIL, t);
  t = walk([PLACES.stationB.at, PLACES.cafe.at], t);
  t = stay(PLACES.cafe.at, t, at(day, 14, 30));
  t = walk([PLACES.cafe.at, PLACES.stationB.at], t);
  t = stay(PLACES.stationB.at, t, t + between(5, 10) * MIN);
  t = ride('train', rev(RAIL), t);
  t = walk([PLACES.stationA.at, [36.5594, 139.8998], PLACES.busStation.at], t);
  t = stay(PLACES.busStation.at, t, t + between(5, 12) * MIN, false);
  t = ride('bus', rev(BUS_ROUTE), t);
  return walk([PLACES.busHome.at, H], t);
}
/** 日曜：車でショッピングモール、夕方にスーパー */
function sundayShopping(day, t) {
  const M = PLACES.mall.at;
  const MALL_IN = near(M, 0.0007, 0.0005);
  t = stay(H, t, at(day, 10, 30));
  t = ride('car', ROAD_HOME_TO_MALL, t);
  t = shortWalk(M, MALL_IN, t);
  t = stay(MALL_IN, t, t + between(80, 100) * MIN);
  t = shortWalk(MALL_IN, M, t);
  t = ride('car', rev(ROAD_HOME_TO_MALL), t);
  t = stay(H, t, at(day, 16, 0));
  t = ride('car', ROAD_HOME_TO_SUPER, t);
  t = shortWalk(S, SUPER_IN, t);
  t = stay(SUPER_IN, t, t + between(15, 25) * MIN);
  t = shortWalk(SUPER_IN, S, t);
  return ride('car', rev(ROAD_HOME_TO_SUPER), t);
}
/** 車で日光へ遠出（片道約50km。一部は自動車専用道路） */
function nikkoTrip(day, t) {
  const P = PLACES.nikko.at;
  const IN = near(P, 0.0012, 0.0009);
  t = stay(H, t, at(day, 8, 30));
  t = ride('car', ROAD_HOME_TO_CITY, t);
  t = ride('carFast', ROAD_CITY_TO_NIKKO, t);
  t = walk([P, IN], t);
  t = stay(IN, t, t + between(170, 200) * MIN, false);
  t = walk([IN, P], t);
  t = ride('carFast', rev(ROAD_CITY_TO_NIKKO), t);
  return ride('car', rev(ROAD_HOME_TO_CITY), t);
}
const begin = (seed) => {
  rand = mulberry32(seed);
  out.length = 0;
  return WEEK_START;
};
const finish = (t) => {
  stay(H, t, at(8, 0, 0));
  return [...out];
};

/* ---------- シナリオA：通勤＋買い物・家で充電できる（Bも同じ点を使う） ---------- */
function scenarioA() {
  let t = begin(20261116);
  for (let day = 1; day <= 5; day++) {
    t = morningByCar(day, t);
    if (day % 2 === 1) t = lunchWalk(day, t);
    t = eveningByCar(day, t, day === 2 || day === 4 ? 'super' : null);
  }
  t = busAndTrain(6, t);
  t = sundayShopping(7, t);
  return finish(t);
}

/* ---------- シナリオC：平日は通勤、土曜に日光へ遠出、日曜に電車 ---------- */
function scenarioC() {
  let t = begin(20261117);
  for (let day = 1; day <= 5; day++) {
    t = morningByCar(day, t);
    if (day % 2 === 1) t = lunchWalk(day, t);
    t = eveningByCar(day, t, day === 3 ? 'super' : null);
  }
  t = nikkoTrip(6, t);
  t = busAndTrain(7, t);
  return finish(t);
}

/* ---------- シナリオD：お迎えが多い（週4回、駅で10〜20分待つ）。水曜はバスで通勤 ---------- */
function scenarioD() {
  let t = begin(20261118);
  for (let day = 1; day <= 5; day++) {
    if (day === 3) {
      t = busCommute(day, t);
    } else {
      t = morningByCar(day, t);
      t = eveningByCar(day, t, day === 2 ? 'super' : null);
    }
    if (day !== 4) t = pickup(day, t);
  }
  t = pickup(6, t);
  t = sundayShopping(7, t);
  return finish(t);
}

/* ---------- シナリオE：EVに乗っている人（金曜の帰りに充電スポットで急速充電）。土曜は電車 ---------- */
function scenarioE() {
  let t = begin(20261119);
  for (let day = 1; day <= 5; day++) {
    t = morningByCar(day, t);
    if (day % 2 === 1) t = lunchWalk(day, t);
    t = eveningByCar(day, t, day === 5 ? 'charger' : day === 2 || day === 4 ? 'super' : null);
  }
  t = busAndTrain(6, t);
  t = sundayShopping(7, t);
  return finish(t);
}

/* ---------- 書き出し ---------- */
function write(file, points) {
  const path = join(ROOT, 'assets', 'test', file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, '[\n' + points.map((p) => JSON.stringify(p)).join(',\n') + '\n]\n');
  const byAct = points.reduce((a, p) => ((a[p.activity] = (a[p.activity] || 0) + 1), a), {});
  console.log(`${file}: ${points.length} 点`, byAct, `${points[0].t} 〜 ${points[points.length - 1].t}`);
}

write('scenario-a.json', scenarioA());
write('scenario-c.json', scenarioC());
write('scenario-d.json', scenarioD());
write('scenario-e.json', scenarioE());
