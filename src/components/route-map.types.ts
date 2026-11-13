import type { LatLng } from '@/analysis/geo';

export type MapPath = { points: LatLng[]; kind: 'car' | 'transit' };
export type MapMarker = LatLng & {
  id: string;
  /** home：家／quick：急速／normal：普通／honda：Honda Charge／stop：止まった場所 */
  kind: 'home' | 'quick' | 'normal' | 'honda' | 'stop';
  title: string;
  detail?: string;
};

export type RouteMapProps = {
  paths?: MapPath[];
  markers?: MapMarker[];
  height?: number;
  /** この値が変わったら、表示の範囲を合わせ直す */
  fitKey?: string;
  /** 地図の内容の説明（読み上げ用） */
  label: string;
};
