import * as SQLite from 'expo-sqlite';

import type { Activity, LocationPoint } from '@/location/source';

import type { Store } from './store';

type PointRow = {
  t: string;
  lat: number;
  lng: number;
  speed: number;
  accuracy: number;
  activity: string;
};

const SCHEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS points (
  dataset TEXT NOT NULL,
  ms INTEGER NOT NULL,
  t TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  speed REAL NOT NULL,
  accuracy REAL NOT NULL,
  activity TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS points_dataset_ms ON points (dataset, ms);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const d = await SQLite.openDatabaseAsync('evlifelog.db');
      await d.execAsync(SCHEMA);
      return d;
    })();
  }
  return dbPromise;
}

const toPoint = (r: PointRow): LocationPoint => ({
  t: r.t,
  lat: r.lat,
  lng: r.lng,
  speed: r.speed,
  accuracy: r.accuracy,
  activity: r.activity as Activity,
});

const SELECT = 'SELECT t, lat, lng, speed, accuracy, activity FROM points';

const store: Store = {
  async addPoints(dataset, points) {
    if (points.length === 0) return;
    const d = await db();
    await d.withExclusiveTransactionAsync(async (txn) => {
      const stmt = await txn.prepareAsync(
        'INSERT INTO points (dataset, ms, t, lat, lng, speed, accuracy, activity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      );
      try {
        for (const p of points) {
          await stmt.executeAsync(
            dataset,
            Date.parse(p.t),
            p.t,
            p.lat,
            p.lng,
            p.speed,
            p.accuracy,
            p.activity,
          );
        }
      } finally {
        await stmt.finalizeAsync();
      }
    });
  },
  async getPoints(dataset) {
    const d = await db();
    const rows = await d.getAllAsync<PointRow>(`${SELECT} WHERE dataset = ? ORDER BY ms`, dataset);
    return rows.map(toPoint);
  },
  async countPoints(dataset) {
    const d = await db();
    const row = await d.getFirstAsync<{ n: number }>(
      'SELECT COUNT(*) AS n FROM points WHERE dataset = ?',
      dataset,
    );
    return row?.n ?? 0;
  },
  async getLastPoint(dataset) {
    const d = await db();
    const row = await d.getFirstAsync<PointRow>(
      `${SELECT} WHERE dataset = ? ORDER BY ms DESC LIMIT 1`,
      dataset,
    );
    return row ? toPoint(row) : null;
  },
  async clearPoints(dataset) {
    const d = await db();
    await d.runAsync('DELETE FROM points WHERE dataset = ?', dataset);
  },
  async getSetting<T>(key: string) {
    const d = await db();
    const row = await d.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      key,
    );
    return row ? (JSON.parse(row.value) as T) : null;
  },
  async setSetting(key, value) {
    const d = await db();
    await d.runAsync(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      key,
      JSON.stringify(value),
    );
  },
  async removeSetting(key) {
    const d = await db();
    await d.runAsync('DELETE FROM settings WHERE key = ?', key);
  },
};

export function getStore(): Store {
  return store;
}
