import { Colors } from '@/constants/theme';

import type { MapMarker } from './route-map.types';

/** 地図の見た目（ブラウザ版とスマホ版で同じにする） */

/** 地理院タイル（淡色地図）。出典の表示が必要 */
export const TILE_URL = 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png';
export const ATTRIBUTION =
  '<a href="https://maps.gsi.go.jp/development/ichiran.html" target="_blank" rel="noopener">地理院タイル</a>';
export const CENTER: [number, number] = [36.5658, 139.8836]; // 宇都宮市

/** 印。種類は色だけでなく文字でも示す（急・普・H・家） */
export const PIN: Record<MapMarker['kind'], { text: string; bg: string; fg: string; border: string; size: number }> = {
  home: { text: '家', bg: Colors.navy, fg: '#FFFFFF', border: Colors.navy, size: 30 },
  quick: { text: '急', bg: Colors.ev, fg: '#FFFFFF', border: Colors.ev, size: 24 },
  normal: { text: '普', bg: '#FFFFFF', fg: Colors.ev, border: Colors.ev, size: 24 },
  // Honda Charge の印だけ赤
  honda: { text: 'H', bg: '#FFFFFF', fg: Colors.hondaCharge, border: Colors.hondaCharge, size: 26 },
  stop: { text: '●', bg: '#FFFFFF', fg: Colors.navy, border: Colors.navy, size: 18 },
};

export const LINE = {
  car: { color: Colors.ev, weight: 4, dashArray: undefined as string | undefined },
  transit: { color: Colors.gas, weight: 3, dashArray: '6 6' as string | undefined },
};

export const pinHtml = (kind: MapMarker['kind']) => {
  const pin = PIN[kind];
  return `<div style="width:${pin.size}px;height:${pin.size}px;border-radius:50%;background:${pin.bg};color:${pin.fg};border:2px solid ${pin.border};display:flex;align-items:center;justify-content:center;font:700 13px/1 sans-serif;box-sizing:border-box">${pin.text}</div>`;
};
