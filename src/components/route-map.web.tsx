import 'leaflet/dist/leaflet.css';

import type * as Leaflet from 'leaflet';
import { useEffect, useRef, useState } from 'react';

import { Colors, Radius } from '@/constants/theme';

import type { MapMarker, MapPath, RouteMapProps } from './route-map.types';

export type { MapMarker, MapPath } from './route-map.types';

/** 地理院タイル（淡色地図）。出典の表示が必要 */
const TILE_URL = 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>';
const CENTER: [number, number] = [36.5658, 139.8836]; // 宇都宮市

/** 印。種類は色だけでなく文字でも示す（急・普・H・家） */
const PIN: Record<MapMarker['kind'], { text: string; bg: string; fg: string; border: string; size: number }> = {
  home: { text: '家', bg: Colors.navy, fg: '#FFFFFF', border: Colors.navy, size: 30 },
  quick: { text: '急', bg: Colors.ev, fg: '#FFFFFF', border: Colors.ev, size: 24 },
  normal: { text: '普', bg: '#FFFFFF', fg: Colors.ev, border: Colors.ev, size: 24 },
  // Honda Charge の印だけ赤
  honda: { text: 'H', bg: '#FFFFFF', fg: Colors.hondaCharge, border: Colors.hondaCharge, size: 26 },
  stop: { text: '●', bg: '#FFFFFF', fg: Colors.navy, border: Colors.navy, size: 18 },
};

type Refs = {
  L: typeof Leaflet;
  map: Leaflet.Map;
  layer: Leaflet.LayerGroup;
};

/** 道と印を描き直す。fitKey が前と違えば、表示の範囲も合わせる */
function drawLayers(
  r: Refs,
  paths: MapPath[],
  markers: MapMarker[],
  fitKey: string | undefined,
  lastFit: { current: string | undefined },
) {
  const { L, map: m, layer: g } = r;
  g.clearLayers();
  const bounds: [number, number][] = [];
  for (const p of paths) {
    const latlngs = p.points.map((q) => [q.lat, q.lng] as [number, number]);
    bounds.push(...latlngs);
    L.polyline(latlngs, {
      color: p.kind === 'car' ? Colors.ev : Colors.gas,
      weight: p.kind === 'car' ? 4 : 3,
      opacity: 0.85,
      dashArray: p.kind === 'car' ? undefined : '6 6',
    }).addTo(g);
  }
  for (const mk of markers) {
    const pin = PIN[mk.kind];
    const icon = L.divIcon({
      className: '',
      iconSize: [pin.size, pin.size],
      iconAnchor: [pin.size / 2, pin.size / 2],
      html: `<div style="width:${pin.size}px;height:${pin.size}px;border-radius:50%;background:${pin.bg};color:${pin.fg};border:2px solid ${pin.border};display:flex;align-items:center;justify-content:center;font:700 13px/1 sans-serif;box-sizing:border-box">${pin.text}</div>`,
    });
    const popup = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = mk.title;
    popup.appendChild(title);
    if (mk.detail) {
      const d = document.createElement('div');
      d.textContent = mk.detail;
      d.style.marginTop = '4px';
      popup.appendChild(d);
    }
    L.marker([mk.lat, mk.lng], { icon, title: mk.title, keyboard: true }).bindPopup(popup).addTo(g);
    if (mk.kind === 'home' || mk.kind === 'stop' || paths.length === 0) bounds.push([mk.lat, mk.lng]);
  }
  if (lastFit.current !== fitKey && bounds.length) {
    lastFit.current = fitKey;
    if (bounds.length === 1) m.setView(bounds[0], 14);
    else m.fitBounds(L.latLngBounds(bounds), { padding: [24, 24], maxZoom: 15 });
  }
}

/** 地図（ブラウザ）：Leaflet ＋ 地理院タイル */
export function RouteMap({ paths = [], markers = [], height = 260, fitKey, label }: RouteMapProps) {
  const el = useRef<HTMLDivElement | null>(null);
  const [refs, setRefs] = useState<Refs | null>(null);
  const lastFit = useRef<string | undefined>(undefined);

  // 地図を作る（ブラウザでだけ。Leaflet はサーバーで読み込めない）
  useEffect(() => {
    let cancelled = false;
    let made: Leaflet.Map | null = null;
    void import('leaflet').then((mod) => {
      const L = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      if (cancelled || !el.current) return;
      made = L.map(el.current, { center: CENTER, zoom: 12, scrollWheelZoom: false });
      L.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 18, minZoom: 5 }).addTo(made);
      setRefs({ L, map: made, layer: L.layerGroup().addTo(made) });
    });
    return () => {
      cancelled = true;
      made?.remove();
    };
  }, []);

  // 道と印を描き直す
  useEffect(() => {
    if (refs) drawLayers(refs, paths, markers, fitKey, lastFit);
  }, [refs, paths, markers, fitKey]);

  return (
    <div
      ref={el}
      role="region"
      aria-label={label}
      style={{ height, width: '100%', borderRadius: Radius.md, overflow: 'hidden', background: Colors.bg, zIndex: 0 }}
    />
  );
}
