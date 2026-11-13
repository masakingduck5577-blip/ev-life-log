import type { LocationPoint } from '@/location/source';

import type { Store } from './store';

/**
 * Web 用の保存：メモリに持ち、localStorage にも書く（ページを読み込み直しても続きから見られる）。
 * localStorage が使えないとき（プライベートウィンドウなど）はメモリだけで動く。
 */

const PREFIX = 'evlifelog:';
const POINTS_KEY = (dataset: string) => `${PREFIX}points:${dataset}`;
const SETTING_KEY = (key: string) => `${PREFIX}setting:${key}`;

function storage(): globalThis.Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function readJson<T>(key: string): T | null {
  try {
    const raw = storage()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // 容量不足など。メモリには残っているので、そのまま続ける
  }
}

function remove(key: string) {
  try {
    storage()?.removeItem(key);
  } catch {
    // 何もしない
  }
}

const points = new Map<string, LocationPoint[]>();
const settings = new Map<string, unknown>();

function pointsOf(dataset: string): LocationPoint[] {
  let list = points.get(dataset);
  if (!list) {
    list = readJson<LocationPoint[]>(POINTS_KEY(dataset)) ?? [];
    points.set(dataset, list);
  }
  return list;
}

// 点の書き込みは少しまとめてから localStorage へ
const pendingWrites = new Set<string>();
let writeTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleWrite(dataset: string) {
  pendingWrites.add(dataset);
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    writeTimer = null;
    pendingWrites.forEach((d) => writeJson(POINTS_KEY(d), pointsOf(d)));
    pendingWrites.clear();
  }, 500);
}

const store: Store = {
  async addPoints(dataset, added) {
    if (added.length === 0) return;
    const list = pointsOf(dataset);
    list.push(...added);
    list.sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
    scheduleWrite(dataset);
  },
  async getPoints(dataset) {
    return [...pointsOf(dataset)];
  },
  async countPoints(dataset) {
    return pointsOf(dataset).length;
  },
  async getLastPoint(dataset) {
    const list = pointsOf(dataset);
    return list.length ? list[list.length - 1] : null;
  },
  async clearPoints(dataset) {
    points.set(dataset, []);
    pendingWrites.delete(dataset);
    remove(POINTS_KEY(dataset));
  },
  async getSetting<T>(key: string) {
    if (!settings.has(key)) settings.set(key, readJson<T>(SETTING_KEY(key)));
    return (settings.get(key) as T | null) ?? null;
  },
  async setSetting(key, value) {
    settings.set(key, value);
    writeJson(SETTING_KEY(key), value);
  },
  async removeSetting(key) {
    settings.set(key, null);
    remove(SETTING_KEY(key));
  },
};

export function getStore(): Store {
  return store;
}
