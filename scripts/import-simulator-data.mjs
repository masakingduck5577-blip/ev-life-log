/**
 * Web 版シミュレーター（ev-life-simulator）のデータを取り込む。
 *
 *   node scripts/import-simulator-data.mjs [シミュレーターのフォルダ]
 *   （省略すると ~/dev/ev-life-simulator）
 *
 * 出力：src/data/simulator-data.json
 * - 車（EVS・GASES）、計算の値（app.js の S と同じ）、国と市町の補助金（確認日・出典つき）
 * - 充電スポット：公式の一覧（facilities_official.csv）＋ OpenStreetMap（chargers.csv）
 *
 * 計算の式と値はシミュレーターに合わせる。シミュレーター側が更新されたら、これを実行し直す。
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SIM = process.argv[2] ?? join(homedir(), 'dev', 'ev-life-simulator');
const read = (f) => readFileSync(join(SIM, f), 'utf8').replace(/^﻿/, '');

/* ---------- 車と国の補助金（cars.js・subsidy.js） ---------- */
const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(read('subsidy.js'), ctx);
const cars = vm.runInContext(read('cars.js') + '\n;({ EVS, GASES, SUBSIDY })', ctx);
const auto = ctx.window.SUBSIDY_AUTO ?? {};

const evs = {};
for (const [key, e] of Object.entries(cars.EVS)) {
  if (e.custom) continue;
  evs[key] = {
    name: e.name,
    category: e.cat,
    kei: !!e.kei,
    rival: e.rival,
    photo: e.photo,
    rangeKm: e.range,
    whPerKm: e.wh,
    batteryKwh: e.kwh,
    acKw: e.acKw,
    quickKw: e.qkw,
    price: e.price,
    verified: !!e.ok,
    subsidy: auto.amounts?.[key] ?? e.sub,
    subsidy2027: auto.amounts2027?.[key] ?? e.sub2027,
  };
}
const gases = {};
for (const [key, g] of Object.entries(cars.GASES)) {
  if (g.custom) continue;
  gases[key] = { name: g.name, category: g.cat, type: g.type, photo: g.photo, kmPerL: g.fe, price: g.price };
}
const national = {
  ...cars.SUBSIDY,
  ...Object.fromEntries(Object.entries(auto.subsidy ?? {}).filter(([, v]) => v != null && v !== '')),
  checkedAt: auto.checkedAt ?? null,
  sources: auto.sources ?? { page: cars.SUBSIDY.url },
};

/* ---------- 計算の値（app.js の S） ---------- */
const appJs = read('app.js');
const num = (key) => {
  const m = appJs.match(new RegExp(`[\\s,{]${key}:([\\d.]+)`));
  if (!m) throw new Error(`app.js に ${key} が見つかりません`);
  return Number(m[1]);
};
const params = {
  gasPrice: num('pGas'), // ガソリン代（円/L）
  homeKwhPrice: num('pHome'), // 家の電気代（円/kWh）
  publicKwhPrice: num('pPub'), // 外の充電（円/kWh）
  chargerInstall: num('charger'), // 充電器の設置費（円）
  summerFactor: num('cSum'), // 夏の電費の係数（走れる距離の割合）
  winterFactor: num('cWin'), // 冬
  gasRealFactor: num('rGas'), // カタログ燃費 → 実際の燃費
  evRealFactor: num('rEv'), // カタログ電費 → 実際の電費
  usablePercent: num('usable'), // 使える電池の割合（%）
  homeSharePercent: num('homeShare'),
};

/* ---------- 市町の補助金（local_subsidy.csv） ---------- */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (c !== '\r') cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const local = parseCsv(read('local_subsidy.csv')).map((r) => ({
  id: r.id,
  name: r.name,
  amount: Number(r.amount) || 0,
  amountKei: r.amount_kei ? Number(r.amount_kei) : null,
  status: r.status, // open：受付中 / soon：残りわずか / closed：終了 / none：なし / check：確認中
  until: r.until,
  note: r.note,
  url: r.url || null,
  checkedAt: r.checked,
}));

/* ---------- 充電スポット ---------- */
const official = parseCsv(read('facilities_official.csv')).map((r) => ({
  id: r.id,
  name: r.name,
  lat: Number(r.lat),
  lng: Number(r.lng),
  type: r.type === 'quick' ? 'quick' : 'normal',
  kw: r.kw ? Number(r.kw) : null,
  network: r.network || null,
  hours: r.hours || null,
  category: r.category || null,
  source: r.source,
  sourceUrl: r.sourceUrl || null,
  checkedAt: r.checkedAt,
}));
const osm = parseCsv(read('chargers.csv')).map((r) => ({
  id: r.id,
  name: r.name,
  lat: Number(r.lat),
  lng: Number(r.lng),
  type: r.type === '急速' ? 'quick' : 'normal',
  kw: r.kw ? Number(r.kw) : null,
  network: r.network || r.note || null,
  hours: r.hours || null,
  category: null,
  source: 'OpenStreetMap',
  sourceUrl: 'https://www.openstreetmap.org/copyright',
  checkedAt: r.updatedAt,
}));
// 同じ場所（50m以内）にある OSM のスポットは、公式の一覧と重ねない
const near = (a, b) => Math.abs(a.lat - b.lat) < 0.00045 && Math.abs(a.lng - b.lng) < 0.00055;
const skipped = [];
const chargers = [...official, ...osm.filter((o) => !official.some((f) => near(f, o)))].filter(
  (c) => {
    // 座標がない・日本の外（0,0 など）のスポットは地図に出せないので外す
    const ok = c.lat > 20 && c.lat < 46 && c.lng > 122 && c.lng < 154;
    if (!ok) skipped.push(`${c.name}（${c.source}）`);
    return ok;
  },
);
if (skipped.length) console.log('座標がないため外したスポット:', skipped.join('、'));

/* ---------- 書き出し ---------- */
let commit = null;
try {
  commit = execSync('git rev-parse --short HEAD', { cwd: SIM }).toString().trim();
} catch {
  // git がなくても続ける
}
const out = {
  source: { repo: 'https://github.com/masakingduck5577-blip/ev-life-simulator', commit },
  evs,
  gases,
  params,
  subsidy: { national, local },
  chargers,
};
writeFileSync(join(ROOT, 'src', 'data', 'simulator-data.json'), JSON.stringify(out, null, 1) + '\n');
console.log(
  `EV ${Object.keys(evs).length}・ガソリン車 ${Object.keys(gases).length}・市町 ${local.length}・充電スポット ${chargers.length}（公式 ${official.length}）・commit ${commit}`,
);
console.log('params', params);
