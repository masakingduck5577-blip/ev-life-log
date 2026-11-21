/**
 * 栃木県内の線路・駅・高速道路を OpenStreetMap（Overpass API）から取り出し、
 * 線を間引いた軽い JSON にして assets/geo/ に入れる。
 *
 *   node scripts/fetch-osm-geo.mjs              … 取り出して assets/geo/ に書く
 *   node scripts/fetch-osm-geo.mjs --raw dir   … 取り出した元のデータも dir/ に保存する（中身を確かめるとき）
 *   node scripts/fetch-osm-geo.mjs --from dir  … 保存した元のデータから作り直す（サーバーに取りに行かない）
 *
 * データ：© OpenStreetMap contributors（ODbL）。assets/geo/ の JSON も ODbL で配る。
 * 取り出すもの
 *   - 線路：railway=rail・light_rail・tram（新幹線を含む）
 *   - 駅：railway=station・tram_stop・halt
 *   - 高速道路：highway=motorway
 *   - LRT・路面電車の線路のまわりの道路（道路の上を走る区間を見分けるためだけに使い、JSON には入れない）
 *
 * 道路の上を走る区間：OSM では宇都宮ライトレールが全線 railway=tram・最高速度40kmで、印からは見分けられない。
 * そこで、線路が道路の中心線から15m以内を通る部分を「道路の上」とする。
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'assets', 'geo');

/** 公開の Overpass サーバー（混んでいたら次を試す） */
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
];

const QUERY = `[out:json][timeout:240];
area["name"="栃木県"]["admin_level"="4"]->.a;
(
  way["railway"~"^(rail|light_rail|tram)$"](area.a);
  node["railway"~"^(station|tram_stop|halt)$"](area.a);
  way["highway"="motorway"](area.a);
);
out tags geom;`;

/** LRT・路面電車の線路から20m以内の道路 */
const ROAD_QUERY = `[out:json][timeout:240];
area["name"="栃木県"]["admin_level"="4"]->.a;
way["railway"="tram"](area.a)->.t;
way(around.t:20)["highway"~"^(trunk|primary|secondary|tertiary|unclassified|residential|trunk_link|primary_link|secondary_link|tertiary_link)$"];
out tags geom;`;

/** 線路が道路の中心線からこの距離以内なら「道路の上」（m）。片側2車線の道路の真ん中を走る線路を含む */
const ON_ROAD_M = 15;
/** 道路の上かどうかを見る間隔（m） */
const ROAD_STEP_M = 20;
/** これより短い「道路の上／外」の切りかわりは無視する（m）。交差点だけ道路と重なる、などを除く */
const MIN_PIECE_M = 150;

/** 線を間引く許し（m）。線路から30m以内かを見るので、これより十分小さくする */
const SIMPLIFY_M = 8;
/** 座標の桁（小数5桁 ＝ 約1m） */
const DIGITS = 5;

async function fetchOverpass(query) {
  let wait = 5000;
  for (let round = 0; round < 4; round++) {
    for (const url of ENDPOINTS) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ev-life-log-data-script' },
          body: new URLSearchParams({ data: query }),
        });
        const text = await res.text();
        if (res.ok && text.trimStart().startsWith('{')) {
          console.log(`取り出しました：${url}`);
          return JSON.parse(text);
        }
        console.log(`混んでいます（${res.status}）：${url}`);
      } catch (e) {
        console.log(`つながりません：${url}（${e.message}）`);
      }
    }
    console.log(`${wait / 1000}秒待って、やり直します`);
    await new Promise((r) => setTimeout(r, wait));
    wait *= 2;
  }
  throw new Error('Overpass API から取り出せませんでした。時間をおいて、もう一度試してください。');
}

