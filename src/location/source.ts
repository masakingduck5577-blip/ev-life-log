/**
 * 位置の取得元（共通の型）。
 *
 * 中身は環境ごとのファイルに分かれる（Metro がファイル名で選ぶ）：
 * - source.native.ts：expo-location でスマホの位置を取る（バックグラウンドも）
 * - source.web.ts：ブラウザでは本当の位置を使わず、テストデータを流す
 *
 * このファイルは型と、関数の形だけを決める（TypeScript はこのファイルを見る）。
 * 中身のファイルからは `import type` でだけ読み込むこと。
 */

/** 移動の種類（iPhone の CoreMotion の判定の代わり） */
export type Activity = 'automotive' | 'walking' | 'stationary' | 'unknown';

/** 位置の点。iPhone で取るものとテストデータで同じ形にする。 */
export type LocationPoint = {
  /** 時刻（ISO 8601、例：2026-11-16T07:50:05+09:00） */
  t: string;
  lat: number;
  lng: number;
  /** 速さ（m/s）。分からないときは -1 */
  speed: number;
  /** 位置の誤差（m） */
  accuracy: number;
  activity: Activity;
};

export type PointsListener = (points: LocationPoint[]) => void;

export type LocationSource = {
  /** device：スマホの位置／test：テストデータ */
  readonly kind: 'device' | 'test';
  start(): Promise<void>;
  stop(): Promise<void>;
  /** 新しい点を受け取る。戻り値を呼ぶと受け取りをやめる。 */
  subscribe(listener: PointsListener): () => void;
};

/** 許可の状態（「常に許可」が必要） */
export type LocationPermission = 'always' | 'whenInUse' | 'denied' | 'undetermined' | 'unavailable';

/** スマホの位置の取得元を作る。Web では作れない（null）。 */
export declare function createDeviceSource(): LocationSource | null;

/** 今の位置の許可の状態 */
export declare function getLocationPermission(): Promise<LocationPermission>;

/** 位置の許可を求める（「使用中のみ」→「常に」の順に聞く） */
export declare function requestLocationPermission(): Promise<LocationPermission>;
