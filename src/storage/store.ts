/**
 * 保存（共通の型）。
 * - store.native.ts：スマホの中の SQLite（expo-sqlite）
 * - store.web.ts：メモリ＋localStorage
 *
 * 位置の点は「データの組（dataset）」ごとに分けて保存する。
 * 本当の記録（'device'）とテストデータ（'test-A' など）が混ざらないようにするため。
 */

import type { LocationPoint } from '@/location/source';

export type Store = {
  addPoints(dataset: string, points: LocationPoint[]): Promise<void>;
  /** 時刻の順に返す */
  getPoints(dataset: string): Promise<LocationPoint[]>;
  countPoints(dataset: string): Promise<number>;
  /** 最後の点（なければ null） */
  getLastPoint(dataset: string): Promise<LocationPoint | null>;
  clearPoints(dataset: string): Promise<void>;

  getSetting<T>(key: string): Promise<T | null>;
  setSetting<T>(key: string, value: T): Promise<void>;
  removeSetting(key: string): Promise<void>;
};

/** 保存先を開く（何度呼んでも同じものを返す） */
export declare function getStore(): Store;