/* ---------- 線を間引く（ダグラス・ポイカー法） ---------- */
const M_PER_DEG_LAT = 111320;
function toXY([lat, lng], lat0) {
  return [lng * M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180), lat * M_PER_DEG_LAT];
}
function segDist(p, a, b) {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const len = dx * dx + dy * dy;
  const t = len === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function simplify(coords, tol) {
  if (coords.length <= 2) return coords;
  const lat0 = coords[0][0];
  const xy = coords.map((c) => toXY(c, lat0));
  const keep = new Uint8Array(coords.length);
  keep[0] = keep[coords.length - 1] = 1;
  const stack = [[0, coords.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    let max = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = segDist(xy[i], xy[s], xy[e]);
      if (d > max) {
        max = d;
        idx = i;
      }
    }
    if (max > tol && idx > 0) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return coords.filter((_, i) => keep[i]);
}

const round = (v) => Number(v.toFixed(DIGITS));
const flat = (coords) => coords.flatMap(([lat, lng]) => [round(lat), round(lng)]);
const pairs = (c) => Array.from({ length: c.length / 2 }, (_, i) => [c[2 * i], c[2 * i + 1]]);

/* ---------- 道路の上を走る区間 ---------- */
function distToLine(p, line, lat0) {
  const pp = toXY(p, lat0);
  let min = Infinity;
  for (let i = 1; i < line.length; i++) min = Math.min(min, segDist(pp, toXY(line[i - 1], lat0), toXY(line[i], lat0)));
  return min;
}
function lengthM(coords) {
  let s = 0;
  for (let i = 1; i < coords.length; i++) {
    const a = toXY(coords[i - 1], coords[0][0]);
    const b = toXY(coords[i], coords[0][0]);
    s += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return s;
}
/** 線を ROAD_STEP_M ごとの点に細かくする */
function densify(coords) {
  const out = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    const [la, lo] = coords[i - 1];
    const [lb, lob] = coords[i];
    const n = Math.max(1, Math.ceil(lengthM([coords[i - 1], coords[i]]) / ROAD_STEP_M));
    for (let k = 1; k <= n; k++) out.push([la + ((lb - la) * k) / n, lo + ((lob - lo) * k) / n]);
  }
  return out;
}
/** 路面電車の線を「道路の上」と「専用の線路」の切れ目で分ける。戻り値：[座標の並び, 道路の上か] の並び */
function splitByRoad(coords, roads) {
  if (!roads.length) return [[coords, false]];
  const lat0 = coords[0][0];
  const pts = densify(coords);
  const near = (p) =>
    roads.some((r) => {
      const [minLat, minLng, maxLat, maxLng] = r.box;
      if (p[0] < minLat - 0.0003 || p[0] > maxLat + 0.0003 || p[1] < minLng - 0.0004 || p[1] > maxLng + 0.0004) return false;
      return distToLine(p, r.coords, lat0) <= ON_ROAD_M;
    });
  const flags = pts.map(near);
  // 短い切りかわりは、前の区間に合わせる
  const pieces = [];
  let start = 0;
  for (let i = 1; i <= pts.length; i++) {
    if (i === pts.length || flags[i] !== flags[start]) {
      pieces.push({ from: start, to: i - 1, on: flags[start] });
      start = i;
    }
  }
  for (let k = 0; k < pieces.length; k++) {
    const pc = pieces[k];
    if (pieces.length > 1 && lengthM(pts.slice(pc.from, pc.to + 1)) < MIN_PIECE_M) pc.on = (pieces[k - 1] ?? pieces[k + 1]).on;
  }
  const merged = [];
  for (const pc of pieces) {
    const last = merged[merged.length - 1];
    if (last && last.on === pc.on) last.to = pc.to;
    else merged.push({ ...pc });
  }
  return merged.map((pc) => [simplify(pts.slice(pc.from, pc.to + 1 + (pc.to + 1 < pts.length ? 1 : 0)), SIMPLIFY_M), pc.on]);
}

function build(raw, rawRoads) {
  const roads = (rawRoads?.elements ?? [])
    .filter((e) => e.type === 'way' && e.geometry)
    .map((e) => {
      const coords = e.geometry.map((g) => [g.lat, g.lon]);
      const lats = coords.map((c) => c[0]);
      const lngs = coords.map((c) => c[1]);
      return { coords, box: [Math.min(...lats), Math.min(...lngs), Math.max(...lats), Math.max(...lngs)] };
    });
  const rails = [];
  const motorways = [];
  const stations = [];
  for (const e of raw.elements) {
    const t = e.tags ?? {};
    if (e.type === 'node' && t.railway) {
      stations.push({ n: t.name ?? '', t: t.railway, p: [round(e.lat), round(e.lon)] });
    } else if (e.type === 'way' && e.geometry) {
      const full = e.geometry.map((g) => [g.lat, g.lon]);
      const coords = simplify(full, SIMPLIFY_M);
      if (t.railway) {
        // 車両基地の中の線（service=yard など）も、電車に乗ることはないので外す
        if (t.service === 'yard' || t.service === 'siding' || t.service === 'spur') continue;
        const hs = t.highspeed === 'yes' ? 1 : 0;
        const n = t.name ?? '';
        if (t.railway === 'tram' || t.railway === 'light_rail') {
          // 道路の上を走る区間と、専用の線路の区間に分ける
          for (const [piece, on] of splitByRoad(full, roads)) rails.push({ k: t.railway, hs, st: on ? 1 : 0, n, c: flat(piece) });
        } else {
          rails.push({ k: t.railway, hs, st: 0, n, c: flat(coords) });
        }
      } else if (t.highway === 'motorway') {
        motorways.push({ n: t.name ?? t.ref ?? '', c: flat(coords) });
      }
    }
  }
  return { rails, stations, motorways };
}

async function main() {
  const args = process.argv.slice(2);
  const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : null;
  const rawOut = args.includes('--raw') ? args[args.indexOf('--raw') + 1] : null;
  const raw = from ? JSON.parse(readFileSync(join(from, 'raw.json'), 'utf8')) : await fetchOverpass(QUERY);
  const rawRoads = from ? JSON.parse(readFileSync(join(from, 'roads.json'), 'utf8')) : await fetchOverpass(ROAD_QUERY);
  if (rawOut) {
    mkdirSync(rawOut, { recursive: true });
    writeFileSync(join(rawOut, 'raw.json'), JSON.stringify(raw));
    writeFileSync(join(rawOut, 'roads.json'), JSON.stringify(rawRoads));
  }

  const { rails, stations, motorways } = build(raw, rawRoads);
  const meta = {
    source: 'OpenStreetMap（Overpass API）',
    attribution: '© OpenStreetMap contributors',
    license: 'ODbL 1.0（https://opendatacommons.org/licenses/odbl/1-0/）',
    copyright: 'https://www.openstreetmap.org/copyright',
    area: '栃木県',
    fetchedAt: raw.osm3s?.timestamp_osm_base ?? new Date().toISOString(),
    simplifyM: SIMPLIFY_M,
  };
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, 'tochigi-rail.json'), JSON.stringify({ ...meta, rails, stations }));
  writeFileSync(join(OUT_DIR, 'tochigi-motorway.json'), JSON.stringify({ ...meta, motorways }));
  console.log(
    `線路 ${rails.length}本（新幹線 ${rails.filter((r) => r.hs).length}・道路の上 ${rails.filter((r) => r.st).length}本、${(
      rails.filter((r) => r.st).reduce((s, r) => s + lengthM(pairs(r.c)), 0) / 1000
    ).toFixed(1)}km）・駅 ${stations.length}・高速道路 ${motorways.length}本`,
  );
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
